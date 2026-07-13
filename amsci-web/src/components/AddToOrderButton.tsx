"use client";

import { useState } from "react";

/**
 * Placeholder "Add To Order" control.
 *
 * On the live B2B site this is login-gated and submits to a real NetSuite Sales
 * Order. In the shell it only acknowledges the click — there is no cart, no auth,
 * and no NetSuite write-back yet.
 */
export function AddToOrderButton({ sku }: { sku: string }) {
	const [added, setAdded] = useState(false);

	return (
		<div className="flex flex-col gap-2">
			<button
				type="button"
				onClick={() => setAdded(true)}
				className="brand-gradient group inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.99]"
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
			{added && (
				<p className="text-center text-xs text-slate-500" role="status">
					{sku} noted — ordering is a placeholder in this preview and will require sign-in.
				</p>
			)}
		</div>
	);
}
