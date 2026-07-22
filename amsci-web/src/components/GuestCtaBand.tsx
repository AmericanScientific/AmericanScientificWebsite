"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Homepage "Ready to order at your account price?" CTA band. Shown ONLY to
 * guests — auth resolved client-side (via /api/auth/me), same pattern as
 * AccountNav / AccountPricingBadge, so the homepage stays static/ISR. Renders
 * nothing while loading or when signed in.
 */
export function GuestCtaBand() {
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

	if (!guest) return null;

	return (
		<section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
			<div className="hero-surface relative overflow-hidden rounded-3xl px-8 py-12 text-center sm:px-16 sm:py-16">
				<div className="grid-overlay absolute inset-0" />
				<div className="relative mx-auto max-w-2xl">
					<h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
						Ready to order at your account price?
					</h2>
					<p className="mt-4 text-slate-300">
						Create a wholesale account to unlock tiered pricing, quantity breaks, and
						purchase-order checkout. Guests can browse; pricing is account-specific.
					</p>
					<div className="mt-8 flex flex-wrap justify-center gap-3">
						<Link
							href="/register"
							className="brand-gradient rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-105"
						>
							Request an Account
						</Link>
						<Link
							href="/login"
							className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
						>
							Sign In
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
