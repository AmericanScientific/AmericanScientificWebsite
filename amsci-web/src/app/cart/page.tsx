"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/cart-context";
import { formatPrice } from "@/lib/format";
import { mediaProxyUrl } from "@/lib/media";

type PriceState =
	| { kind: "loading" }
	| { kind: "guest" }
	| { kind: "ready"; prices: Record<string, number | null> };

/**
 * The order (cart) page. Lists everything added via "Add To Order", with live
 * quantity editing and per-account prices resolved on load (never stored). The
 * submit step is a placeholder until NetSuite Sales Order write-back is wired.
 *
 * Guests are redirected to /login by middleware; the guest branch here is only a
 * defensive fallback (e.g. session expired mid-visit).
 */
export default function CartPage() {
	const { items, setQty, removeItem, clear, hydrated, count } = useCart();
	const [priceState, setPriceState] = useState<PriceState>({ kind: "loading" });
	const [submitted, setSubmitted] = useState(false);

	// Stable key for the set of SKUs in the cart — refetch prices when it changes.
	const skuKey = useMemo(
		() => items.map((i) => i.sku).sort().join("|"),
		[items],
	);

	useEffect(() => {
		if (!hydrated) return;
		const skus = skuKey ? skuKey.split("|") : [];
		if (skus.length === 0) {
			setPriceState({ kind: "ready", prices: {} });
			return;
		}
		let alive = true;
		setPriceState({ kind: "loading" });
		fetch("/api/pricing/bulk", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify({ skus }),
		})
			.then(async (res) => {
				if (!alive) return;
				if (res.status === 401) {
					setPriceState({ kind: "guest" });
					return;
				}
				const data = (await res.json()) as { prices: Record<string, number | null> };
				setPriceState({ kind: "ready", prices: data.prices ?? {} });
			})
			.catch(() => alive && setPriceState({ kind: "guest" }));
		return () => {
			alive = false;
		};
	}, [skuKey, hydrated]);

	const prices = priceState.kind === "ready" ? priceState.prices : {};

	// Subtotal only when every line has a known numeric price.
	const { subtotal, priced } = useMemo(() => {
		let total = 0;
		let allPriced = true;
		for (const it of items) {
			const p = prices[it.sku];
			if (typeof p === "number" && Number.isFinite(p)) total += p * it.qty;
			else allPriced = false;
		}
		return { subtotal: total, priced: allPriced };
	}, [items, prices]);

	if (!hydrated) {
		return (
			<main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
				<div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
				<div className="mt-8 h-40 w-full animate-pulse rounded-2xl bg-slate-100" />
			</main>
		);
	}

	if (items.length === 0) {
		return (
			<main className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
				<div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
						<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
							<circle cx="9" cy="20" r="1" />
							<circle cx="18" cy="20" r="1" />
							<path d="M2 3h2.2l1.9 12.1a1 1 0 0 0 1 .9h9.4a1 1 0 0 0 1-.8L20 7H6" />
						</svg>
					</div>
					<h1 className="mt-5 font-display text-xl font-bold tracking-tight text-slate-900">
						Your order is empty
					</h1>
					<p className="mt-2 text-sm text-slate-500">
						Browse the catalog and use “Add To Order” to build your order.
					</p>
					<Link
						href="/products"
						className="brand-gradient mt-6 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105"
					>
						Browse products
					</Link>
				</div>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
			<div className="flex items-end justify-between gap-4">
				<h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
					Your Order
				</h1>
				<span className="text-sm text-slate-400">
					{count} item{count === 1 ? "" : "s"}
				</span>
			</div>

			<div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
				{/* Line items */}
				<ul className="lg:col-span-2 flex flex-col gap-3">
					{items.map((it) => {
						const src = mediaProxyUrl(it.imageUrl);
						const unit = prices[it.sku];
						const hasPrice = typeof unit === "number" && Number.isFinite(unit);
						return (
							<li
								key={it.sku}
								className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
							>
								<Link
									href={`/product/${it.sku.toLowerCase()}`}
									className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white"
								>
									{src ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img src={src} alt={it.title} className="h-full w-full object-contain p-1.5" loading="lazy" />
									) : (
										<span className="px-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
											{it.sku}
										</span>
									)}
								</Link>

								<div className="flex min-w-0 flex-1 flex-col">
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<Link
												href={`/product/${it.sku.toLowerCase()}`}
												className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-brand-blue"
											>
												{it.title}
											</Link>
											<p className="mt-0.5 text-xs text-slate-400">SKU {it.sku}</p>
										</div>
										<button
											type="button"
											onClick={() => removeItem(it.sku)}
											aria-label={`Remove ${it.title}`}
											className="shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
										>
											<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
												<path d="M18 6 6 18M6 6l12 12" />
											</svg>
										</button>
									</div>

									<div className="mt-auto flex items-end justify-between gap-3 pt-3">
										{/* Row quantity stepper */}
										<div className="flex items-center rounded-full border border-slate-300 bg-white">
											<button
												type="button"
												aria-label="Decrease quantity"
												onClick={() => setQty(it.sku, it.qty - 1)}
												className="flex h-9 w-9 items-center justify-center rounded-l-full text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
											>
												−
											</button>
											<input
												type="number"
												min={1}
												value={it.qty}
												onChange={(e) => {
													const n = parseInt(e.target.value, 10);
													setQty(it.sku, Number.isFinite(n) && n > 0 ? n : 1);
												}}
												aria-label={`Quantity for ${it.title}`}
												className="h-9 w-12 border-x border-slate-200 text-center text-sm font-semibold text-slate-900 [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
											/>
											<button
												type="button"
												aria-label="Increase quantity"
												onClick={() => setQty(it.sku, it.qty + 1)}
												className="flex h-9 w-9 items-center justify-center rounded-r-full text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
											>
												+
											</button>
										</div>

										{/* Price */}
										<div className="text-right">
											{priceState.kind === "loading" ? (
												<span className="inline-block h-5 w-16 animate-pulse rounded bg-slate-100" aria-hidden />
											) : hasPrice ? (
												<>
													<p className="text-sm font-bold text-slate-900">
														{formatPrice((unit as number) * it.qty)}
													</p>
													{it.qty > 1 && (
														<p className="text-xs text-slate-400">
															{formatPrice(unit as number)} each
														</p>
													)}
												</>
											) : (
												<p className="text-xs font-medium text-slate-400">Call for pricing</p>
											)}
										</div>
									</div>
								</div>
							</li>
						);
					})}

					<div className="mt-1 flex items-center justify-between">
						<Link href="/products" className="text-sm font-medium text-slate-500 hover:text-slate-800">
							← Continue shopping
						</Link>
						<button
							type="button"
							onClick={clear}
							className="text-sm font-medium text-slate-400 hover:text-slate-700"
						>
							Clear order
						</button>
					</div>
				</ul>

				{/* Summary */}
				<aside className="lg:col-span-1">
					<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
						<h2 className="font-display text-lg font-semibold text-slate-900">Order summary</h2>

						<dl className="mt-4 space-y-2 text-sm">
							<div className="flex justify-between">
								<dt className="text-slate-500">Items</dt>
								<dd className="font-medium text-slate-900">{count}</dd>
							</div>
							<div className="flex justify-between border-t border-slate-100 pt-3">
								<dt className="text-slate-500">Subtotal</dt>
								<dd className="font-bold text-slate-900">
									{priceState.kind === "loading"
										? "…"
										: priced
											? formatPrice(subtotal)
											: "See order review"}
								</dd>
							</div>
						</dl>

						{!priced && priceState.kind === "ready" && (
							<p className="mt-2 text-xs text-slate-400">
								Some lines are priced on request; your rep will confirm those.
							</p>
						)}

						{priceState.kind === "guest" ? (
							<Link
								href="/login?next=/cart"
								className="brand-gradient mt-5 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105"
							>
								Sign in to see pricing
							</Link>
						) : submitted ? (
							<div className="mt-5 rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4 text-sm text-slate-700">
								<p className="font-semibold text-slate-900">Order request noted</p>
								<p className="mt-1 text-xs text-slate-500">
									Online order submission isn’t live yet — this is a preview. To place this order
									today, contact your account rep at office@american-scientific.com or
									888-490-9002. NetSuite order submission is coming soon.
								</p>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setSubmitted(true)}
								className="brand-gradient mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.99]"
							>
								Submit order request
							</button>
						)}

						<p className="mt-4 text-center text-xs text-slate-400">
							Orders are reviewed by an account rep. Volume pricing confirmed at review.
						</p>
					</div>
				</aside>
			</div>
		</main>
	);
}
