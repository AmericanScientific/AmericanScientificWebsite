"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const MIN_LEN = 10;

export function SetPasswordForm() {
	const router = useRouter();
	const params = useSearchParams();
	const token = params.get("token") ?? "";
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState<null | "loggedIn" | "pending">(null);
	const [busy, setBusy] = useState(false);

	if (!token) {
		return (
			<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				This link is missing its token. Please use the link from your email, or{" "}
				<Link href="/login" className="font-semibold underline">request a new one</Link>.
			</div>
		);
	}

	if (done) {
		return (
			<div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
				<p className="font-semibold">Password set.</p>
				{done === "loggedIn" ? (
					<p className="mt-1">You&apos;re all set — redirecting you now…</p>
				) : (
					<p className="mt-1">Your account is still awaiting approval; we&apos;ll email you once it&apos;s active.</p>
				)}
			</div>
		);
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		if (password.length < MIN_LEN) {
			setError(`Password must be at least ${MIN_LEN} characters.`);
			return;
		}
		if (password !== confirm) {
			setError("Passwords don't match.");
			return;
		}
		setBusy(true);
		try {
			const res = await fetch("/api/auth/set-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify({ token, password }),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string; loggedIn?: boolean };
			if (!res.ok) {
				setError(data.error ?? "Could not set your password. The link may have expired.");
				setBusy(false);
				return;
			}
			if (data.loggedIn) {
				setDone("loggedIn");
				setTimeout(() => {
					router.push("/account");
					router.refresh();
				}, 900);
			} else {
				setDone("pending");
			}
		} catch {
			setError("Network error. Please try again.");
			setBusy(false);
		}
	}

	const inputCls =
		"mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

	return (
		<form onSubmit={onSubmit} className="space-y-4" noValidate>
			{error && (
				<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</div>
			)}
			<div>
				<label htmlFor="pw" className="block text-sm font-medium text-slate-700">New password</label>
				<input id="pw" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
				<p className="mt-1 text-xs text-slate-400">At least {MIN_LEN} characters.</p>
			</div>
			<div>
				<label htmlFor="pw2" className="block text-sm font-medium text-slate-700">Confirm password</label>
				<input id="pw2" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
			</div>
			<button
				type="submit"
				disabled={busy}
				className="brand-gradient inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
			>
				{busy ? "Saving…" : "Set password"}
			</button>
		</form>
	);
}
