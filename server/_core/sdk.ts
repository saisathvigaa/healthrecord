/**
 * Self-contained auth SDK — no Manus dependencies.
 * Uses jose for JWT (already in package.json) and Node crypto for password hashing.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import { ForbiddenError } from "../../shared/_core/errors.js";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// ─── Password hashing (Node built-in crypto, no extra deps) ─────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [hashedPwd, salt] = stored.split(".");
  if (!hashedPwd || !salt) return false;
  const hashedBuf = Buffer.from(hashedPwd, "hex");
  const suppliedBuf = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// ─── JWT session tokens ──────────────────────────────────────────────────────

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

export type AuthenticatedUser = User;

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.length > 0;

class SDKServer {
  private getSecret() {
    const secret = ENV.cookieSecret;
    if (!secret) throw new Error("JWT_SECRET env var is not set");
    return new TextEncoder().encode(secret);
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {},
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

    return new SignJWT({
      openId,
      appId: ENV.appId || "healthtrack",
      name: options.name || "",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(this.getSecret());
  }

  async verifySession(
    token: string | undefined | null,
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, this.getSecret(), { algorithms: ["HS256"] });
      const { openId, appId, name } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId)) return null;
      return { openId, appId, name: isNonEmptyString(name) ? name : "" };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    // Accept Bearer token (mobile) or session cookie (web)
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionToken = token || cookies.get(COOKIE_NAME);

    const session = await this.verifySession(sessionToken);
    if (!session) throw ForbiddenError("Invalid or missing session token");

    const user = await db.getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("User not found");

    // Update lastSignedIn in background (don't await)
    db.upsertUser({ openId: user.openId, lastSignedIn: new Date() }).catch(() => {});

    return user;
  }
}

export const sdk = new SDKServer();
