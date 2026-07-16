"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Me = { id: number; email: string; displayName: string } | null;
type State = { kind: "loading" } | { kind: "guest" } | { kind: "authed"; user: NonNullable<Me> };

/**
 * Header account control. Resolved client-side (via /api/auth/me) so the header
 * — and therefore every page it appears on — stays statically renderable / ISR
 * cacheable. Guests see Sign In + Request Account; members see their name + Sign
 * Out.
 */
export function AccountNav() {
	const [state, setState] = useState<State>({ kind: "loading" });
	const router = useRouter();

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

	async function signOut() {
		await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
		setState({ kind: "guest" });
		router.refresh();
	}

	if (state.kind === "loading") {
		return <div className="h-9 w-24 animate-pulse rounded-full bg-slate-100" aria-hidden />;
	}

	if (state.kind === "authed") {
		const name = state.user.displayName || state.user.email;
		return (
			<div className="flex items-center gap-2 sm:gap-3">
				<Link
					href="/account"
					className="hidden max-w-[10rem] truncate rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:inline-flex"
					title={name}
				>
					{name}
				</Link>
				<button
					type="button"
					onClick={signOut}
					className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
				>
					Sign Out
				</button>
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
				href="/login"
				className="brand-gradient rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-105"
			>
				Request Account
			</Link>
		</div>
	);
}
