"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { CartContextType, CartItemUI } from "../types";
import { createClient } from "../supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/toast";

const CartContext = createContext<CartContextType | undefined>(undefined);
const GUEST_CART_KEY = "emeritus-cart:guest";
const LEGACY_CART_KEY = "cart";

function cartKey(userId: string | null) {
  return userId ? `emeritus-cart:user:${userId}` : GUEST_CART_KEY;
}

function couponKey(userId: string | null) {
  return userId ? `emeritus-coupon:user:${userId}` : "emeritus-coupon:guest";
}

function readCart(key: string): CartItemUI[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is CartItemUI =>
      Boolean(item && typeof item === "object" && "productId" in item && "quantity" in item),
    ) : [];
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

function mergeCarts(primary: CartItemUI[], incoming: CartItemUI[]) {
  const merged = new Map(primary.map((item) => [item.productId, item]));
  incoming.forEach((item) => {
    const existing = merged.get(item.productId);
    merged.set(item.productId, existing
      ? { ...existing, quantity: Math.min(99, existing.quantity + item.quantity) }
      : item);
  });
  return Array.from(merged.values());
}

type BackendCartRow = {
  product_id: string;
  quantity: number;
  products:
    | { name: string; price: number | string; image_url: string | null }
    | { name: string; price: number | string; image_url: string | null }[]
    | null;
};

