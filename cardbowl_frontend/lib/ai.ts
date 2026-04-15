import { BusinessCard, UserProfile, PitchResult } from "./storage";
import { getAccessToken, API_BASE } from "./api";
import * as FileSystem from "expo-file-system";

async function postToBackend<T>(
  path: string,
  body: unknown
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${path}`;
  console.log("[AI] POST:", url);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    throw new Error(
      `Cannot reach server at ${API_BASE}. ` +
      `Make sure your backend is running. (${err?.message})`
    );
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (json as any)?.message || (json as any)?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  if (json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }
  return json as T;
}

export async function ocrCard(imageUri: string): Promise<Partial<BusinessCard>> {
  const base64 = await new FileSystem.File(imageUri).base64();

  const ext = imageUri.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";

  return postToBackend<Partial<BusinessCard>>("/business-cards/ocr", {
    imageData: base64,
    mimeType,
  });
}

export async function generatePitchToThem(
  card: BusinessCard,
  userProfile: UserProfile
): Promise<PitchResult> {
  return postToBackend<PitchResult>("/business-cards/pitch/to-them", {
    card,
    userProfile,
  });
}

export async function generatePitchFromThem(
  card: BusinessCard,
  userProfile: UserProfile
): Promise<PitchResult> {
  return postToBackend<PitchResult>("/business-cards/pitch/from-them", {
    card,
    userProfile,
  });
}

export async function enrichCardMetadata(
  card: Partial<BusinessCard>
): Promise<Partial<BusinessCard>> {
  return postToBackend<Partial<BusinessCard>>("/business-cards/enrich", {
    name: card.name,
    company: card.company,
    title: card.title,
    website: card.website,
    email: card.email,
  });
}
