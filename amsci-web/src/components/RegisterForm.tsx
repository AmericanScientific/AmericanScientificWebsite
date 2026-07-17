"use client";

import { useState } from "react";
import Link from "next/link";
import { TurnstileWidget } from "@/components/TurnstileWidget";

const INPUT =
	"w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20";
const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500";

/**
 * Public account-request form. Collects the same details the old Gravity Forms
 * signup did (plus a password the applicant chooses), gated by Turnstile when
 * configured. Submits to /api/auth/register, which creates a pending account and
 * notifies the team. On success we show a confirmation — no auto-login (the
 * account must be approved first).
 */
export function RegisterForm({ siteKey }: { siteKey: string | null }) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState<string | null>(null);
	const [token, setToken] = useState("");

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		const form = e.currentTarget;
		const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

		if ((data.password ?? "").length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}
		if (data.password !== data.confirmPassword) {
			setError("Passwords don't match.");
			return;
		}
		if (siteKey && !token) {
			setError("Please complete the verification challenge.");
			return;
		}

		setBusy(true);
		try {
			const res = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...data, turnstileToken: token }),
			});
			// The response may not be JSON (e.g. an HTML 500) — parse defensively so a
			// server error doesn't get reported as a "network error".
			let json: { ok?: boolean; message?: string; error?: string } = {};
			try {
				json = await res.json();
			} catch {
				/* non-JSON body */
			}
			if (!res.ok) {
				setError(json.error ?? `Something went wrong (error ${res.status}). Please try again.`);
				return;
			}
			setDone(json.message ?? "Your request has been received.");
			form.reset();
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setBusy(false);
		}
	}

	if (done) {
		return (
			<div className="rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-6 text-center">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-blue shadow-sm">
					<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
						<path d="M20 6 9 17l-5-5" />
					</svg>
				</div>
				<h2 className="mt-4 font-display text-lg font-bold text-slate-900">Request received</h2>
				<p className="mt-2 text-sm text-slate-600">{done}</p>
				<Link href="/" className="mt-5 inline-block text-sm font-semibold text-brand-blue hover:underline">
					Back to home
				</Link>
			</div>
		);
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-5">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label className={LABEL} htmlFor="name">Full name</label>
					<input id="name" name="name" required autoComplete="name" className={INPUT} />
				</div>
				<div>
					<label className={LABEL} htmlFor="email">Email</label>
					<input id="email" name="email" type="email" required autoComplete="email" className={INPUT} />
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label className={LABEL} htmlFor="company">Company / organization</label>
					<input id="company" name="company" required autoComplete="organization" className={INPUT} />
				</div>
				<div>
					<label className={LABEL} htmlFor="phone">Phone</label>
					<input id="phone" name="phone" type="tel" required autoComplete="tel" className={INPUT} />
				</div>
			</div>

			<div>
				<label className={LABEL} htmlFor="addressLine1">Street address</label>
				<input id="addressLine1" name="addressLine1" required autoComplete="address-line1" className={INPUT} />
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
				<div className="sm:col-span-2">
					<label className={LABEL} htmlFor="city">City</label>
					<input id="city" name="city" required autoComplete="address-level2" className={INPUT} />
				</div>
				<div>
					<label className={LABEL} htmlFor="state">State</label>
					<input id="state" name="state" required autoComplete="address-level1" className={INPUT} />
				</div>
				<div>
					<label className={LABEL} htmlFor="zip">ZIP</label>
					<input id="zip" name="zip" required autoComplete="postal-code" className={INPUT} />
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label className={LABEL} htmlFor="accountType">I am a…</label>
					<select id="accountType" name="accountType" required defaultValue="" className={INPUT}>
						<option value="" disabled>Select one…</option>
						<option value="Educator">Educator</option>
						<option value="Distributor">Distributor</option>
					</select>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label className={LABEL} htmlFor="password">Password</label>
					<input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className={INPUT} />
				</div>
				<div>
					<label className={LABEL} htmlFor="confirmPassword">Confirm password</label>
					<input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className={INPUT} />
				</div>
			</div>

			{siteKey && <TurnstileWidget siteKey={siteKey} onToken={setToken} />}

			{error && (
				<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
					{error}
				</p>
			)}

			<button
				type="submit"
				disabled={busy}
				className="brand-gradient inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
			>
				{busy ? "Submitting…" : "Request an account"}
			</button>

			<p className="text-center text-xs text-slate-500">
				Already have an account?{" "}
				<Link href="/login" className="font-semibold text-brand-blue hover:underline">
					Sign in
				</Link>
			</p>
		</form>
	);
}
