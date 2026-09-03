'use client';

// ===================================================================
// زمینه سبد خرید
// -------------------------------------------------------------------
// سبد خرید در localStorage نگهداری می‌شود تا با رفرش صفحه از بین
// نرود. قیمت‌ها عمداً هنگام checkout از سرور خوانده می‌شوند؛
// مقادیر این‌جا فقط برای نمایش هستند.
// ===================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CartItem, PartListItem } from '@/lib/types';

const STORAGE_KEY = 'cart';

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (part: PartListItem, quantity?: number) => void;
  updateQuantity: (partId: number, quantity: number) => void;
  removeItem: (partId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // بارگذاری اولیه از localStorage (فقط سمت کلاینت)
  useEffect(() => {
    setItems(readStorage());
    setHydrated(true);
  }, []);

  // ذخیره در هر تغییر
  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((part: PartListItem, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.partId === part.id);
      if (existing) {
        // حداکثر تا سقف موجودی
        const max = part.stock || existing.stock;
        return prev.map((i) =>
          i.partId === part.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, max) }
            : i,
        );
      }
      return [
        ...prev,
        {
          partId: part.id,
          name: part.name,
          slug: part.slug,
          price: part.price,
          discountPrice: part.discountPrice,
          imageUrl: part.imageUrl,
          stock: part.stock,
          unit: part.unit,
          quantity: Math.min(quantity, part.stock || 1),
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((partId: number, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.partId !== partId)
        : prev.map((i) =>
            i.partId === partId
              ? { ...i, quantity: Math.min(quantity, i.stock) }
              : i,
          ),
    );
  }, []);

  const removeItem = useCallback((partId: number) => {
    setItems((prev) => prev.filter((i) => i.partId !== partId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  // تعداد کل اقلام و جمع قیمت (با احتساب تخفیف)
  const { count, subtotal } = useMemo(() => {
    let c = 0;
    let s = 0;
    for (const item of items) {
      c += item.quantity;
      s += (item.discountPrice ?? item.price) * item.quantity;
    }
    return { count: c, subtotal: s };
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, count, subtotal, addItem, updateQuantity, removeItem, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart باید داخل CartProvider استفاده شود');
  return ctx;
}
