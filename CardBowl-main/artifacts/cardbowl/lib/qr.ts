import { BusinessCard, UserProfile } from "@/lib/storage";

interface CardBowlQrUser {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  linkedin: string;
  twitter: string;
  keywords: string[];
}

function cleanText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function cleanKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((k) => cleanText(k, 24))
    .filter(Boolean)
    .slice(0, 8);
  return [...new Set(normalized)];
}

export interface CardBowlConnectPayload {
  type: "cardbowl-connect";
  version: 1;
  generatedAt: string;
  user: CardBowlQrUser;
}

export function createProfileQrPayload(profile: UserProfile): string {
  const payload: CardBowlConnectPayload = {
    type: "cardbowl-connect",
    version: 1,
    generatedAt: new Date().toISOString(),
    user: {
      id: cleanText(profile.id, 64),
      name: cleanText(profile.name, 64),
      title: cleanText(profile.title, 48),
      company: cleanText(profile.company, 64),
      email: cleanText(profile.email, 80),
      phone: cleanText(profile.phone, 32),
      website: cleanText(profile.website, 96),
      address: cleanText(profile.address, 96),
      linkedin: cleanText(profile.linkedin, 96),
      twitter: cleanText(profile.twitter, 64),
      keywords: cleanKeywords(profile.keywords),
    },
  };

  return JSON.stringify(payload);
}

export function parseProfileQrPayload(raw: string): CardBowlConnectPayload | null {
  if (!raw || typeof raw !== "string") return null;

  const candidates: string[] = [];
  const trimmed = raw.trim();
  candidates.push(trimmed);

  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded !== trimmed) {
      candidates.push(decoded);
    }
  } catch {
    // Ignore decode issues and keep original text.
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed &&
        parsed.type === "cardbowl-connect" &&
        parsed.version === 1 &&
        parsed.user &&
        typeof parsed.user.id === "string"
      ) {
        return parsed as CardBowlConnectPayload;
      }
    } catch {
      // Continue trying candidate variants.
    }
  }

  try {
    const parsed = JSON.parse(trimmed.replace(/\u0000/g, ""));
    return parsed?.type === "cardbowl-connect" && parsed?.version === 1 && typeof parsed?.user?.id === "string"
      ? (parsed as CardBowlConnectPayload)
      : null;
  } catch {
    return null;
  }
}

export function profilePayloadToBusinessCard(
  payload: CardBowlConnectPayload
): BusinessCard {
  const now = new Date().toISOString();
  return {
    id: `connected:${payload.user.id}`,
    name: payload.user.name,
    title: payload.user.title,
    company: payload.user.company,
    email: payload.user.email,
    phone: payload.user.phone,
    website: payload.user.website,
    address: payload.user.address,
    linkedin: payload.user.linkedin,
    twitter: payload.user.twitter,
    keywords: payload.user.keywords || [],
    voiceNotes: [],
    notes: "Connected via CardBowl QR",
    createdAt: now,
    updatedAt: now,
    savedAt: now,
  };
}
