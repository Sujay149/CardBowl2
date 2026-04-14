import { BusinessCard, UserProfile, PitchResult } from "./storage";
import * as FileSystem from "expo-file-system";
import Constants from "expo-constants";

function resolveApiBase(): string {
  const explicitBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicitBase) {
    return explicitBase.replace(/\/$/, "");
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (!domain) {
    throw new Error(
      "API not configured. Set EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_DOMAIN in your .env and restart Expo."
    );
  }

  const hasProtocol = /^https?:\/\//i.test(domain);
  const protocol = /(localhost|127\.0\.0\.1|10\.0\.2\.2)/.test(domain)
    ? "http"
    : "https";
  const normalized = hasProtocol ? domain : `${protocol}://${domain}`;
  return normalized.replace(/\/$/, "");
}

const RAW_API_BASE = resolveApiBase();

function getApiBaseCandidates(): string[] {
  const base = RAW_API_BASE;
  const baseVariants = base.toLowerCase().endsWith("/api")
    ? [base.slice(0, -4)]
    : [base];

  const expoHostUri = Constants.expoConfig?.hostUri || "";
  const expoHost = expoHostUri.split(":")[0]?.trim();
  const match = base.match(/^https?:\/\/([^/:]+)(:\d+)?(\/api)?$/i);
  const protocol = base.startsWith("https://") ? "https" : "http";
  const port = match?.[2] || ":8080";
  const path = "";

  const hostCandidates = [match?.[1], expoHost, "10.0.2.2", "localhost", "127.0.0.1"]
    .filter((h): h is string => !!h && h.length > 0)
    .filter((h, idx, arr) => arr.indexOf(h) === idx);

  const expanded = hostCandidates.map((host) => `${protocol}://${host}${port}${path}`);
  const all = [...baseVariants, ...expanded];
  return all.filter((value, idx, arr) => arr.indexOf(value) === idx);
}

const API_BASE_CANDIDATES = getApiBaseCandidates();

function unwrapApiResponse<T>(json: any): T {
  if (json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }
  return json as T;
}

async function postJsonWithFallback<T>(
  paths: string[],
  body: unknown,
  defaultError: string
): Promise<T> {
  let lastError = defaultError;

  for (const base of API_BASE_CANDIDATES) {
    for (const path of paths) {
      const url = `${base}${path}`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          const msg = (json as any)?.message || (json as any)?.error || `${defaultError} (${response.status})`;
          lastError = msg;
          continue;
        }
        return unwrapApiResponse<T>(json);
      } catch (e: any) {
        lastError = e?.message || defaultError;
      }
    }
  }

  throw new Error(lastError);
}

export async function ocrCard(imageUri: string): Promise<Partial<BusinessCard>> {
  const base64 = await new FileSystem.File(imageUri).base64();

  const ext = imageUri.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";

  return postJsonWithFallback<Partial<BusinessCard>>(
    ["/business-cards/ocr", "/cards/ocr"],
    { imageData: base64, mimeType },
    "OCR failed"
  );
}

export async function generatePitchToThem(
  card: BusinessCard,
  userProfile: UserProfile
): Promise<PitchResult> {
  return postJsonWithFallback<PitchResult>(
    [
      `/business-cards/${card.id}/pitch/to-them`,
      "/pitch/to-them",
    ],
    { card, userProfile },
    "Failed to generate pitch"
  );
}

export async function generatePitchFromThem(
  card: BusinessCard,
  userProfile: UserProfile
): Promise<PitchResult> {
  return postJsonWithFallback<PitchResult>(
    [
      `/business-cards/${card.id}/pitch/from-them`,
      "/pitch/from-them",
    ],
    { card, userProfile },
    "Failed to generate pitch"
  );
}

export async function enrichCardMetadata(
  card: Partial<BusinessCard>
): Promise<Partial<BusinessCard>> {
  return postJsonWithFallback<Partial<BusinessCard>>(
    ["/business-cards/enrich", "/cards/enrich"],
    {
      name: card.name,
      company: card.company,
      title: card.title,
      website: card.website,
      email: card.email,
    },
    "Failed to enrich card"
  );
}
