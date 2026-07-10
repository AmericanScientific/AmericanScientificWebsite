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
				className="w-full rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 sm:w-auto"
			>
				Add To Order
			</button>
			{added && (
				<p className="text-sm text-slate-500" role="status">
					{sku} noted — ordering is a placeholder in this preview. Orders will require sign-in.
				</p>
			)}
		</div>
	);
}
