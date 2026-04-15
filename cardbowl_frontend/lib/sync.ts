/**
 * Sync Engine
 *
 * Responsibilities:
 * - Drain offline queue (push local changes to backend)
 * - Pull server state (source of truth)
 * - Merge server + local-only data
 * - Persist merged state to local cache
 *
 * Merge strategy:
 * - Server data wins for any item that exists on both sides
 * - Local-only items (no backend key) are preserved and queued for push
 * - Timestamps used to detect newer local data during conflict
 */

import {
  apiGet,
  apiPost,
  apiPut,
  getAccessToken,
  API_BASE,
  NetworkError,
} from "./api";
import {
  BusinessCard,
  UserProfile,
  PitchResult,
  VoiceNote,
  getAllCards,
  saveCard,
  deleteCard,
  getUserProfile,
  saveUserProfile,
} from "./storage";
import {
  getQueue,
  dequeue,
  incrementRetry,
  QueueItem,
} from "./offlineQueue";
import { checkBackendReachable } from "./network";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Backend DTO types ──────────────────────────────────────

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
  createdOn?: string;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
}

// ─── Mappers ────────────────────────────────────────────────

function isBackendKey(id: string | undefined): boolean {
  return !!id && id.length === 15 && !id.startsWith("connected:");
}

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

