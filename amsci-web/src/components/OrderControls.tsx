"use client";

import { useState } from "react";

/**
 * Quantity input + "Add To Order" placeholder.
 *
 * B2B ordering has quantity breaks (CLAUDE.md §2), so quantity is first-class
 * here. On the live site this submits a NetSuite Sales Order line and is
 * login-gated; in the shell it only acknowledges the click.
 */
export function OrderControls({ sku }: { sku: string }) {
	const [qty, setQty] = useState(1);
	const [added, setAdded] = useState(false);

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
					onClick={() => setAdded(true)}
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

			{added && (
				<p className="text-xs text-slate-500" role="status">
					{qty} × {sku} noted — ordering is a placeholder in this preview and will require sign-in.
				</p>
			)}
		</div>
	);
}
