"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { storage } from "@/lib/storage";
import type { WishlistContextType } from "../types";
const Context = createContext<WishlistContextType | undefined>(undefined);
function read(key: string): string[] {
  try {
    const value: unknown = JSON.parse(storage.get(key) || "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (id): id is string =>
              typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id),
          )
          .slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [syncError, setError] = useState<string | null>(null);
  const current = useRef({
    user: undefined as string | null | undefined,
    generation: 0,
    key: "emeritus-wishlist:guest",
    items: [] as string[],
  });
  const queue = useRef(Promise.resolve());
  function commit(next: string[]) {
    current.current.items = next;
    setItems(next);
    storage.set(current.current.key, JSON.stringify(next));
  }
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    async function hydrate(user: string | null) {
      if (current.current.user === user) return;
      current.current.user = user;
      const generation = ++current.current.generation;
      current.current.key = user
        ? `emeritus-wishlist:user:${user}`
        : "emeritus-wishlist:guest";
      setLoading(true);
      setError(null);
      setItems([]);
      try {
        let next = read(current.current.key);
        if (user) {
          const response = await fetch("/api/wishlist", { cache: "no-store" });
          const payload = await response.json();
          if (!response.ok) throw new Error("Wishlist unavailable");
          const guest = read("emeritus-wishlist:guest");
          next = [...new Set<string>([...payload.data, ...guest])].slice(
            0,
            100,
          );
          for (const productId of guest) {
            if (!active || generation !== current.current.generation) return;
            const saved = await fetch("/api/wishlist", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ productId, action: "add" }),
            });
            if (!saved.ok) throw new Error("Wishlist sync unavailable");
          }
          if (active && generation === current.current.generation)
            storage.remove("emeritus-wishlist:guest");
        }
        if (active && generation === current.current.generation) commit(next);
      } catch {
        if (active && generation === current.current.generation) {
          commit(read(current.current.key));
          setError("Could not sync your wishlist. Reload to retry.");
        }
      } finally {
        if (active && generation === current.current.generation)
          setLoading(false);
      }
    }
    void supabase.auth.getUser().then(({ data }) => {
      if (active && current.current.user === undefined)
        void hydrate(data.user?.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        active &&
        ["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT"].includes(event)
      )
        void hydrate(session?.user.id ?? null);
    });
    return () => {
      active = false;
      current.current.generation++;
      current.current.user = undefined;
      data.subscription.unsubscribe();
    };
  }, []);
  function mutate(productId: string, action: "add" | "remove") {
    if (isLoading) return;
    const generation = current.current.generation;
    const previous = current.current.items;
    commit(
      action === "add"
        ? [...new Set([...previous, productId])].slice(0, 100)
        : previous.filter((id) => id !== productId),
    );
    if (!current.current.user) return;
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (current.current.generation !== generation) return;
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, action }),
        });
        if (!response.ok) throw new Error("Wishlist sync failed");
      })
      .catch(() => {
        if (current.current.generation === generation)
          setError(
            "Your device changes could not be synced. Reload to reconcile.",
          );
      });
  }
  return (
    <Context.Provider
      value={{
        items,
        isLoading,
        syncError,
        addItem: (id) => mutate(id, "add"),
        removeItem: (id) => mutate(id, "remove"),
        isWishlisted: (id) => items.includes(id),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWishlist() {
  const value = useContext(Context);
  if (!value) throw new Error("WishlistProvider missing");
  return value;
}
