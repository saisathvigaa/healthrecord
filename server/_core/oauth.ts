/**
 * Auth routes — email/password + Google OAuth.
 * Replaces the old Manus OAuth routes entirely.
 */
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import { sdk, hashPassword, verifyPassword } from "./sdk";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import * as db from "../db";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUserResponse(user: Awaited<ReturnType<typeof db.getUserByOpenId>>) {
  if (!user) return null;
  return {
    id: user.id,
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn.toISOString(),
  };
}

async function issueToken(
  res: Response,
  req: Request,
  user: NonNullable<Awaited<ReturnType<typeof db.getUserByOpenId>>>,
): Promise<string> {
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name || "",
    expiresInMs: ONE_YEAR_MS,
  });
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  return sessionToken;
}

// ─── Google token verification ────────────────────────────────────────────────

async function verifyGoogleIdToken(idToken: string): Promise<{
  sub: string;
  email: string | null;
  name: string | null;
} | null> {
  try {
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as any;
    // Validate audience matches our client ID (if configured)
    if (ENV.googleClientId && data.aud !== ENV.googleClientId) {
      console.error("[Google] Token audience mismatch", data.aud, ENV.googleClientId);
      return null;
    }
    return {
      sub: data.sub,
      email: data.email ?? null,
      name: data.name ?? null,
    };
  } catch (err) {
    console.error("[Google] Token verification failed", err);
    return null;
  }
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerOAuthRoutes(app: Express) {
  // ── Register with email + password ──────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, name } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    if (typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "password must be at least 6 characters" });
      return;
    }

    const openId = `email:${email.toLowerCase()}`;

    try {
      const existing = await db.getUserByOpenId(openId);
      if (existing) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }

      const passwordHash = await hashPassword(password);
      await db.upsertUser({
        openId,
        email: email.toLowerCase(),
        name: name ?? email.split("@")[0],
        passwordHash,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      const user = await db.getUserByOpenId(openId);
      if (!user) throw new Error("Failed to create user");

      const sessionToken = await issueToken(res, req, user);
      res.json({ sessionToken, user: buildUserResponse(user) });
    } catch (err) {
      console.error("[Auth] Register failed", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // ── Login with email + password ──────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const openId = `email:${email.toLowerCase()}`;

    try {
      const user = await db.getUserByOpenId(openId);
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const sessionToken = await issueToken(res, req, user);
      res.json({ sessionToken, user: buildUserResponse(user) });
    } catch (err) {
      console.error("[Auth] Login failed", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // ── Google Sign-In — verify id_token from client ─────────────────────────────
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    const { idToken } = req.body ?? {};
    if (!idToken) {
      res.status(400).json({ error: "idToken is required" });
      return;
    }

    try {
      const googleUser = await verifyGoogleIdToken(idToken);
      if (!googleUser) {
        res.status(401).json({ error: "Invalid Google token" });
        return;
      }

      const openId = `google:${googleUser.sub}`;

      await db.upsertUser({
        openId,
        email: googleUser.email,
        name: googleUser.name,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const user = await db.getUserByOpenId(openId);
      if (!user) throw new Error("Failed to create user");

      const sessionToken = await issueToken(res, req, user);
      res.json({ sessionToken, user: buildUserResponse(user) });
    } catch (err) {
      console.error("[Auth] Google login failed", err);
      res.status(500).json({ error: "Google login failed" });
    }
  });

  // ── Get current user ──────────────────────────────────────────────────────────
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  // ── Logout ────────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  // ── Establish session cookie from Bearer token (kept for compatibility) ────────
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const authHeader = req.headers.authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice(7).trim();
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
