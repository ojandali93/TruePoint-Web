"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import api from "../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
  itemCount: number;
  totalValue: number;
  costBasis: number;
}

interface CollectionContextValue {
  collections: Collection[];
  activeCollectionId: string | null; // null = all collections
  activeCollection: Collection | null;
  setActiveCollectionId: (id: string | null) => void;
  loading: boolean;
  reload: () => Promise<void>;
  createCollection: (input: {
    name: string;
    description?: string;
    color?: string;
  }) => Promise<Collection>;
  updateCollection: (
    id: string,
    input: { name?: string; description?: string; color?: string },
  ) => Promise<void>;
  deleteCollection: (
    id: string,
    strategy?: "reassign" | "delete",
  ) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
}

const CollectionContext = createContext<CollectionContextValue>({
  collections: [],
  activeCollectionId: null,
  activeCollection: null,
  setActiveCollectionId: () => {},
  loading: true,
  reload: async () => {},
  createCollection: async () => {
    throw new Error("not ready");
  },
  updateCollection: async () => {},
  deleteCollection: async () => {},
  setDefault: async () => {},
});

export const useCollections = () => useContext(CollectionContext);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await api.get<{ data: Collection[] }>("/collections");
      const cols = res.data.data ?? [];
      setCollections(cols);

      // On first load, set active to default collection if we haven't chosen one
      setActiveCollectionId((prev) => {
        if (prev !== null) return prev;
        const def = cols.find((c) => c.is_default);
        // Only auto-select default when user has multiple collections
        return cols.length > 1 ? (def?.id ?? null) : null;
      });
    } catch {
      // silently fail — user may not have collections yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void reload();
    }, 0);
    return () => clearTimeout(t);
  }, [reload]);

  const activeCollection =
    collections.find((c) => c.id === activeCollectionId) ?? null;

  const createCollection = async (input: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<Collection> => {
    const res = await api.post<{ data: Collection }>("/collections", input);
    await reload();
    return res.data.data;
  };

  const updateCollection = async (
    id: string,
    input: { name?: string; description?: string; color?: string },
  ): Promise<void> => {
    await api.patch(`/collections/${id}`, input);
    await reload();
  };

  const deleteCollection = async (
    id: string,
    strategy: "reassign" | "delete" = "reassign",
  ): Promise<void> => {
    await api.delete(`/collections/${id}?strategy=${strategy}`);
    // If we were viewing the deleted collection, switch to all
    setActiveCollectionId((prev) => (prev === id ? null : prev));
    await reload();
  };

  const setDefault = async (id: string): Promise<void> => {
    await api.patch(`/collections/${id}/set-default`);
    await reload();
  };

  return (
    <CollectionContext.Provider
      value={{
        collections,
        activeCollectionId,
        activeCollection,
        setActiveCollectionId,
        loading,
        reload,
        createCollection,
        updateCollection,
        deleteCollection,
        setDefault,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
}
