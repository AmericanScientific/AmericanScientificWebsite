"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/cart-context";

type Me = { id: number; email: string; displayName: string; isAdmin?: boolean } | null;
type State = { kind: "loading" } | { kind: "guest" } | { kind: "authed"; user: NonNullable<Me> };

/**
 * Header account control. Resolved client-side (via /api/auth/me) so the header
 * — and therefore every page it appears on — stays statically renderable / ISR
 * cacheable. Guests see Sign In + Request Account; members see their name + a
 * Cart entry point (Sign Out now lives on the My Account page).
 */
export function AccountNav() {
	const [state, setState] = useState<State>({ kind: "loading" });
	const { count, hydrated } = useCart();

	useEffect(() => {
		let alive = true;
		fetch("/api/auth/me", { credentials: "same-origin" })
			.then((r) => r.json() as Promise<{ user: Me }>)
			.then((data) => {
				if (!alive) return;
				setState(data.user ? { kind: "authed", user: data.user } : { kind: "guest" });
			})
			.catch(() => alive && setState({ kind: "guest" }));
		return () => {
			alive = false;
		};
	}, []);

	if (state.kind === "loading") {
		return <div className="h-9 w-24 animate-pulse rounded-full bg-slate-100" aria-hidden />;
	}

	if (state.kind === "authed") {
		const name = state.user.displayName || state.user.email;
		return (
			<div className="flex items-center gap-2 sm:gap-3">
				{state.user.isAdmin && (
					<Link
						href="/admin"
						className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/30 bg-brand-blue/5 px-3 py-2 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue/10"
						title="Account requests (admin)"
					>
						<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
							<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
						</svg>
						<span className="hidden sm:inline">Admin</span>
					</Link>
				)}
				<Link
					href="/account"
					className="hidden max-w-[10rem] truncate rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:inline-flex"
					title={name}
				>
					{name}
				</Link>
				<Link
					href="/cart"
					aria-label={`Order${hydrated && count > 0 ? ` (${count} item${count === 1 ? "" : "s"})` : ""}`}
					className="relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
				>
					<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
						<circle cx="9" cy="20" r="1" />
						<circle cx="18" cy="20" r="1" />
						<path d="M2 3h2.2l1.9 12.1a1 1 0 0 0 1 .9h9.4a1 1 0 0 0 1-.8L20 7H6" />
					</svg>
					<span className="hidden sm:inline">Order</span>
					{hydrated && count > 0 && (
						<span
							className="brand-gradient absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-5 text-white shadow-sm"
							aria-hidden
						>
							{count > 99 ? "99+" : count}
						</span>
					)}
				</Link>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2 sm:gap-3">
			<Link
				href="/login"
				className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:inline-flex"
			>
				Sign In
			</Link>
			<Link
				href="/register"
				className="brand-gradient rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-105"
			>
				Request Account
			</Link>
		</div>
	);
}
