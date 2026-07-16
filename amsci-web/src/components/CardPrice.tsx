"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";

/**
 * Login-gated price for catalog cards. Prices are never rendered into the
 * (public, ISR-cached) grid HTML — this fetches them per viewer.
 *
 * To avoid one request per card, all <CardPrice> instances on a page share a
 * module-level batch loader: SKUs requested within ~16ms are coalesced into a
 * single POST /api/pricing/bulk. Once any batch comes back 401, we know the
 * viewer is a guest and stop fetching entirely.
 */

type Price = number | null;
const cache = new Map<string, Price>(); // resolved: number, or null = no/na price
let isGuest: boolean | null = null; // null = unknown yet
const queue = new Set<string>();
const waiters = new Map<string, Set<() => void>>();
let timer: ReturnType<typeof setTimeout> | null = null;

function notify(sku: string) {
	waiters.get(sku)?.forEach((cb) => cb());
}

const CHUNK = 120;

async function fetchChunk(skus: string[]) {
	try {
		const res = await fetch("/api/pricing/bulk", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify({ skus }),
		});
		if (res.status === 401) {
			isGuest = true;
			return;
		}
		isGuest = false;
		const data = (await res.json()) as { prices: Record<string, Price> };
		for (const sku of skus) cache.set(sku, data.prices?.[sku] ?? null);
	} catch {
		for (const sku of skus) cache.set(sku, null);
	}
}

async function flush() {
	timer = null;
	const skus = [...queue];
	queue.clear();
	if (skus.length === 0) return;
	// Chunk into parallel requests so a big grid (e.g. all-products, ~975 cards)
	// isn't one huge slow request that also hits the server cap.
	const chunks: string[][] = [];
	for (let i = 0; i < skus.length; i += CHUNK) chunks.push(skus.slice(i, i + CHUNK));
	await Promise.all(chunks.map(fetchChunk));
	// Wake every waiter: those whose sku resolved read the cache; if we learned the
	// viewer is a guest, the rest render the guest state.
	for (const sku of skus) notify(sku);
	if (isGuest === true) waiters.forEach((_set, sku) => notify(sku));
}

function request(sku: string) {
	if (isGuest === true || cache.has(sku) || queue.has(sku)) return;
	queue.add(sku);
	if (!timer) timer = setTimeout(flush, 16);
}

export function CardPrice({ sku, isGroup }: { sku: string; isGroup?: boolean }) {
	const [, force] = useState(0);

	useEffect(() => {
		if (isGuest === true || cache.has(sku)) {
			force((n) => n + 1);
			return;
		}
		const cb = () => force((n) => n + 1);
		let set = waiters.get(sku);
		if (!set) {
			set = new Set();
			waiters.set(sku, set);
		}
		set.add(cb);
		request(sku);
		return () => {
			set.delete(cb);
		};
	}, [sku]);

	if (isGuest === true) {
		return <span className="text-xs font-semibold text-brand-blue">Sign in for price</span>;
	}
	if (!cache.has(sku)) {
		return <span className="inline-block h-5 w-16 animate-pulse rounded bg-slate-100" aria-hidden />;
	}
	const price = cache.get(sku) ?? null;
	return (
		<>
			{isGroup && <span className="mr-1 text-xs font-medium text-slate-400">from</span>}
			<span className="text-lg font-bold tracking-tight text-slate-900">
				{price != null ? formatPrice(price) : "—"}
			</span>
		</>
	);
}
