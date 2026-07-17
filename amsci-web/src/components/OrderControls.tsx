"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart/cart-context";

/**
 * Quantity stepper + "Add To Order".
 *
 * B2B ordering is by quantity, so a stepper is first-class here. When a
 * `unitPrice` is supplied (logged-in customers, via ProductPrice) we show a
 * live line total (qty × unit). Clicking "Add To Order" pushes the line into the
 * client cart (see cart-context); the cart's submit step is still a placeholder
 * until NetSuite Sales Order write-back is wired.
 *
 * NOTE: American Scientific's NetSuite catalog has no usable quantity-break data
 * (only dirty qty-1/qty-2 rows, no volume schedules — verified 2026-07-17), so
 * the line total is a straight qty × unit and real volume pricing is confirmed
 * by a rep at order review.
 */
export function OrderControls({
	sku,
	unitPrice,
	title,
	imageUrl,
}: {
	sku: string;
	unitPrice?: number | null;
	title?: string;
	imageUrl?: string;
}) {
	const { addItem, flyToCart } = useCart();
	const [qty, setQty] = useState(1);
	const [added, setAdded] = useState(false);

	const hasPrice = typeof unitPrice === "number" && Number.isFinite(unitPrice);
	const lineTotal = hasPrice ? (unitPrice as number) * qty : null;

	function handleAdd() {
		// Cosmetic: fly the currently-shown product photo into the cart icon.
		const media = document.querySelector("[data-hero-media] img") as HTMLImageElement | null;
		if (media) {
			flyToCart({ imgSrc: media.currentSrc || media.src, from: media.getBoundingClientRect() });
		}
		addItem({ sku, title: title ?? sku, imageUrl: imageUrl ?? "" }, qty);
		setAdded(true);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-stretch gap-3">
				<div className="flex items-center rounded-full border border-slate-300 bg-white">
					<button
						type="button"
						aria-label="Decrease quantity"
						onClick={() => {
							setQty((q) => Math.max(1, q - 1));
							setAdded(false);
						}}
						className="flex h-11 w-11 items-center justify-center rounded-l-full text-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
					>
						−
					</button>
					<input
						type="number"
						min={1}
						value={qty}
						onChange={(e) => {
							const n = parseInt(e.target.value, 10);
							setQty(Number.isFinite(n) && n > 0 ? n : 1);
							setAdded(false);
						}}
						aria-label="Quantity"
						className="h-11 w-14 border-x border-slate-200 text-center text-sm font-semibold text-slate-900 [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					/>
					<button
						type="button"
						aria-label="Increase quantity"
						onClick={() => {
							setQty((q) => q + 1);
							setAdded(false);
						}}
						className="flex h-11 w-11 items-center justify-center rounded-r-full text-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
					>
						+
					</button>
				</div>

				<button
					type="button"
					onClick={handleAdd}
					className="brand-gradient group inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.99]"
				>
					{added ? (
						<>
							<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
								<path d="M20 6 9 17l-5-5" />
							</svg>
							Added to Order
						</>
					) : (
						<>
							<svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
								<path d="M12 5v14M5 12h14" />
							</svg>
							Add To Order
						</>
					)}
				</button>
			</div>

			{/* Live line total (qty × unit). Only when a price is known and qty > 1. */}
			{hasPrice && qty > 1 && lineTotal != null && (
				<p className="text-sm text-slate-600">
					{qty} × {formatPrice(unitPrice as number)} ={" "}
					<span className="font-semibold text-slate-900">{formatPrice(lineTotal)}</span>
				</p>
			)}

			{added && (
				<p className="text-xs text-slate-500" role="status">
					Added to your order.{" "}
					<Link href="/cart" className="font-semibold text-brand-blue hover:underline">
						View order →
					</Link>
				</p>
			)}
		</div>
	);
}
