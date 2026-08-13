import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { effectivePrice, fetchProductsByIds, fetchStoreSettings } from "@/services/supabase/catalog";
import { useAuth } from "@/hooks/use-auth";
import type { CartLine, CartLineDetailed } from "@/types/store";

const STORAGE_KEY = "solnaturals.cart.v1";

function readLocal(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed)
      ? parsed.filter((line) => typeof line.product_id === "string" && line.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

function writeLocal(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

type CartContextValue = {
  lines: CartLine[];
  detailed: CartLineDetailed[];
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  freeShippingMin: number;
  loading: boolean;
  add: (productId: string, quantity?: number) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localLines, setLocalLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLocalLines(readLocal());
    setHydrated(true);
  }, []);

  const remoteQuery = useQuery({
    queryKey: ["cart", user?.id ?? null],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("product_id,quantity")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as CartLine[];
    },
  });

  // Merge the guest cart into the account cart right after sign-in.
  useEffect(() => {
    if (!user?.id || !hydrated || localLines.length === 0) return;
    void (async () => {
      for (const line of localLines) {
        const { data: existing } = await supabase
          .from("cart_items")
          .select("quantity")
          .eq("user_id", user.id)
          .eq("product_id", line.product_id)
          .maybeSingle();
        await supabase.from("cart_items").upsert(
          {
            user_id: user.id,
            product_id: line.product_id,
            quantity: (existing?.quantity ?? 0) + line.quantity,
          },
          { onConflict: "user_id,product_id" },
        );
      }
      writeLocal([]);
      setLocalLines([]);
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
    })();
  }, [user?.id, hydrated, localLines, queryClient]);

  const lines = useMemo<CartLine[]>(
    () => (user ? (remoteQuery.data ?? []) : localLines),
    [user, remoteQuery.data, localLines],
  );

  const productsQuery = useQuery({
    queryKey: ["cart-products", lines.map((line) => line.product_id).sort().join(",")],
    enabled: lines.length > 0,
    queryFn: () => fetchProductsByIds(lines.map((line) => line.product_id)),
  });

  const settingsQuery = useQuery({ queryKey: ["store-settings"], queryFn: fetchStoreSettings });

  const detailed = useMemo<CartLineDetailed[]>(() => {
    const products = productsQuery.data ?? [];
    return lines.flatMap((line) => {
      const product = products.find((item) => item.id === line.product_id);
      if (!product) return [];
      const unit = effectivePrice(product);
      return [
        {
          ...line,
          product,
          unit_price: unit,
          line_total: unit * line.quantity,
        },
      ];
    });
  }, [lines, productsQuery.data]);

  const subtotal = detailed.reduce((sum, line) => sum + line.line_total, 0);
  const freeShippingMin = Number(settingsQuery.data?.free_shipping_min ?? 150000);
  const shippingCost = Number(settingsQuery.data?.shipping_cost ?? 12000);
  const shipping = detailed.length === 0 || subtotal >= freeShippingMin ? 0 : shippingCost;

  const persist = useCallback(
    async (next: CartLine[]) => {
      if (!user) {
        writeLocal(next);
        setLocalLines(next);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    [user, queryClient],
  );

  const add = useCallback<CartContextValue["add"]>(
    async (productId, quantity = 1) => {
      if (user) {
        const current = lines.find((line) => line.product_id === productId);
        const { error } = await supabase.from("cart_items").upsert(
          {
            user_id: user.id,
            product_id: productId,
            quantity: (current?.quantity ?? 0) + quantity,
          },
          { onConflict: "user_id,product_id" },
        );
        if (error) throw error;
        await persist(lines);
        return;
      }
      const next = [...lines];
      const index = next.findIndex((line) => line.product_id === productId);
      if (index >= 0) next[index] = { ...next[index]!, quantity: next[index]!.quantity + quantity };
      else next.push({ product_id: productId, quantity });
      await persist(next);
    },
    [user, lines, persist],
  );

  const setQuantity = useCallback<CartContextValue["setQuantity"]>(
    async (productId, quantity) => {
      if (quantity <= 0) {
        if (user) {
          await supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_id", productId);
          await persist(lines);
        } else {
          await persist(lines.filter((line) => line.product_id !== productId));
        }
        return;
      }
      if (user) {
        await supabase
          .from("cart_items")
          .update({ quantity })
          .eq("user_id", user.id)
          .eq("product_id", productId);
        await persist(lines);
        return;
      }
      await persist(lines.map((line) => (line.product_id === productId ? { ...line, quantity } : line)));
    },
    [user, lines, persist],
  );

  const remove = useCallback<CartContextValue["remove"]>(
    async (productId) => setQuantity(productId, 0),
    [setQuantity],
  );

  const clear = useCallback<CartContextValue["clear"]>(async () => {
    if (user) {
      await supabase.from("cart_items").delete().eq("user_id", user.id);
      await persist([]);
      return;
    }
    await persist([]);
  }, [user, persist]);

  const value: CartContextValue = {
    lines,
    detailed,
    count: detailed.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    shipping,
    total: subtotal + shipping,
    freeShippingMin,
    loading: (user ? remoteQuery.isLoading : !hydrated) || productsQuery.isLoading,
    add,
    setQuantity,
    remove,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
