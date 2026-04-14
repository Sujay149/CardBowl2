import { apiGet, apiPost, apiPut, getAccessToken } from "./api";
import {
  BusinessCard,
  UserProfile,
  PitchResult,
  VoiceNote,
  getAllCards,
  saveCard,
  getUserProfile,
  saveUserProfile,
} from "./storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---- Backend DTO shapes (match Java DTOs) ----

interface BackendCardDTO {
  uniqueKey?: string;
  userKey?: string;
  name?: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  imageFrontUrl?: string;
  imageBackUrl?: string;
  category?: string;
  orgDescription?: string;
  orgLocation?: string;
  webContext?: string;
  notes?: string;
  scanLatitude?: string;
  scanLongitude?: string;
  scanAddress?: string;
  savedDate?: string;
  isConnectedCard?: boolean;
  connectedUserKey?: string;
  keywords?: string[];
  decisionMakers?: string[];
  voiceNotes?: BackendVoiceNoteDTO[];
  pitchToThem?: BackendPitchDTO;
  pitchFromThem?: BackendPitchDTO;
}

interface BackendVoiceNoteDTO {
  uniqueKey?: string;
  fileUrl?: string;
  durationSeconds?: number;
  label?: string;
  createdDate?: string;
}

interface BackendPitchDTO {
  uniqueKey?: string;
  pitchType?: string;
  text?: string;
  briefExplanation?: string;
  grade?: number;
  gradeLabel?: string;
  reasoning?: string;
  webInfo?: string;
  webSources?: { title: string; url: string }[];
  generatedAt?: string;
  source?: string;
}

interface BackendProfileDTO {
  uniqueKey?: string;
  userKey?: string;
  name?: string;
  title?: string;
  company?: string;
  companyLogoUrl?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  address?: string;
  bio?: string;
  products?: string;
  services?: string;
  keywords?: string[];
  cardImageFrontUrl?: string;
  cardImageBackUrl?: string;
}

