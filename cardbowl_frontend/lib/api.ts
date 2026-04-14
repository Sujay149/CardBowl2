import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const AUTH_KEYS = {
  ACCESS_TOKEN: "cardbowl_access_token",
  REFRESH_TOKEN: "cardbowl_refresh_token",
  USER: "cardbowl_user",
};

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

function normalizeForPlatform(base: string): string {
  try {
    const parsed = new URL(base);

    // 10.0.2.2 is Android emulator-only; browser builds must call localhost instead.
    if (Platform.OS === "web" && parsed.hostname === "10.0.2.2") {
      parsed.hostname = "localhost";
      return parsed.toString().replace(/\/$/, "");
    }

    // Android emulator cannot reach host localhost directly.
    if (
      Platform.OS === "android" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      parsed.hostname = "10.0.2.2";
      return parsed.toString().replace(/\/$/, "");
    }

    return base;
  } catch {
    return base;
  }
}

function resolveApiBase(): string {
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicit) {
    const noSlash = explicit.replace(/\/$/, "");
    const withoutApiSuffix = noSlash.replace(/\/api$/i, "");
    const base = normalizeForPlatform(withoutApiSuffix);
    console.log("[API] Using EXPO_PUBLIC_API_BASE_URL:", base);
    return base;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (!domain) {
    const fallback = normalizeForPlatform("http://localhost:8080");
    console.log("[API] No env vars set, defaulting to", fallback);
    return fallback;
  }

  const hasProtocol = /^https?:\/\//i.test(domain);
  const protocol = /(localhost|127\.0\.0\.1|10\.0\.2\.2)/.test(domain)
    ? "http"
    : "https";
  const normalized = hasProtocol ? domain : `${protocol}://${domain}`;
  return normalizeForPlatform(normalized.replace(/\/$/, ""));
}

const API_BASE = resolveApiBase();

function getApiBaseCandidates(): string[] {
  const candidates = [API_BASE];
  if (/\/api$/i.test(API_BASE)) {
    candidates.push(API_BASE.replace(/\/api$/i, ""));
  }
  return candidates.filter((value, index, arr) => arr.indexOf(value) === index);
}

async function fetchWithBaseFallback(
  path: string,
  options: RequestInit,
  retryOnStatuses: number[] = [403, 404]
): Promise<Response> {
  const bases = getApiBaseCandidates();
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (let i = 0; i < bases.length; i += 1) {
    const base = bases[i];
    const isLast = i === bases.length - 1;
    try {
      const response = await fetch(`${base}${path}`, options);
      lastResponse = response;

      if (!isLast && retryOnStatuses.includes(response.status)) {
        console.log(`[API] Retrying ${path} with fallback base after ${response.status}`);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (isLast) {
        throw error;
      }
    }
  }

  if (lastResponse) {
    return lastResponse;
  }
  throw lastError ?? new Error("Network error");
}

// --- Token storage ---

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
    // Clear user-specific data so next login gets a fresh sync
    "cardbowl_user_profile",
    "cardbowl_cards",
    "cardbowl_connections",
  ]);
}

// --- Token refresh ---

let refreshPromise: Promise<string | null> | null = null;

async function doRefreshToken(): Promise<string | null> {
  const currentRefresh = await getRefreshToken();
  if (!currentRefresh) return null;

  try {
    const res = await fetchWithBaseFallback("/auth/refresh-token", {
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
    refreshPromise = doRefreshToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// --- Authenticated fetch ---

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetchWithBaseFallback(path, { ...options, headers });

  // Some backend paths return 403 for expired/invalid tokens.
  if ((res.status === 401 || res.status === 403) && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetchWithBaseFallback(path, { ...options, headers });
    }
  }

  if (res.status === 401 || res.status === 403) {
    await clearAuth();
  }

  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    message: "Network error",
    data: null as any,
  }));

  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }

  return json.data;
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "GET" });
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  let token = await getAccessToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetchWithBaseFallback(path, {
    method: "POST",
    headers,
    body: formData,
  });

  if ((res.status === 401 || res.status === 403) && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetchWithBaseFallback(path, {
        method: "POST",
        headers,
        body: formData,
      });
    }
  }

  if (res.status === 401 || res.status === 403) {
    await clearAuth();
  }

  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    message: "Network error",
    data: null as any,
  }));

  if (!res.ok || !json.success) {
    throw new Error(json.message || `Upload failed (${res.status})`);
  }

  return json.data;
}

// --- Public (no-auth) fetch for auth endpoints ---

export async function apiPublicPost<T>(
  path: string,
  body: unknown
): Promise<T> {
  console.log("[API] POST (public):", `${API_BASE}${path}`);
  const res = await fetchWithBaseFallback(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    message: "Network error",
    data: null as any,
  }));

  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }

  return json.data;
}

export { API_BASE, AUTH_KEYS };
