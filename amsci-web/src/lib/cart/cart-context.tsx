"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Client-side "order" cart.
 *
 * Ordering on the live site is login-gated and (eventually) writes a NetSuite
 * Sales Order; for now the cart lives entirely in the browser (localStorage) and
 * the submit step is a placeholder. We store ONLY identity + display fields
 * (sku/title/image/qty) — never prices. Per-account prices are resolved live on
 * the cart page via /api/pricing/bulk, consistent with the "never bake prices
 * into anything cacheable" rule used across the storefront.
 */
export interface CartItem {
	sku: string;
	title: string;
	/** Raw NetSuite File Cabinet URL (proxied at render time); may be empty. */
	imageUrl: string;
	qty: number;
}

interface CartValue {
	items: CartItem[];
	/** Total units across all lines. */
	count: number;
	/** Distinct SKUs. */
	lineCount: number;
	/** True once localStorage has been read (avoids SSR/hydration mismatch). */
	hydrated: boolean;
	addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
	setQty: (sku: string, qty: number) => void;
	removeItem: (sku: string) => void;
	clear: () => void;
}

const STORAGE_KEY = "amsci-cart-v1";
const CartContext = createContext<CartValue | null>(null);

function isValidItem(x: unknown): x is CartItem {
	if (!x || typeof x !== "object") return false;
	const o = x as Record<string, unknown>;
	return (
		typeof o.sku === "string" &&
		typeof o.title === "string" &&
		typeof o.imageUrl === "string" &&
		typeof o.qty === "number" &&
		Number.isFinite(o.qty) &&
		o.qty > 0
	);
}

function readStorage(): CartItem[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter(isValidItem) : [];
	} catch {
		return [];
	}
}

export function CartProvider({ children }: { children: React.ReactNode }) {
	const [items, setItems] = useState<CartItem[]>([]);
	const [hydrated, setHydrated] = useState(false);

	// Hydrate from localStorage after mount (server renders an empty cart).
	useEffect(() => {
		setItems(readStorage());
		setHydrated(true);
	}, []);

	// Persist on change (only after the initial hydrate, so we never clobber
	// stored items with the empty pre-hydrate state).
	useEffect(() => {
		if (!hydrated) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
		} catch {
			// Storage full / disabled — cart just won't persist.
		}
	}, [items, hydrated]);

	// Keep multiple tabs in sync.
	useEffect(() => {
		function onStorage(e: StorageEvent) {
			if (e.key === STORAGE_KEY) setItems(readStorage());
		}
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, []);

	const addItem = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
		const add = Math.max(1, Math.floor(qty));
		setItems((prev) => {
			const i = prev.findIndex((x) => x.sku === item.sku);
			if (i >= 0) {
				const next = [...prev];
				next[i] = { ...next[i], qty: next[i].qty + add };
				return next;
			}
			return [...prev, { ...item, qty: add }];
		});
	}, []);

	const setQty = useCallback((sku: string, qty: number) => {
		const n = Math.floor(qty);
		setItems((prev) =>
			n <= 0
				? prev.filter((x) => x.sku !== sku)
				: prev.map((x) => (x.sku === sku ? { ...x, qty: n } : x)),
		);
	}, []);

	const removeItem = useCallback((sku: string) => {
		setItems((prev) => prev.filter((x) => x.sku !== sku));
	}, []);

	const clear = useCallback(() => setItems([]), []);

	const value = useMemo<CartValue>(
		() => ({
			items,
			count: items.reduce((n, x) => n + x.qty, 0),
			lineCount: items.length,
			hydrated,
			addItem,
			setQty,
			removeItem,
			clear,
		}),
		[items, hydrated, addItem, setQty, removeItem, clear],
	);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
	const ctx = useContext(CartContext);
	if (!ctx) throw new Error("useCart must be used within a CartProvider");
	return ctx;
}
