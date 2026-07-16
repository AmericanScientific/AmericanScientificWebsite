"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { AddToOrderButton } from "@/components/AddToOrderButton";

type State =
	| { kind: "loading" }
	| { kind: "guest" }
	| { kind: "authed"; price: number | null; priceLevel: number };

/**
 * Login-gated price block. Prices are never baked into the (ISR-cached, public)
 * product HTML — this client component fetches the viewer's price from the
 * authenticated /api/pricing endpoint after mount. Guests see a sign-in prompt
 * and no price; logged-in customers see their price + "Add To Order".
 */
export function ProductPrice({ sku }: { sku: string }) {
	const [state, setState] = useState<State>({ kind: "loading" });

	useEffect(() => {
		let alive = true;
		fetch(`/api/pricing?sku=${encodeURIComponent(sku)}`, { credentials: "same-origin" })
			.then(async (res) => {
				if (!alive) return;
				if (res.status === 200) {
					const data = (await res.json()) as { price: number | null; priceLevel: number };
					setState({ kind: "authed", price: data.price, priceLevel: data.priceLevel });
				} else {
					setState({ kind: "guest" });
				}
			})
			.catch(() => alive && setState({ kind: "guest" }));
		return () => {
			alive = false;
		};
	}, [sku]);

	const LockIcon = (
		<svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-blue" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
			<rect x="3" y="11" width="18" height="10" rx="2" />
			<path d="M7 11V7a5 5 0 0 1 10 0v4" />
		</svg>
	);

	return (
		<div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			{state.kind === "loading" && (
				<div className="animate-pulse" aria-hidden>
					<div className="h-10 w-40 rounded-lg bg-slate-200" />
					<div className="mt-3 h-4 w-64 rounded bg-slate-100" />
					<div className="mt-5 h-12 w-full rounded-full bg-slate-100" />
				</div>
			)}

			{state.kind === "guest" && (
				<div>
					<div className="flex items-center gap-2">
						{LockIcon}
						<span className="font-display text-lg font-semibold text-slate-900">Sign in to see pricing</span>
					</div>
					<p className="mt-2 text-xs text-slate-500">
						Wholesale pricing is account-specific with quantity breaks. Sign in to see your
						negotiated price and place an order.
					</p>
					<Link
						href="/login"
						className="brand-gradient mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.99]"
					>
						Sign in to your account
					</Link>
				</div>
			)}

			{state.kind === "authed" && (
				<div>
					<div className="flex items-baseline gap-2">
						<span className="font-display text-4xl font-bold tracking-tight text-slate-900">
							{state.price != null ? formatPrice(state.price) : "—"}
						</span>
						<span className="text-sm font-medium text-slate-400">
							{state.price != null ? "your price" : "call for pricing"}
						</span>
					</div>
					<p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
						{LockIcon}
						Account pricing{state.priceLevel > 1 ? ` (tier ${state.priceLevel})` : ""}. Quantity breaks
						applied at order review.
					</p>
					<div className="mt-5">
						<AddToOrderButton sku={sku} />
					</div>
				</div>
			)}
		</div>
	);
}
