import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  BusinessCard,
  getAllCards,
  saveCard,
  deleteCard,
} from "@/lib/storage";
import {
  fullSync,
  pullCards,
  pushCard,
  canReachBackend,
  isBackendKey,
} from "@/lib/sync";
import { enqueue } from "@/lib/offlineQueue";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CardsContextType {
  cards: BusinessCard[];
  loading: boolean;
  syncing: boolean;
  refreshCards: () => Promise<void>;
  addOrUpdateCard: (card: BusinessCard) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  getCardById: (id: string) => BusinessCard | undefined;
}

const CardsContext = createContext<CardsContextType | null>(null);

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refreshCards = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Hydrate from local cache instantly
      const local = await getAllCards();
      setCards(local);

      // 2. Background sync from backend
      const online = await canReachBackend();
      if (online) {
        setSyncing(true);
        try {
          const serverCards = await pullCards();
          if (serverCards.length > 0) {
            // Merge: server wins for backend-keyed items, keep local-only
            const localOnlyCards = local.filter(
              (lc) =>
                !isBackendKey(lc.id) &&
                !serverCards.some(
                  (sc) => sc.name === lc.name && sc.email === lc.email && sc.name !== ""
                )
            );
            const merged = [...serverCards, ...localOnlyCards];
            setCards(merged);
            await AsyncStorage.setItem("cardbowl_cards", JSON.stringify(merged));
          }
        } catch (err) {
          console.warn("[Cards] Background sync failed:", err);
        } finally {
          setSyncing(false);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-sync when auth changes
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      refreshCards();
    } else {
      setCards([]);
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const addOrUpdateCard = useCallback(
    async (card: BusinessCard) => {
      // 1. Save locally first (instant UI update)
      await saveCard(card);

      // 2. Try to push to backend
      const online = await canReachBackend();
      if (online) {
        try {
          const synced = await pushCard(card);
          if (synced.id !== card.id) {
            await deleteCard(card.id);
            await saveCard(synced);
          }
        } catch (err) {
          // Push failed — queue for later
          console.warn("[Cards] Push failed, queuing:", err);
          await enqueue(
            isBackendKey(card.id) ? "card_update" : "card_create",
            card
          );
        }
      } else {
        // Offline — queue the action
        await enqueue(
          isBackendKey(card.id) ? "card_update" : "card_create",
          card
        );
      }

      await refreshCards();
    },
    [refreshCards]
  );

  const removeCard = useCallback(
    async (id: string) => {
      // 1. Delete locally first
      await deleteCard(id);

      // 2. Deactivate on backend or queue
      if (isBackendKey(id)) {
        const online = await canReachBackend();
        if (online) {
          try {
            const { apiPut } = await import("@/lib/api");
            await apiPut(`/business-cards/${id}/deactivate`);
          } catch (err) {
            console.warn("[Cards] Deactivate failed, queuing:", err);
            await enqueue("card_delete", { id });
          }
        } else {
          await enqueue("card_delete", { id });
        }
      }

      await refreshCards();
    },
    [refreshCards]
  );

  const getCardById = useCallback(
    (id: string) => cards.find((c) => c.id === id),
    [cards]
  );

  return (
    <CardsContext.Provider
      value={{ cards, loading, syncing, refreshCards, addOrUpdateCard, removeCard, getCardById }}
    >
      {children}
    </CardsContext.Provider>
  );
}

export function useCards() {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error("useCards must be used within CardsProvider");
  return ctx;
}
