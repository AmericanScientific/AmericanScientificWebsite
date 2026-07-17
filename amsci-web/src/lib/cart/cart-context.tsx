"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

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

/** A rectangle to fly from (viewport coords, e.g. a DOMRect). */
type FromRect = { left: number; top: number; width: number; height: number };

/** One in-flight "fly to cart" animation. */
interface Flight {
	id: number;
	src: string;
	from: FromRect;
	to: { x: number; y: number };
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
	/**
	 * Cosmetic: fly a clone of `imgSrc` from `from` into the header cart icon
	 * (marked `[data-cart-target]`). No-op if the target is missing or the user
	 * prefers reduced motion.
	 */
	flyToCart: (opts: { imgSrc: string; from: FromRect }) => void;
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
	const [flights, setFlights] = useState<Flight[]>([]);
	const flightSeq = useRef(0);

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

	const removeFlight = useCallback((id: number) => {
		setFlights((f) => f.filter((x) => x.id !== id));
	}, []);

	const flyToCart = useCallback((opts: { imgSrc: string; from: FromRect }) => {
		if (typeof window === "undefined" || !opts.imgSrc) return;
		if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
		const target = document.querySelector("[data-cart-target]");
		if (!target) return; // e.g. guest header — nothing to fly into
		const { from } = opts;
		if (!from.width || !from.height) return;
		const t = target.getBoundingClientRect();
		flightSeq.current += 1;
		setFlights((f) => [
			...f,
			{
				id: flightSeq.current,
				src: opts.imgSrc,
				from: { left: from.left, top: from.top, width: from.width, height: from.height },
				to: { x: t.left + t.width / 2, y: t.top + t.height / 2 },
			},
		]);
	}, []);

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
			flyToCart,
		}),
		[items, hydrated, addItem, setQty, removeItem, clear, flyToCart],
	);

	return (
		<CartContext.Provider value={value}>
			{children}
			<CartFlyLayer flights={flights} onDone={removeFlight} />
		</CartContext.Provider>
	);
}

/** Fixed overlay that renders every in-flight "fly to cart" clone. */
function CartFlyLayer({ flights, onDone }: { flights: Flight[]; onDone: (id: number) => void }) {
	if (flights.length === 0) return null;
	return (
		<div className="pointer-events-none fixed inset-0 z-[9999]" aria-hidden>
			{flights.map((f) => (
				<FlyingImage key={f.id} flight={f} onDone={onDone} />
			))}
		</div>
	);
}

/**
 * A single flying product photo. Starts at its on-page size/position and, via the
 * Web Animations API, travels to the cart icon while shrinking, then fades out
 * quickly as it lands. Removes itself on finish.
 */
function FlyingImage({ flight, onDone }: { flight: Flight; onDone: (id: number) => void }) {
	const ref = useRef<HTMLImageElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) {
			onDone(flight.id);
			return;
		}
		const cx = flight.from.left + flight.from.width / 2;
		const cy = flight.from.top + flight.from.height / 2;
		const dx = flight.to.x - cx;
		const dy = flight.to.y - cy;

		const anim = el.animate(
			[
				{ transform: "translate(0px, 0px) scale(1)", opacity: 1, offset: 0 },
				{ transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) scale(0.5)`, opacity: 1, offset: 0.6 },
				{ transform: `translate(${dx * 0.86}px, ${dy * 0.86}px) scale(0.2)`, opacity: 1, offset: 0.86 },
				{ transform: `translate(${dx}px, ${dy}px) scale(0.06)`, opacity: 0, offset: 1 },
			],
			{ duration: 800, easing: "cubic-bezier(0.4, 0, 0.7, 1)", fill: "forwards" },
		);
		const done = () => onDone(flight.id);
		anim.addEventListener("finish", done);
		anim.addEventListener("cancel", done);
		return () => {
			anim.removeEventListener("finish", done);
			anim.removeEventListener("cancel", done);
		};
	}, [flight, onDone]);

	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			ref={ref}
			src={flight.src}
			alt=""
			style={{
				position: "fixed",
				left: flight.from.left,
				top: flight.from.top,
				width: flight.from.width,
				height: flight.from.height,
				transformOrigin: "center center",
				objectFit: "contain",
				borderRadius: 16,
				background: "white",
				boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
				willChange: "transform, opacity",
			}}
		/>
	);
}

export function useCart(): CartValue {
	const ctx = useContext(CartContext);
	if (!ctx) throw new Error("useCart must be used within a CartProvider");
	return ctx;
}
