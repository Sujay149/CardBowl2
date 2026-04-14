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
      id: profile.id,
      name: profile.name,
      title: profile.title,
      company: profile.company,
      email: profile.email,
      phone: profile.phone,
      website: profile.website,
      address: profile.address,
      linkedin: profile.linkedin,
      twitter: profile.twitter,
      keywords: profile.keywords || [],
    },
  };

  return JSON.stringify(payload);
}

export function parseProfileQrPayload(raw: string): CardBowlConnectPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.type === "cardbowl-connect" &&
      parsed.version === 1 &&
      parsed.user &&
      typeof parsed.user.id === "string"
    ) {
      return parsed as CardBowlConnectPayload;
    }
    return null;
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
