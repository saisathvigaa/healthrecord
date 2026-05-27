/**
 * Auth helpers — email/password + Google OAuth via expo-auth-session.
 * No Manus dependencies.
 */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "healthtrack_user_info";

export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  // On web, derive from hostname (Metro on 8081 → API on 3000)
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) return `${protocol}//${apiHostname}`;
  }

  return "";
}

// ─── Token storage ────────────────────────────────────────────────────────────

export async function saveSessionToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  }
}

export async function getSessionToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

export async function removeSessionToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function authFetch(path: string, options: RequestInit = {}): Promise<any> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;
  const token = await getSessionToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token && Platform.OS !== "web") {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers, credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export async function registerWithEmail(email: string, password: string, name?: string) {
  return authFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function loginWithEmail(email: string, password: string) {
  return authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function loginWithGoogle(idToken: string) {
  return authFetch("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export async function getMe() {
  return authFetch("/api/auth/me");
}

export async function logoutApi() {
  return authFetch("/api/auth/logout", { method: "POST" });
}