function toCartItem(row: BackendCartRow): CartItemUI | null {
  const product = Array.isArray(row.products) ? row.products[0] : row.products;
  if (!product) return null;
  return {
    productId: row.product_id,
    name: product.name,
    price: Number(product.price),
    quantity: row.quantity,
    image: product.image_url || "/placeholder.jpg",
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { showToast, updateToast } = useToast();
  const [items, setItems] = useState<CartItemUI[]>([]);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const hydrate = async (nextUserId: string | null, clearGuest = false) => {
      if (!active) return;
      if (clearGuest) {
        localStorage.removeItem(GUEST_CART_KEY);
        localStorage.removeItem("emeritus-coupon:guest");
        localStorage.removeItem(LEGACY_CART_KEY);
      }
      const legacy = readCart(LEGACY_CART_KEY);
      const guest = clearGuest ? [] : mergeCarts(readCart(GUEST_CART_KEY), legacy);
      let nextItems = guest;

      if (nextUserId) {
        const localAccount = readCart(cartKey(nextUserId));
        const { data, error } = await supabase
          .from("cart_items")
          .select("product_id,quantity,products(name,price,image_url)")
          .eq("user_id", nextUserId);
        if (!active) return;

        if (error) {
          nextItems = mergeCarts(localAccount, guest);
        } else {
          const backend = ((data ?? []) as BackendCartRow[])
            .map(toCartItem)
            .filter((item): item is CartItemUI => item !== null);
          nextItems = mergeCarts(backend, mergeCarts(localAccount, guest));

          if (localAccount.length || guest.length) {
            const { error: migrationError } = await supabase
              .from("cart_items")
              .upsert(
                nextItems.map((item) => ({
                  user_id: nextUserId,
                  product_id: item.productId,
                  quantity: item.quantity,
                })),
                { onConflict: "user_id,product_id" },
              );
            if (!migrationError) {
              localStorage.removeItem(cartKey(nextUserId));
              localStorage.removeItem(GUEST_CART_KEY);
              localStorage.removeItem(LEGACY_CART_KEY);
            }
          }
        }
      }

      if (!active) return;
      setUserId(nextUserId);
      setItems(nextItems);
      setCouponCode(localStorage.getItem(couponKey(nextUserId)));
      setDiscount(0);
      setMounted(true);
      setAuthReady(true);
    };
    void supabase.auth.getUser().then((result: { data: { user: { id: string } | null } }) => {
      void hydrate(result.data.user?.id ?? null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_OUT") void hydrate(null, true);
      if (event === "SIGNED_IN" && session?.user) void hydrate(session.user.id);
    });
    const signedOut = () => {
      void hydrate(null, true);
    };
    window.addEventListener("emeritus:signout", signedOut);
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
      window.removeEventListener("emeritus:signout", signedOut);
    };
  }, []);

  useEffect(() => {
    if (mounted && !userId) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    }
  }, [items, mounted, userId]);

  const addItem = async (productId: string, quantity: number, variantId?: string) => {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showToast({ kind: "warning", title: "Choose a valid quantity" });
      return false;
    }
    const toastId = showToast({ kind: "loading", title: "Adding item to cart…" });
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}`);
      const result = await response.json();
      if (!response.ok || !result?.data) {
        throw new Error(result?.error || "This item could not be added.");
      }
      const product = result.data;
      const canonicalProductId = product.id as string;
      const existingItem = items.find((item) => item.productId === canonicalProductId);
      const updatedExisting = Boolean(existingItem);
      const nextQuantity = Math.min(99, (existingItem?.quantity ?? 0) + Math.floor(quantity));

      if (userId) {
        const { error: saveError } = await createClient()
          .from("cart_items")
          .upsert(
            {
              user_id: userId,
              product_id: canonicalProductId,
              quantity: nextQuantity,
            },
            { onConflict: "user_id,product_id" },
          );
        if (saveError) throw new Error("Could not save your cart.");
      }

      setItems((prevItems) => {
        const currentItem = prevItems.find(
          (item) => item.productId === canonicalProductId,
        );
        if (currentItem) {
          return prevItems.map((item) =>
            item.productId === canonicalProductId
              ? {
                  ...item,
                  quantity: nextQuantity,
                  price: product?.price ?? item.price,
                  name: product?.name ?? item.name,
                  image: product?.image ?? item.image,
                }
              : item,
          );
        }

        return [
          ...prevItems,
          {
            productId: canonicalProductId,
            name: product?.name ?? "Emeritus Item",
            price: product?.price ?? 0,
            quantity: nextQuantity,
            image: product?.image ?? "",
            variantId,
          },
        ];
      });
      updateToast(toastId, {
        kind: "success",
        title: updatedExisting
          ? `${product.name} quantity updated`
          : `${product.name} added to cart`,
        action: {
          label: "View cart",
          onClick: () => {
            window.location.href = "/cart";
          },
        },
      });
      return true;
    } catch (error) {
      updateToast(toastId, {
        kind: "error",
        title: "Could not add item",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      return false;
    }
  };

  const removeItem = (productId: string) => {
    const item = items.find((candidate) => candidate.productId === productId);
    setItems((prevItems) =>
      prevItems.filter((item) => item.productId !== productId),
    );
    if (userId) {
      void createClient()
        .from("cart_items")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId)
        .then((result: { error: { message: string } | null }) => {
          if (result.error) showToast({ kind: "error", title: "Could not update your saved cart" });
        });
    }
    showToast({
      kind: "info",
      title: item ? `${item.name} removed from cart` : "Item removed from cart",
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
    } else {
      const nextQuantity = Math.min(99, Math.floor(quantity));
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.productId === productId ? { ...item, quantity: nextQuantity } : item,
        ),
      );
      if (userId) {
        void createClient()
          .from("cart_items")
          .update({ quantity: nextQuantity })
          .eq("user_id", userId)
          .eq("product_id", productId)
          .then((result: { error: { message: string } | null }) => {
            if (result.error) showToast({ kind: "error", title: "Could not update your saved cart" });
          });
      }
    }
  };

  const clearCart = useCallback(() => {
    setItems([]);
    setCouponCode(null);
    setDiscount(0);
    if (userId) {
      void createClient()
        .from("cart_items")
        .delete()
        .eq("user_id", userId)
        .then((result: { error: { message: string } | null }) => {
          if (result.error) showToast({ kind: "error", title: "Could not clear your saved cart" });
        });
      localStorage.removeItem(cartKey(userId));
    } else {
      localStorage.setItem(GUEST_CART_KEY, "[]");
    }
    localStorage.removeItem(couponKey(userId));
    showToast({ kind: "success", title: "Cart cleared" });
  }, [showToast, userId]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const discountedTotal = Math.max(0, total - discount);

  useEffect(() => {
    if (!mounted || !couponCode || total <= 0) {
      if (total <= 0) setDiscount(0);
      return;
    }
    void fetch("/api/coupons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: couponCode, cartTotal: total }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setDiscount(Number(result.discount) || 0);
      })
      .catch(() => {
        setCouponCode(null);
        setDiscount(0);
        localStorage.removeItem(couponKey(userId));
      });
  }, [couponCode, mounted, total]);

  const applyCoupon = async (code: string) => {
    try {
      const response = await fetch("/api/coupons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, cartTotal: total }),
      });
      const result = await response.json();
      if (!response.ok) {
        const message = result.error || "Coupon could not be applied.";
        showToast({ kind: "error", title: "Coupon not applied", description: message });
        return { success: false, message };
      }
      setCouponCode(result.coupon);
      setDiscount(Number(result.discount) || 0);
      localStorage.setItem(couponKey(userId), result.coupon);
      const message = `${result.coupon} applied successfully.`;
      showToast({ kind: "success", title: "Coupon applied", description: message });
      return { success: true, message };
    } catch {
      const message = "Coupon service is currently unavailable.";
      showToast({ kind: "error", title: "Coupon not applied", description: message });
      return { success: false, message };
    }
  };

  const removeCoupon = () => {
    setCouponCode(null);
    setDiscount(0);
    localStorage.removeItem(couponKey(userId));
    showToast({ kind: "info", title: "Coupon removed" });
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        total,
        discount,
        couponCode,
        discountedTotal,
        authReady,
        isAuthenticated: Boolean(userId),
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
