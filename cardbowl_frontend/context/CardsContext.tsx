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
import { pushCardToBackend, syncCardsFromBackend, isOnline } from "@/lib/sync";
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
      // Load from local storage first (fast)
      const local = await getAllCards();
      setCards(local);

      // Then sync from backend if authenticated
      const online = await isOnline();
      if (online) {
        setSyncing(true);
        try {
          const backendCards = await syncCardsFromBackend();
          if (backendCards.length > 0) {
            // Merge: backend is source of truth, keep local-only cards
            const localOnlyCards = local.filter(
              (lc) =>
                lc.id.length !== 15 &&
                !backendCards.some(
                  (bc) => bc.name === lc.name && bc.email === lc.email
                )
            );
            const merged = [...backendCards, ...localOnlyCards];
            setCards(merged);
            await AsyncStorage.setItem(
              "cardbowl_cards",
              JSON.stringify(merged)
            );
          }
        } catch (err) {
          console.warn("Background card sync failed:", err);
        } finally {
          setSyncing(false);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-sync whenever auth state changes (login/logout)
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      refreshCards();
    } else {
      // Logged out — clear local state
      setCards([]);
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const addOrUpdateCard = useCallback(
    async (card: BusinessCard) => {
      // Save locally first
      await saveCard(card);

      // Push to backend if online
      const online = await isOnline();
      if (online) {
        try {
          const synced = await pushCardToBackend(card);
          if (synced.id !== card.id) {
            // Backend assigned a new key — update local storage
            await deleteCard(card.id);
            await saveCard(synced);
          }
        } catch (err) {
          console.warn("Card push to backend failed:", err);
        }
      }

      await refreshCards();
    },
    [refreshCards]
  );

  const removeCard = useCallback(
    async (id: string) => {
      await deleteCard(id);

      // Deactivate on backend if it's a backend card (15-char uniqueKey)
      const online = await isOnline();
      if (online && id.length === 15) {
        try {
          const { apiPut } = await import("@/lib/api");
          await apiPut(`/business-cards/${id}/deactivate`);
        } catch (err) {
          console.warn("Card deactivate on backend failed:", err);
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
