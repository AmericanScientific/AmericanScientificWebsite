"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Local-path-only redirect target (prevents open-redirect via ?next=). */
function safeNext(next: string | null): string {
	if (next && next.startsWith("/") && !next.startsWith("//")) return next;
	return "/";
}

type Mode = "signin" | "request";

export function LoginForm() {
	const router = useRouter();
	const params = useSearchParams();
	const [mode, setMode] = useState<Mode>("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [devLink, setDevLink] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function onSignIn(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setNotice(null);
		setBusy(true);
		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify({ email, password }),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string; mustSetup?: boolean };
			if (res.ok) {
				router.push(safeNext(params.get("next")));
				router.refresh();
				return;
			}
			if (data.mustSetup) {
				// Migrated account: switch to the "email me a link" flow.
				setMode("request");
				setNotice(
					"Welcome back! For the new site you'll need to set a new password. Enter your email and we'll send you a secure link.",
				);
				setBusy(false);
				return;
			}
			setError(data.error ?? "Sign in failed. Please try again.");
			setBusy(false);
		} catch {
			setError("Network error. Please try again.");
			setBusy(false);
		}
	}

	async function onRequest(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setNotice(null);
		setDevLink(null);
		setBusy(true);
		try {
			const res = await fetch("/api/auth/request-setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify({ email }),
			});
			const data = (await res.json().catch(() => ({}))) as { message?: string; devLink?: string };
			setNotice(data.message ?? "If that email has an account, we've sent a link to set your password.");
			if (data.devLink) setDevLink(data.devLink);
		} catch {
			setError("Network error. Please try again.");
		}
		setBusy(false);
	}

	const inputCls =
		"mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
	const btnCls =
		"brand-gradient inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

	return (
		<div className="space-y-4">
			{error && (
				<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</div>
			)}
			{notice && (
				<div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
					{notice}
					{devLink && (
						<>
							<br />
							<a href={devLink} className="mt-1 inline-block break-all font-semibold underline">
								{devLink}
							</a>
							<span className="mt-1 block text-xs text-blue-500">(dev link — shown only when email isn&apos;t configured)</span>
						</>
					)}
				</div>
			)}

			{mode === "signin" ? (
				<form onSubmit={onSignIn} className="space-y-4" noValidate>
					<div>
						<label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
						<input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
					</div>
					<div>
						<label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
						<input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
					</div>
					<button type="submit" disabled={busy} className={btnCls}>{busy ? "Signing in…" : "Sign in"}</button>
					<button
						type="button"
						onClick={() => { setMode("request"); setError(null); setNotice(null); }}
						className="w-full text-center text-sm font-medium text-brand-blue hover:underline"
					>
						First time here, or forgot your password?
					</button>
				</form>
			) : (
				<form onSubmit={onRequest} className="space-y-4" noValidate>
					<p className="text-sm text-slate-500">
						Enter your email and we&apos;ll send you a secure link to set your password.
					</p>
					<div>
						<label htmlFor="reqemail" className="block text-sm font-medium text-slate-700">Email</label>
						<input id="reqemail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
					</div>
					<button type="submit" disabled={busy} className={btnCls}>{busy ? "Sending…" : "Email me a link"}</button>
					<button
						type="button"
						onClick={() => { setMode("signin"); setError(null); setNotice(null); setDevLink(null); }}
						className="w-full text-center text-sm font-medium text-brand-blue hover:underline"
					>
						Back to sign in
					</button>
				</form>
			)}
		</div>
	);
}