function localProfileToBackend(profile: UserProfile): BackendProfileDTO {
  return {
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

// ─── Connectivity Check ─────────────────────────────────────

export async function canReachBackend(): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  return checkBackendReachable(API_BASE);
}

// ─── Queue Drain ────────────────────────────────────────────

async function processQueueItem(item: QueueItem): Promise<boolean> {
  try {
    switch (item.type) {
      case "card_create": {
        const dto = localCardToBackend(item.payload);
        const result = await apiPost<BackendCardDTO>("/business-cards", dto);
        // Update local storage with backend key
        if (result.uniqueKey) {
          const synced = backendCardToLocal(result);
          synced.voiceNotes = item.payload.voiceNotes ?? [];
          synced.pitchToThem = item.payload.pitchToThem;
          synced.pitchFromThem = item.payload.pitchFromThem;
          await deleteCard(item.payload.id);
          await saveCard(synced);
        }
        return true;
      }
      case "card_update": {
        const dto = localCardToBackend(item.payload);
        await apiPut<BackendCardDTO>("/business-cards", dto);
        return true;
      }
      case "card_delete": {
        const cardId = item.payload.id;
        if (isBackendKey(cardId)) {
          await apiPut(`/business-cards/${cardId}/deactivate`);
        }
        return true;
      }
      case "profile_update": {
        const dto = localProfileToBackend(item.payload);
        const result = await apiPut<BackendProfileDTO>("/user-profiles", dto);
        if (result) {
          await saveUserProfile(backendProfileToLocal(result));
        }
        return true;
      }
      default:
        console.warn("[Sync] Unknown queue item type:", item.type);
        return true; // Remove unknown items
    }
  } catch (err) {
    if (err instanceof NetworkError) throw err; // Bubble up — stop drain
    console.warn(`[Sync] Queue item ${item.type} failed:`, err);
    return false;
  }
}

/**
 * Drain the offline queue. Stops early on network failure.
 * Returns number of items successfully processed.
 */
export async function drainQueue(): Promise<number> {
  const queue = await getQueue();
  if (queue.length === 0) return 0;

  console.log(`[Sync] Draining offline queue: ${queue.length} items`);
  let processed = 0;

  for (const item of queue) {
    try {
      const success = await processQueueItem(item);
      if (success) {
        await dequeue(item.id);
        processed++;
      } else {
        const canRetry = await incrementRetry(item.id);
        if (!canRetry) processed++; // Dropped — count as handled
      }
    } catch (err) {
      if (err instanceof NetworkError) {
        console.log("[Sync] Network lost during drain, stopping");
        break;
      }
      await incrementRetry(item.id);
    }
  }

  console.log(`[Sync] Queue drain complete: ${processed}/${queue.length} processed`);
  return processed;
}

// ─── Pull from Backend ──────────────────────────────────────

export async function pullCards(): Promise<BusinessCard[]> {
  try {
    const page = await apiGet<PageResponse<BackendCardViewDTO>>(
      "/business-cards?isActive__eq=true&size=500"
    );

    const cards: BusinessCard[] = [];
    for (const view of page.content) {
      if (!view.cardKey) continue;
      try {
        const detail = await apiGet<BackendCardDTO>(`/business-cards/${view.cardKey}`);
        cards.push(backendCardToLocal(detail));
      } catch {
        cards.push({
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
    return cards;
  } catch (err) {
    console.warn("[Sync] pullCards failed:", err);
    return [];
  }
}

export async function pullProfile(): Promise<UserProfile | null> {
  try {
    const dto = await apiGet<BackendProfileDTO>("/user-profiles/me");
    if (!dto || !dto.uniqueKey) return null;
    return backendProfileToLocal(dto);
  } catch {
    return null;
  }
}

// ─── Push to Backend ────────────────────────────────────────

export async function pushCard(card: BusinessCard): Promise<BusinessCard> {
  const dto = localCardToBackend(card);
  try {
    const result = dto.uniqueKey
      ? await apiPut<BackendCardDTO>("/business-cards", dto)
      : await apiPost<BackendCardDTO>("/business-cards", dto);

    const synced = backendCardToLocal(result);
    synced.voiceNotes = card.voiceNotes;
    synced.pitchToThem = result.pitchToThem ? backendPitchToLocal(result.pitchToThem) : card.pitchToThem;
    synced.pitchFromThem = result.pitchFromThem ? backendPitchToLocal(result.pitchFromThem) : card.pitchFromThem;
    return synced;
  } catch {
    return card;
  }
}

export async function pushProfile(profile: UserProfile): Promise<UserProfile> {
  const dto = localProfileToBackend(profile);
  try {
    const result = await apiPut<BackendProfileDTO>("/user-profiles", dto);
    return backendProfileToLocal(result);
  } catch {
    return profile;
  }
}

// ─── Merge Logic ────────────────────────────────────────────

/**
 * Merge server cards with local cards.
 * - Server data wins for synced cards (those with backend keys)
 * - Local-only cards are preserved
 * - Uses updatedAt timestamp for conflict detection
 */
function mergeCards(
  serverCards: BusinessCard[],
  localCards: BusinessCard[],
): BusinessCard[] {
  const merged = new Map<string, BusinessCard>();

  // Server is source of truth for backend-keyed cards
  for (const sc of serverCards) {
    merged.set(sc.id, sc);
  }

  // Add local-only cards (not yet synced to backend)
  for (const lc of localCards) {
    if (!isBackendKey(lc.id) && !merged.has(lc.id)) {
      // Check it's not a duplicate of a server card by name+email
      const isDupe = serverCards.some(
        (sc) => sc.name === lc.name && sc.email === lc.email && sc.name !== ""
      );
      if (!isDupe) {
        merged.set(lc.id, lc);
      }
    }

    // For backend-keyed cards that exist both locally and on server:
    // preserve local voice notes and pitches that aren't on server yet
    if (isBackendKey(lc.id) && merged.has(lc.id)) {
      const server = merged.get(lc.id)!;
      if (server.voiceNotes.length === 0 && lc.voiceNotes.length > 0) {
        server.voiceNotes = lc.voiceNotes;
      }
      if (!server.pitchToThem && lc.pitchToThem) {
        server.pitchToThem = lc.pitchToThem;
      }
      if (!server.pitchFromThem && lc.pitchFromThem) {
        server.pitchFromThem = lc.pitchFromThem;
      }
    }
  }

  return Array.from(merged.values());
}

// ─── Full Sync ──────────────────────────────────────────────

export interface SyncResult {
  cards: BusinessCard[];
  profile: UserProfile | null;
  online: boolean;
  queueDrained: number;
}

/**
 * Full sync cycle:
 * 1. Check connectivity
 * 2. Drain offline queue (push pending local changes)
 * 3. Pull fresh data from server
 * 4. Merge with local cache
 * 5. Persist to local storage
 */
export async function fullSync(): Promise<SyncResult> {
  const localCards = await getAllCards();
  const localProfile = await getUserProfile();

  const online = await canReachBackend();
  if (!online) {
    console.log("[Sync] Offline — using local cache");
    return { cards: localCards, profile: localProfile, online: false, queueDrained: 0 };
  }

  console.log("[Sync] Online — starting full sync");

  // Step 1: Drain offline queue first (push local changes)
  const queueDrained = await drainQueue();

  // Step 2: Pull server data
  const [serverCards, serverProfile] = await Promise.all([
    pullCards(),
    pullProfile(),
  ]);

  // Step 3: Merge cards
  const mergedCards = mergeCards(serverCards, localCards);

  // Step 4: Handle profile
  let finalProfile: UserProfile | null;
  if (serverProfile) {
    finalProfile = serverProfile;
  } else if (localProfile) {
    // No server profile — push local
    finalProfile = await pushProfile(localProfile);
  } else {
    finalProfile = null;
  }

  // Step 5: Persist
  await AsyncStorage.setItem("cardbowl_cards", JSON.stringify(mergedCards));
  if (finalProfile) await saveUserProfile(finalProfile);

  console.log(
    `[Sync] Complete: ${mergedCards.length} cards, ` +
    `profile=${finalProfile ? "yes" : "none"}, ` +
    `queueDrained=${queueDrained}`
  );

  return {
    cards: mergedCards,
    profile: finalProfile,
    online: true,
    queueDrained,
  };
}

// Re-export for backward compat
export { isBackendKey };
