"use client";

import { useState } from "react";

/**
 * PHYWE "Connect with a Product Advisor" lead form. Posts to /api/phywe-lead,
 * which emails the team. Mirrors the old Gravity Form #8. Styled to match the
 * new site (slate inputs, brand-gradient submit); dark-surface variant since it
 * sits on the light advisor card.
 */
const INPUT =
	"w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20";
const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500";

export function PhyweLeadForm() {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		const form = e.currentTarget;
		const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
		setBusy(true);
		try {
			const res = await fetch("/api/phywe-lead", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			let json: { ok?: boolean; message?: string; error?: string } = {};
			try {
				json = await res.json();
			} catch {
				/* non-JSON */
			}
			if (!res.ok) {
				setError(json.error ?? `Something went wrong (error ${res.status}). Please try again.`);
				return;
			}
			setDone(json.message ?? "Thanks! Our team will follow up within one business day.");
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
				<p className="mt-4 text-sm text-slate-600">{done}</p>
			</div>
		);
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-4">
			{/* Honeypot — hidden from users, catches bots. */}
			<input
				type="text"
				name="company"
				tabIndex={-1}
				autoComplete="off"
				aria-hidden="true"
				className="absolute left-[-9999px] h-0 w-0 opacity-0"
			/>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label className={LABEL} htmlFor="phywe-name">Name</label>
					<input id="phywe-name" name="name" required autoComplete="name" className={INPUT} />
				</div>
				<div>
					<label className={LABEL} htmlFor="phywe-email">Email</label>
					<input id="phywe-email" name="email" type="email" required autoComplete="email" className={INPUT} />
				</div>
			</div>
			<div>
				<label className={LABEL} htmlFor="phywe-phone">Phone <span className="text-slate-400 normal-case">(optional)</span></label>
				<input id="phywe-phone" name="phone" type="tel" autoComplete="tel" className={INPUT} />
			</div>
			<div>
				<label className={LABEL} htmlFor="phywe-message">Message</label>
				<textarea id="phywe-message" name="message" rows={4} className={INPUT} placeholder="Tell us which PHYWE systems or Nobel Prize experiment sets you're interested in." />
			</div>

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
				{busy ? "Sending…" : "Connect with a Product Advisor"}
			</button>
		</form>
	);
}
