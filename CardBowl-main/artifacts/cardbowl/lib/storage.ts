import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  twitter: string;
  address: string;
  bio: string;
  products: string;
  services: string;
  keywords: string[];
  cardImageFront?: string;
  cardImageBack?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessCard {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  imageFront?: string;
  imageBack?: string;
  voiceNotes: VoiceNote[];
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  orgLocation?: string;
  webContext?: string;
  keywords: string[];
  category?: string;
  orgDescription?: string;
  decisionMakers?: string[];
  socialHandles?: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  pitchToThem?: PitchResult;
  pitchFromThem?: PitchResult;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  savedAt: string;
}

export interface VoiceNote {
  id: string;
  uri: string;
  duration: number;
  label?: string;
  createdAt: string;
}

export interface PitchResult {
  text: string;
  briefExplanation?: string;
  grade: number;
  gradeLabel: string;
  reasoning: string;
  webInfo?: string;
  webSources?: { title: string; url: string }[];
  generatedAt: string;
  source?: string;
}

export interface UserConnection {
  id: string;
  myUserId: string;
  peerUserId: string;
  peerName?: string;
  connectedAt: string;
  updatedAt: string;
}

const KEYS = {
  USER_PROFILE: "cardbowl_user_profile",
  CARDS: "cardbowl_cards",
  CONNECTIONS: "cardbowl_connections",
};

export async function getUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
}

export async function getAllCards(): Promise<BusinessCard[]> {
  const raw = await AsyncStorage.getItem(KEYS.CARDS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveCard(card: BusinessCard): Promise<void> {
  const cards = await getAllCards();
  const idx = cards.findIndex((c) => c.id === card.id);
  if (idx >= 0) {
    cards[idx] = card;
  } else {
    cards.unshift(card);
  }
  await AsyncStorage.setItem(KEYS.CARDS, JSON.stringify(cards));
}

export async function deleteCard(id: string): Promise<void> {
  const cards = await getAllCards();
  const filtered = cards.filter((c) => c.id !== id);
  await AsyncStorage.setItem(KEYS.CARDS, JSON.stringify(filtered));
}

export async function getCard(id: string): Promise<BusinessCard | null> {
  const cards = await getAllCards();
  return cards.find((c) => c.id === id) || null;
}

export async function getAllConnections(): Promise<UserConnection[]> {
  const raw = await AsyncStorage.getItem(KEYS.CONNECTIONS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveConnection(connection: UserConnection): Promise<void> {
  const existing = await getAllConnections();
  const idx = existing.findIndex(
    (c) =>
      c.myUserId === connection.myUserId &&
      c.peerUserId === connection.peerUserId
  );

  if (idx >= 0) {
    existing[idx] = {
      ...existing[idx],
      ...connection,
      updatedAt: new Date().toISOString(),
    };
  } else {
    existing.unshift(connection);
  }

  await AsyncStorage.setItem(KEYS.CONNECTIONS, JSON.stringify(existing));
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
