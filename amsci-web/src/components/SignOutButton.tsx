"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/cart-context";

/**
 * Sign-out control. Lives on the My Account page (moved out of the header, which
 * now shows the Order/cart entry point in its place). Ends the server session,
 * clears the local cart, then does a full reload so every auth-dependent client
 * component (header + price blocks, which cache their own state) re-reads a clean
 * guest session.
 */
export function SignOutButton() {
	const { clear } = useCart();
	const [busy, setBusy] = useState(false);

	async function signOut() {
		setBusy(true);
		try {
			await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
		} catch {
			// Even if the network call fails, drop local state and send them home.
		}
		clear();
		window.location.assign("/");
	}

	return (
		<button
			type="button"
			onClick={signOut}
			disabled={busy}
			className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
		>
			<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
				<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
				<path d="m16 17 5-5-5-5" />
				<path d="M21 12H9" />
			</svg>
			{busy ? "Signing out…" : "Sign Out"}
		</button>
	);
}
