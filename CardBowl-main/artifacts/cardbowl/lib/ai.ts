import { BusinessCard, UserProfile, PitchResult } from "./storage";
import * as FileSystem from "expo-file-system";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export async function ocrCard(imageUri: string): Promise<Partial<BusinessCard>> {
  const base64 = await new FileSystem.File(imageUri).base64();

  const ext = imageUri.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";

  const response = await fetch(`${API_BASE}/cards/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).error || "OCR failed");
  }
  return response.json();
}

export async function generatePitchToThem(
  card: BusinessCard,
  userProfile: UserProfile
): Promise<PitchResult> {
  const response = await fetch(`${API_BASE}/pitch/to-them`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card, userProfile }),
  });
  if (!response.ok) throw new Error("Failed to generate pitch");
  return response.json();
}

export async function generatePitchFromThem(
  card: BusinessCard,
  userProfile: UserProfile
): Promise<PitchResult> {
  const response = await fetch(`${API_BASE}/pitch/from-them`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card, userProfile }),
  });
  if (!response.ok) throw new Error("Failed to generate pitch");
  return response.json();
}

export async function enrichCardMetadata(
  card: Partial<BusinessCard>
): Promise<Partial<BusinessCard>> {
  const response = await fetch(`${API_BASE}/cards/enrich`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card }),
  });
  if (!response.ok) throw new Error("Failed to enrich card");
  return response.json();
}
