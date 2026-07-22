"use client";

import { useEffect, useState } from "react";

/**
 * "Sign in for your account pricing" pill for the category hero.
 *
 * Auth is resolved client-side (via /api/auth/me) so category pages stay static /
 * ISR-cacheable (same pattern as AccountNav / CardPrice). Renders nothing while
 * loading and nothing once signed in — so signed-in members don't see a stale
 * "sign in" prompt. Guests get the pill.
 */
export function AccountPricingBadge() {
	const [guest, setGuest] = useState<boolean | null>(null);

	useEffect(() => {
		let alive = true;
		fetch("/api/auth/me", { credentials: "same-origin" })
			.then((r) => r.json() as Promise<{ user: unknown }>)
			.then((d) => alive && setGuest(!d.user))
			.catch(() => alive && setGuest(true));
		return () => {
			alive = false;
		};
	}, []);

	// null = still loading (render nothing to avoid a flash), false = signed in.
	if (!guest) return null;

	return (
		<span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white/90 ring-1 ring-white/40">
			Sign in for your account pricing
		</span>
	);
}
