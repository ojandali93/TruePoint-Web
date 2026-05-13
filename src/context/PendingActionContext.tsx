"use client";
import { createContext, useContext, useState, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingCard {
  inventoryId: string;
  cardId: string | null;
  name: string;
  number: string;
  setName: string;
  imageSmall: string | null;
  marketPrice: number | null;
  purchasePrice: number | null;
  itemType: string;
  gradingCompany: string | null;
  grade: string | null;
}

export type PendingActionType = "trade" | "submit" | null;

interface PendingActionContextValue {
  pendingCards: PendingCard[];
  actionType: PendingActionType;
  setPendingAction: (cards: PendingCard[], type: PendingActionType) => void;
  clearPendingAction: () => void;
}

const PendingActionContext = createContext<PendingActionContextValue>({
  pendingCards: [],
  actionType: null,
  setPendingAction: () => {},
  clearPendingAction: () => {},
});

export const usePendingAction = () => useContext(PendingActionContext);

export function PendingActionProvider({ children }: { children: ReactNode }) {
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [actionType, setActionType] = useState<PendingActionType>(null);

  const setPendingAction = (cards: PendingCard[], type: PendingActionType) => {
    setPendingCards(cards);
    setActionType(type);
  };

  const clearPendingAction = () => {
    setPendingCards([]);
    setActionType(null);
  };

  return (
    <PendingActionContext.Provider
      value={{ pendingCards, actionType, setPendingAction, clearPendingAction }}
    >
      {children}
    </PendingActionContext.Provider>
  );
}
