import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

// ─── Constants ──────────────────────────────────────────────

const AUTH_KEYS = {
  ACCESS_TOKEN: "cardbowl_access_token",
  REFRESH_TOKEN: "cardbowl_refresh_token",
  USER: "cardbowl_user",
};

// ─── Types ──────────────────────────────────────────────────

export interface AuthUser {
  uniqueKey: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── API Base Resolution ────────────────────────────────────

function getExpoDevHost(): string {
  try {
    const c = Constants as any;
    const candidates: string[] = [
      c.expoConfig?.hostUri,
      c.manifest?.debuggerHost,
      c.manifest?.hostUri,
      c.manifest2?.extra?.expoGo?.debuggerHost,
      c.manifest2?.extra?.expoClient?.hostUri,
    ];
    for (const raw of candidates) {
      if (typeof raw === "string" && raw.includes(":")) {
        const host = raw.split(":")[0]?.trim();
        if (host && host !== "127.0.0.1" && host !== "localhost") {
          return host;
        }
      }
    }
  } catch {}
  return "";
}

function resolveApiBase(): string {
  const BACKEND_PORT = "8080";
  const devHost = getExpoDevHost();

  // 1. Explicit env var
  const explicit =
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ||
    process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) {
    let base = explicit.replace(/\/+$/, "").replace(/\/api$/i, "");
    // On native device, rewrite localhost to LAN IP
    if (Platform.OS !== "web" && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(base) && devHost) {
      base = base.replace(/(localhost|127\.0\.0\.1)/, devHost);
    }
    console.log("[API] Base from env:", base);
    return base;
  }

  // 2. Auto-detect from Expo dev host
  if (Platform.OS !== "web" && devHost) {
    const base = `http://${devHost}:${BACKEND_PORT}`;
    console.log("[API] Base auto-detected:", base);
    return base;
  }

  // 3. Fallback
  const fallback = Platform.OS === "web"
    ? "http://localhost:8080"
    : `http://${devHost || "10.50.67.68"}:${BACKEND_PORT}`;
  console.log("[API] Base fallback:", fallback);
  return fallback;
}

const API_BASE = resolveApiBase();

// ─── Token Storage ──────────────────────────────────────────

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_KEYS.REFRESH_TOKEN);
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await AsyncStorage.multiSet([
    [AUTH_KEYS.ACCESS_TOKEN, tokens.token],
    [AUTH_KEYS.REFRESH_TOKEN, tokens.refreshToken],
  ]);
}

export async function saveUser(user: AuthUser): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEYS.USER, JSON.stringify(user));
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEYS.USER);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([
    AUTH_KEYS.ACCESS_TOKEN,
    AUTH_KEYS.REFRESH_TOKEN,
    AUTH_KEYS.USER,
    "cardbowl_user_profile",
    "cardbowl_cards",
    "cardbowl_connections",
    "cardbowl_offline_queue",
  ]);
}

// ─── Token Refresh ──────────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null;

async function doRefreshToken(): Promise<string | null> {
  const currentRefresh = await getRefreshToken();
  if (!currentRefresh) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentRefresh }),
    });

    if (!res.ok) {
      await clearAuth();
      return null;
    }

    const json: ApiResponse<any> = await res.json();
    const data = json.data;

    await saveTokens({ token: data.token, refreshToken: data.refreshToken });
    await saveUser({
      uniqueKey: data.uniqueKey,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    return data.token;
  } catch {
    await clearAuth();
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefreshToken().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// ─── Retry with Exponential Backoff ─────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class NetworkError extends Error {
  constructor(message: string, public readonly url: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class ServerError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ServerError";
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
): Promise<Response> {
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);

      // Don't retry client errors (4xx) — they won't change
      if (res.status >= 400 && res.status < 500) return res;

      // Retry on 5xx server errors
      if (res.status >= 500 && attempt < maxRetries) {
        console.log(`[API] Server error ${res.status}, retry ${attempt + 1}/${maxRetries}`);
        await sleep(Math.min(1000 * 2 ** attempt, 8000));
        continue;
      }

      return res;
    } catch (err: any) {
      lastErr = err;
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * 2 ** attempt, 8000);
        console.log(`[API] Network error, retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  throw new NetworkError(
    `Cannot reach server at ${API_BASE}. ` +
    `Ensure backend is running and phone is on the same Wi-Fi. ` +
    `(${lastErr?.message ?? "Network request failed"})`,
    url,
  );
}

// ─── Authenticated Fetch ────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${API_BASE}${path}`;
  let res = await fetchWithRetry(url, { ...options, headers });

  // Token expired → refresh once and retry
  if ((res.status === 401 || res.status === 403) && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetchWithRetry(url, { ...options, headers }, 0);
    }
  }

  if (res.status === 401 || res.status === 403) {
    await clearAuth();
    throw new ServerError("Session expired. Please sign in again.", res.status);
  }

  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    message: "Invalid response from server",
    data: null as any,
  }));

  if (!res.ok || !json.success) {
    throw new ServerError(json.message || `Request failed (${res.status})`, res.status);
  }

  return json.data;
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "GET" });
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined });
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  let token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${API_BASE}${path}`;
  let res = await fetchWithRetry(url, { method: "POST", headers, body: formData });

  if ((res.status === 401 || res.status === 403) && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetchWithRetry(url, { method: "POST", headers, body: formData }, 0);
    }
  }

  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    message: "Invalid response from server",
    data: null as any,
  }));

  if (!res.ok || !json.success) {
    throw new ServerError(json.message || `Upload failed (${res.status})`, res.status);
  }

  return json.data;
}

// ─── Public (no-auth) Fetch ─────────────────────────────────

export async function apiPublicPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;
  console.log("[API] POST (public):", url);

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    message: "Invalid response from server",
    data: null as any,
  }));

  if (!res.ok || !json.success) {
    throw new ServerError(json.message || `Request failed (${res.status})`, res.status);
  }

  return json.data;
}

export { API_BASE, AUTH_KEYS };