interface BackendCardViewDTO {
  id?: number;
  cardKey?: string;
  name?: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  category?: string;
  orgLocation?: string;
  scanAddress?: string;
  savedDate?: string;
  isConnectedCard?: boolean;
  isActive?: boolean;
  userId?: number;
  userKey?: string;
  ownerName?: string;
  createdOn?: string;
  searchText?: string;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ---- Mappers: Backend DTO <-> Local storage ----

function backendPitchToLocal(dto: BackendPitchDTO | undefined): PitchResult | undefined {
  if (!dto || !dto.text) return undefined;
  return {
    text: dto.text,
    briefExplanation: dto.briefExplanation,
    grade: dto.grade ?? 0,
    gradeLabel: dto.gradeLabel ?? "",
    reasoning: dto.reasoning ?? "",
    webInfo: dto.webInfo,
    webSources: dto.webSources,
    generatedAt: dto.generatedAt ?? new Date().toISOString(),
    source: dto.source,
  };
}

function backendVoiceNoteToLocal(dto: BackendVoiceNoteDTO): VoiceNote {
  return {
    id: dto.uniqueKey ?? Date.now().toString(),
    uri: dto.fileUrl ?? "",
    duration: dto.durationSeconds ?? 0,
    label: dto.label,
    createdAt: dto.createdDate ?? new Date().toISOString(),
  };
}

function backendCardToLocal(dto: BackendCardDTO): BusinessCard {
  const now = new Date().toISOString();
  return {
    id: dto.uniqueKey ?? Date.now().toString(),
    name: dto.name ?? "",
    title: dto.title ?? "",
    company: dto.company ?? "",
    email: dto.email ?? "",
    phone: dto.phone ?? "",
    website: dto.website ?? "",
    address: dto.address ?? "",
    linkedin: dto.linkedin,
    twitter: dto.twitter,
    instagram: dto.instagram,
    facebook: dto.facebook,
    imageFront: dto.imageFrontUrl,
    imageBack: dto.imageBackUrl,
    category: dto.category,
    orgDescription: dto.orgDescription,
    orgLocation: dto.orgLocation,
    webContext: dto.webContext,
    notes: dto.notes,
    decisionMakers: dto.decisionMakers,
    keywords: dto.keywords ?? [],
    voiceNotes: (dto.voiceNotes ?? []).map(backendVoiceNoteToLocal),
    location: dto.scanLatitude
      ? {
          latitude: parseFloat(dto.scanLatitude) || 0,
          longitude: parseFloat(dto.scanLongitude ?? "0") || 0,
          address: dto.scanAddress ?? "",
        }
      : undefined,
    pitchToThem: backendPitchToLocal(dto.pitchToThem),
    pitchFromThem: backendPitchToLocal(dto.pitchFromThem),
    createdAt: now,
    updatedAt: now,
    savedAt: dto.savedDate ?? now,
  };
}

function localCardToBackend(card: BusinessCard): BackendCardDTO {
  return {
    uniqueKey: isBackendKey(card.id) ? card.id : undefined,
    name: card.name,
    title: card.title,
    company: card.company,
    email: card.email,
    phone: card.phone,
    website: card.website,
    address: card.address,
    linkedin: card.linkedin,
    twitter: card.twitter,
    instagram: card.instagram,
    facebook: card.facebook,
    imageFrontUrl: card.imageFront,
    imageBackUrl: card.imageBack,
    category: card.category,
    orgDescription: card.orgDescription,
    orgLocation: card.orgLocation,
    webContext: card.webContext,
    notes: card.notes,
    scanLatitude: card.location?.latitude?.toString(),
    scanLongitude: card.location?.longitude?.toString(),
    scanAddress: card.location?.address,
    keywords: card.keywords,
    decisionMakers: card.decisionMakers,
  };
}

function backendProfileToLocal(dto: BackendProfileDTO): UserProfile {
  const now = new Date().toISOString();
  return {
    id: dto.uniqueKey ?? Date.now().toString(),
    name: dto.name ?? "",
    title: dto.title ?? "",
    company: dto.company ?? "",
    companyLogo: dto.companyLogoUrl,
    email: dto.email ?? "",
    phone: dto.phone ?? "",
    website: dto.website ?? "",
    linkedin: dto.linkedin ?? "",
    twitter: dto.twitter ?? "",
    address: dto.address ?? "",
    bio: dto.bio ?? "",
    products: dto.products ?? "",
    services: dto.services ?? "",
    keywords: dto.keywords ?? [],
    cardImageFront: dto.cardImageFrontUrl,
    cardImageBack: dto.cardImageBackUrl,
    createdAt: now,
    updatedAt: now,
  };
}

function isBackendKey(id: string | undefined): boolean {
  return !!id && id.length === 15 && !id.startsWith("connected:");
}

function localProfileToBackend(profile: UserProfile): BackendProfileDTO {
  return {
    // Only send uniqueKey if it's a real backend key (15 chars)
    uniqueKey: isBackendKey(profile.id) ? profile.id : undefined,
    name: profile.name,
    title: profile.title,
    company: profile.company,
    companyLogoUrl: profile.companyLogo,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    linkedin: profile.linkedin,
    twitter: profile.twitter,
    address: profile.address,
    bio: profile.bio,
    products: profile.products,
    services: profile.services,
    keywords: profile.keywords,
    cardImageFrontUrl: profile.cardImageFront,
    cardImageBackUrl: profile.cardImageBack,
  };
}

// ---- Sync functions ----

export async function isOnline(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}

/**
 * Pull all cards from backend and merge into local storage.
 * Backend is source of truth for cards that have a uniqueKey.
 */
export async function syncCardsFromBackend(): Promise<BusinessCard[]> {
  try {
    const page = await apiGet<PageResponse<BackendCardViewDTO>>(
      "/business-cards?isActive__eq=true&size=500"
    );

    const detailedCards: BusinessCard[] = [];

    for (const view of page.content) {
      if (!view.cardKey) continue;
      try {
        const detail = await apiGet<BackendCardDTO>(
          `/business-cards/${view.cardKey}`
        );
        detailedCards.push(backendCardToLocal(detail));
      } catch {
        // If detail fetch fails, create minimal card from view
        detailedCards.push({
          id: view.cardKey,
          name: view.name ?? "",
          title: view.title ?? "",
          company: view.company ?? "",
          email: view.email ?? "",
          phone: view.phone ?? "",
          website: view.website ?? "",
          address: "",
          category: view.category,
          orgLocation: view.orgLocation,
          keywords: [],
          voiceNotes: [],
          createdAt: view.createdOn ?? new Date().toISOString(),
          updatedAt: view.createdOn ?? new Date().toISOString(),
          savedAt: view.savedDate ?? new Date().toISOString(),
        });
      }
    }

    return detailedCards;
  } catch (err) {
    console.warn("syncCardsFromBackend failed:", err);
    return [];
  }
}

/**
 * Push a local card to the backend (create or update).
 */
export async function pushCardToBackend(
  card: BusinessCard
): Promise<BusinessCard> {
  const dto = localCardToBackend(card);

  try {
    let result: BackendCardDTO;

    // If the card has a backend uniqueKey, update it; otherwise create
    if (dto.uniqueKey) {
      result = await apiPut<BackendCardDTO>("/business-cards", dto);
    } else {
      result = await apiPost<BackendCardDTO>("/business-cards", dto);
    }

    const synced = backendCardToLocal(result);
    // Preserve local voice notes and pitches that may not have synced yet
    synced.voiceNotes = card.voiceNotes;
    synced.pitchToThem = result.pitchToThem
      ? backendPitchToLocal(result.pitchToThem)
      : card.pitchToThem;
    synced.pitchFromThem = result.pitchFromThem
      ? backendPitchToLocal(result.pitchFromThem)
      : card.pitchFromThem;

    return synced;
  } catch (err) {
    console.warn("pushCardToBackend failed:", err);
    return card;
  }
}

/**
 * Pull profile from backend.
 */
export async function syncProfileFromBackend(): Promise<UserProfile | null> {
  try {
    const dto = await apiGet<BackendProfileDTO>("/user-profiles/me");
    if (!dto || !dto.uniqueKey) return null;
    return backendProfileToLocal(dto);
  } catch {
    return null;
  }
}

/**
 * Push local profile to backend.
 */
export async function pushProfileToBackend(
  profile: UserProfile
): Promise<UserProfile> {
  const dto = localProfileToBackend(profile);

  try {
    const result = await apiPut<BackendProfileDTO>("/user-profiles", dto);
    return backendProfileToLocal(result);
  } catch (err) {
    console.warn("pushProfileToBackend failed:", err);
    return profile;
  }
}

/**
 * Full sync: pull from backend, then push any local-only data.
 */
export async function fullSync(): Promise<{
  cards: BusinessCard[];
  profile: UserProfile | null;
}> {
  const online = await isOnline();
  if (!online) {
    const cards = await getAllCards();
    const profile = await getUserProfile();
    return { cards, profile };
  }

  // Sync profile
  let profile = await syncProfileFromBackend();
  if (!profile) {
    // If no backend profile, push local profile
    const localProfile = await getUserProfile();
    if (localProfile) {
      profile = await pushProfileToBackend(localProfile);
      await saveUserProfile(profile);
    }
  } else {
    await saveUserProfile(profile);
  }

  // Sync cards
  const backendCards = await syncCardsFromBackend();

  // Get local-only cards (those without a 15-char uniqueKey)
  const localCards = await getAllCards();
  const localOnlyCards = localCards.filter(
    (lc) =>
      lc.id.length !== 15 &&
      !backendCards.some((bc) => bc.name === lc.name && bc.email === lc.email)
  );

  // Push local-only cards to backend
  const pushedCards: BusinessCard[] = [];
  for (const card of localOnlyCards) {
    const synced = await pushCardToBackend(card);
    pushedCards.push(synced);
  }

  const allCards = [...backendCards, ...pushedCards];

  // Save all to local storage
  await AsyncStorage.setItem(
    "cardbowl_cards",
    JSON.stringify(allCards)
  );

  return { cards: allCards, profile };
}
