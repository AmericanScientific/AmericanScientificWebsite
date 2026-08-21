"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart, type CartItem } from "@/lib/cart/cart-context";

interface Unavailable {
	sku: string;
	title: string;
	qty: number;
}

type State =
	| { kind: "working" }
	| { kind: "done"; added: number; skipped: number; unavailable: Unavailable[] }
	| { kind: "failed"; reason: string };

const MESSAGES: Record<string, string> = {
	empty: "This link is missing its code. Please use the full link from the email.",
	not_found: "We could not find a saved cart for this link.",
	expired: "This link has expired. Contact us and we will send a new one.",
	malformed: "Something is wrong with this saved cart. Please contact us.",
	unavailable: "We could not reach the cart service. Please try again shortly.",
	network: "We could not reach the server. Please check your connection and try again.",
};

export function RestoreCart() {
	const params = useSearchParams();
	const token = params.get("token") ?? "";
	const { mergeItems, hydrated } = useCart();
	const [state, setState] = useState<State>({ kind: "working" });

	// Restore exactly once. Without this, React's development double-effect (and
	// any re-render from the cart updating) would run the whole thing again.
	const ran = useRef(false);

	useEffect(() => {
		// Wait for localStorage to load first. Merging into the pre-hydrate empty
		// cart would look like it worked, then get overwritten by the stored cart.
		if (!hydrated || ran.current) return;
		ran.current = true;

		let cancelled = false;

		(async () => {
			try {
				const res = await fetch(`/api/cart/recover?token=${encodeURIComponent(token)}`);
				const data = (await res.json().catch(() => ({}))) as {
					ok?: boolean;
					reason?: string;
					items?: CartItem[];
					unavailable?: Unavailable[];
				};
				if (cancelled) return;

				if (!res.ok || !data.ok || !Array.isArray(data.items)) {
					setState({ kind: "failed", reason: data.reason ?? "not_found" });
					return;
				}

				const added = mergeItems(data.items);
				setState({
					kind: "done",
					added,
					skipped: data.items.length - added,
					unavailable: data.unavailable ?? [],
				});
			} catch {
				if (!cancelled) setState({ kind: "failed", reason: "network" });
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [hydrated, token, mergeItems]);

	if (state.kind === "working") {
		return <p className="text-sm text-slate-500">One moment, restoring your items.</p>;
	}

	if (state.kind === "failed") {
		return (
			<div>
				<p className="text-sm font-semibold text-slate-900">We could not restore this cart</p>
				<p className="mt-2 text-sm text-slate-600">{MESSAGES[state.reason] ?? MESSAGES.not_found}</p>
				<p className="mt-4 text-sm text-slate-600">
					Call us on 888-490-9002 or email office@american-scientific.com and we will sort it out.
				</p>
				<Link
					href="/products"
					className="mt-6 inline-block rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-deep"
				>
					Browse the catalog
				</Link>
			</div>
		);
	}

	return (
		<div>
			<p className="text-sm font-semibold text-slate-900">
				{state.added > 0
					? `${state.added} ${state.added === 1 ? "item is" : "items are"} back in your cart.`
					: "Your cart already had these items."}
			</p>

			{state.skipped > 0 && (
				<p className="mt-2 text-sm text-slate-600">
					{state.skipped} {state.skipped === 1 ? "item was" : "items were"} already in your cart, so we left{" "}
					{state.skipped === 1 ? "it" : "them"} at the quantity you have now.
				</p>
			)}

			{state.unavailable.length > 0 && (
				<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
					<p className="text-sm font-semibold text-amber-900">
						{state.unavailable.length} {state.unavailable.length === 1 ? "item is" : "items are"} no longer
						available
					</p>
					<ul className="mt-2 space-y-1 text-sm text-amber-800">
						{state.unavailable.map((u) => (
							<li key={u.sku}>
								{u.title || u.sku} <span className="text-amber-700">({u.sku}, qty {u.qty})</span>
							</li>
						))}
					</ul>
					<p className="mt-2 text-xs text-amber-800">
						Call us on 888-490-9002 and we will find you an equivalent.
					</p>
				</div>
			)}

			<Link
				href="/cart"
				className="mt-6 inline-block rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-deep"
			>
				View your cart
			</Link>
		</div>
	);
}
