"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Local-path-only redirect target (prevents open-redirect via ?next=). */
function safeNext(next: string | null): string {
	if (next && next.startsWith("/") && !next.startsWith("//")) return next;
	return "/";
}

export function LoginForm() {
	const router = useRouter();
	const params = useSearchParams();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setBusy(true);
		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify({ email, password }),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) {
				setError(data.error ?? "Sign in failed. Please try again.");
				setBusy(false);
				return;
			}
			const dest = safeNext(params.get("next"));
			router.push(dest);
			router.refresh();
		} catch {
			setError("Network error. Please try again.");
			setBusy(false);
		}
	}

	return (
		<form onSubmit={onSubmit} className="space-y-4" noValidate>
			{error && (
				<div
					role="alert"
					className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
				>
					{error}
				</div>
			)}
			<div>
				<label htmlFor="email" className="block text-sm font-medium text-slate-700">
					Email
				</label>
				<input
					id="email"
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
				/>
			</div>
			<div>
				<label htmlFor="password" className="block text-sm font-medium text-slate-700">
					Password
				</label>
				<input
					id="password"
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
				/>
			</div>
			<button
				type="submit"
				disabled={busy}
				className="brand-gradient inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
			>
				{busy ? "Signing in…" : "Sign in"}
			</button>
		</form>
	);
}
