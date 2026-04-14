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
  getCard,
} from "@/lib/storage";

interface CardsContextType {
  cards: BusinessCard[];
  loading: boolean;
  refreshCards: () => Promise<void>;
  addOrUpdateCard: (card: BusinessCard) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  getCardById: (id: string) => BusinessCard | undefined;
}

const CardsContext = createContext<CardsContextType | null>(null);

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCards = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllCards();
      setCards(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

  const addOrUpdateCard = useCallback(
    async (card: BusinessCard) => {
      await saveCard(card);
      await refreshCards();
    },
    [refreshCards]
  );

  const removeCard = useCallback(
    async (id: string) => {
      await deleteCard(id);
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
      value={{ cards, loading, refreshCards, addOrUpdateCard, removeCard, getCardById }}
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
