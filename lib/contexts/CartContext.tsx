"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartContextType, CartItemUI } from "../types";
import { createClient } from "../supabase/client";
import { useToast } from "@/components/ui/toast";
import { storage } from "@/lib/storage";
import { mergeCart, parseCart } from "@/lib/cart-state";

const CartContext = createContext<CartContextType | undefined>(undefined);
const guestKey = "emeritus-cart:guest";
const couponKey = (user: string | null) =>
  `emeritus-coupon:${user ? `user:${user}` : "guest"}`;
export function CartProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<CartItemUI[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const current = useRef({
    items: [] as CartItemUI[],
    userId: null as string | null,
    generation: 0,
    ready: false,
  });
  const queues = useRef(new Map<string, Promise<unknown>>());
  const couponGeneration = useRef(0);
  const reload = useRef<() => Promise<void>>(async () => {});
  const refreshCart = useCallback(async () => {
    await reload.current();
  }, []);

  const commit = useCallback((next: CartItemUI[]) => {
    couponGeneration.current++;
    current.current.items = next;
    setItems(next);
    if (!current.current.userId) storage.set(guestKey, JSON.stringify(next));
  }, []);
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    async function hydrate(user: string | null, mergeGuest = false) {
      const generation = ++current.current.generation;
      current.current.ready = false;
      current.current.userId = user;
      couponGeneration.current++;
      setAuthReady(false);
      setSyncError(null);
      setUserId(user);
      setItems([]);
      try {
        let next = mergeCart(
          parseCart(storage.get(guestKey)),
          parseCart(storage.get("cart")),
        );
        if (user) {
          const { data, error } = await supabase
            .from("cart_items")
            .select("product_id,quantity,products(name,price,image_url)")
            .eq("user_id", user);
          if (error) throw error;
          next = (data ?? []).flatMap((row) => {
            const product = Array.isArray(row.products)
              ? row.products[0]
              : row.products;
            return product
              ? [
                  {
                    productId: row.product_id,
                    quantity: row.quantity,
                    name: product.name,
                    price: Number(product.price),
                    image: product.image_url || "/product-placeholder.svg",
                  },
                ]
              : [];
          });
          if (mergeGuest) {
            if (!active || current.current.generation !== generation) return;
            next = mergeCart(
              next,
              mergeCart(
                parseCart(storage.get(guestKey)),
                parseCart(storage.get("cart")),
              ),
            );
            if (next.length) {
              const { error: saveError } = await supabase
                .from("cart_items")
                .upsert(
                  next.map((item) => ({
                    user_id: user,
                    product_id: item.productId,
                    quantity: item.quantity,
                  })),
                  { onConflict: "user_id,product_id" },
                );
              if (saveError) throw saveError;
            }
            if (!active || current.current.generation !== generation) return;
            storage.remove(guestKey);
            storage.remove("cart");
          }
        }
        if (next.length) {
          const batches = [];
          for (let i = 0; i < next.length; i += 50)
            batches.push(
              fetch(
                `/api/products?ids=${next
                  .slice(i, i + 50)
                  .map((item) => item.productId)
                  .join(",")}&limit=50`,
              ).then(async (response) => {
                if (!response.ok) throw new Error("Prices unavailable");
                return response.json();
              }),
            );
          const products = (await Promise.all(batches)).flatMap(
            (result) => result.data,
          );
          next = next.map((item) => {
            const product = products.find(
              (candidate) => candidate.id === item.productId,
            );
            return product
              ? {
                  ...item,
                  price: product.price,
                  name: product.name,
                  image: product.image,
                }
              : item;
          });
        }
        if (!active || current.current.generation !== generation) return;
        current.current.ready = true;
        commit(next);
        setCouponCode(storage.get(couponKey(user)));
        setDiscount(0);
        setAuthReady(true);
      } catch {
        if (active && current.current.generation === generation) {
          setSyncError("Your cart could not be loaded. Please retry.");
          setAuthReady(true);
          current.current.items = [];
          setItems([]);
          setCouponCode(null);
          setDiscount(0);
          showToast({
            kind: "error",
            title: "Could not load your cart",
            description: "Reload the page to retry.",
          });
        }
      }
    }
    reload.current = () => hydrate(current.current.userId);
    let identity: string | null | undefined;
    function authenticate(user: string | null) {
      if (identity === user) return;
      const previous = identity;
      identity = user;
      if (previous && !user) {
        storage.remove(guestKey);
        storage.remove("cart");
      }
      void hydrate(user, Boolean(user));
    }
    void supabase.auth.getUser().then(({ data }) => {
      if (active && identity === undefined) authenticate(data.user?.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "INITIAL_SESSION"
      )
        authenticate(session?.user.id ?? null);
    });
    const signedOut = () => authenticate(null);
    window.addEventListener("emeritus:signout", signedOut);
    return () => {
      active = false;
      current.current.generation++;
      data.subscription.unsubscribe();
      window.removeEventListener("emeritus:signout", signedOut);
    };
  }, [commit, showToast]);

  function enqueue(
    productId: string,
    task: (user: string | null, generation: number) => Promise<void>,
  ) {
    const { userId: user, generation, ready } = current.current;
    if (!ready) return Promise.reject(new Error("Wait for your cart to load"));
    const key = `${generation}:${productId}`;
    const queued = (queues.current.get(key) ?? Promise.resolve())
      .catch(() => {})
      .then(async () => {
        if (current.current.generation !== generation) return;
        await task(user, generation);
      });
    queues.current.set(key, queued);
    void queued
      .finally(() => {
        if (queues.current.get(key) === queued) queues.current.delete(key);
      })
      .catch(() => {});
    return queued;
  }
  async function persist(
    productId: string,
    quantity: number,
    user: string | null,
  ) {
    if (!user) return;
    const client = createClient();
    const { error } =
      quantity === 0
        ? await client
            .from("cart_items")
            .delete()
            .eq("user_id", user)
            .eq("product_id", productId)
        : await client
            .from("cart_items")
            .upsert(
              { user_id: user, product_id: productId, quantity },
              { onConflict: "user_id,product_id" },
            );
    if (error) throw new Error("Could not save your cart");
  }
  async function addItem(productId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      showToast({
        kind: "warning",
        title: "Choose a quantity between 1 and 99",
      });
      return false;
    }
    try {
      await enqueue(productId, async (user, generation) => {
        const response = await fetch(
          `/api/products/${encodeURIComponent(productId)}`,
        );
        const result = await response.json();
        if (!response.ok || !result.data?.inStock)
          throw new Error("Product unavailable");
        if (current.current.generation !== generation) return;
        const product = result.data;
        const previous = current.current.items.find(
          (item) => item.productId === product.id,
        );
        const nextQuantity = Math.min(99, (previous?.quantity ?? 0) + quantity);
        commit([
          ...current.current.items.filter(
            (item) => item.productId !== product.id,
          ),
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: nextQuantity,
          },
        ]);
        try {
          await persist(product.id, nextQuantity, user);
        } catch (error) {
          if (current.current.generation === generation) await refreshCart();
          throw error;
        }
        showToast({ kind: "success", title: `${product.name} added to cart` });
      });
      return true;
    } catch (error) {
      showToast({
        kind: "error",
        title: error instanceof Error ? error.message : "Could not add item",
      });
      return false;
    }
  }
  function updateQuantity(productId: string, quantity: number) {
    if (
      !Number.isFinite(quantity) ||
      !Number.isInteger(quantity) ||
      quantity > 99
    )
      return;
    if (!current.current.ready) return;
    commit(
      quantity <= 0
        ? current.current.items.filter((item) => item.productId !== productId)
        : current.current.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item,
          ),
    );
    void enqueue(productId, async (user) => {
      await persist(productId, Math.max(0, quantity), user);
    }).catch(() => {
      showToast({
        kind: "error",
        title: "Could not update your cart. Reloading saved items.",
      });
      void refreshCart();
    });
  }
  const removeItem = (id: string) => updateQuantity(id, 0);
  function clearCart() {
    const snapshot = [...current.current.items];
    snapshot.forEach((item) => updateQuantity(item.productId, 0));
    removeCoupon();
  }
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  useEffect(() => {
    const generation = ++couponGeneration.current;
    if (!couponCode || !authReady || !items.length) {
      setDiscount(0);
      return;
    }
    const controller = new AbortController();
    void fetch("/api/coupons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: couponCode,
        items: items.map(({ productId, quantity }) => ({
          productId,
          quantity,
        })),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (generation !== couponGeneration.current) return;
        if (!response.ok) {
          setDiscount(0);
          return;
        }
        setDiscount(payload.discount);
      })
      .catch(() => {
        if (generation === couponGeneration.current) setDiscount(0);
      });
    return () => controller.abort();
  }, [items, couponCode, authReady]);
  async function applyCoupon(code: string) {
    const generation = ++couponGeneration.current;
    try {
      const response = await fetch("/api/coupons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          items: current.current.items.map(({ productId, quantity }) => ({
            productId,
            quantity,
          })),
        }),
      });
      const result = await response.json();
      if (generation !== couponGeneration.current)
        return {
          success: false,
          message: "Your cart changed. Apply the code again.",
        };
      if (!response.ok) throw new Error(result.error || "Coupon unavailable");
      setCouponCode(result.coupon);
      setDiscount(result.discount);
      storage.set(couponKey(current.current.userId), result.coupon);
      return { success: true, message: `${result.coupon} applied.` };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Coupon unavailable",
      };
    }
  }
  function removeCoupon() {
    couponGeneration.current++;
    setCouponCode(null);
    setDiscount(0);
    storage.remove(couponKey(current.current.userId));
  }
  return (
    <CartContext.Provider
      value={{
        items,
        total,
        discount,
        couponCode,
        discountedTotal: Math.max(0, total - discount),
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        distinctItemCount: new Set(items.map((item) => item.productId)).size,
        authReady,
        syncError,
        isAuthenticated: !!userId,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        refreshCart,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used within CartProvider");
  return value;
}
