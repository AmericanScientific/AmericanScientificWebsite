"use client";

import { useState } from "react";

const MIN_LEN = 10;

/**
 * Self-service password change for a signed-in customer, on /account.
 *
 * Collapsed behind a disclosure button by default: the account page is mostly
 * read-at-a-glance, and three password fields sitting open on it make changing
 * one look like something you're expected to do.
 */
export function ChangePasswordForm() {
	const [open, setOpen] = useState(false);
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	function reset() {
		setCurrent("");
		setNext("");
		setConfirm("");
		setError(null);
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		if (next.length < MIN_LEN) {
			setError(`Your new password must be at least ${MIN_LEN} characters.`);
			return;
		}
		if (next !== confirm) {
			setError("Those new passwords don't match.");
			return;
		}
		setBusy(true);
		try {
			const res = await fetch("/api/auth/change-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify({ currentPassword: current, newPassword: next }),
			});
			const data = (await res.json().catch(() => ({}))) as {
				error?: string;
				otherSessionsRevoked?: number;
			};
			if (!res.ok) {
				setError(data.error ?? "Could not change your password. Please try again.");
				setBusy(false);
				return;
			}
			// Say whether other devices were signed out — it's the one visible
			// consequence of this action, and silence about it invites "wait, am I
			// still logged in on the shop iPad?"
			const revoked = data.otherSessionsRevoked ?? 0;
			setDone(
				revoked > 0
					? `Password changed. We also signed you out on ${revoked} other ${revoked === 1 ? "device" : "devices"}.`
					: "Password changed.",
			);
			reset();
			setOpen(false);
			setBusy(false);
		} catch {
			setError("Network error. Please try again.");
			setBusy(false);
		}
	}

	const inputCls =
		"mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

	if (!open) {
		return (
			<div className="mt-8">
				{done && (
					<div role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
						{done}
					</div>
				)}
				<button
					type="button"
					onClick={() => {
						setDone(null);
						setOpen(true);
					}}
					className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
				>
					Change password
				</button>
			</div>
		);
	}

	return (
		<form
			onSubmit={onSubmit}
			className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
			noValidate
		>
			<h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Change password</h2>
			<p className="mt-1 text-sm text-slate-500">
				You&apos;ll stay signed in here. Any other device will be signed out.
			</p>

			<div className="mt-5 space-y-4">
				{error && (
					<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
						{error}
					</div>
				)}
				<div>
					<label htmlFor="cpw-current" className="block text-sm font-medium text-slate-700">
						Current password
					</label>
					<input
						id="cpw-current"
						type="password"
						autoComplete="current-password"
						required
						value={current}
						onChange={(e) => setCurrent(e.target.value)}
						className={inputCls}
					/>
				</div>
				<div>
					<label htmlFor="cpw-new" className="block text-sm font-medium text-slate-700">
						New password
					</label>
					<input
						id="cpw-new"
						type="password"
						autoComplete="new-password"
						required
						value={next}
						onChange={(e) => setNext(e.target.value)}
						className={inputCls}
					/>
					<p className="mt-1 text-xs text-slate-400">At least {MIN_LEN} characters.</p>
				</div>
				<div>
					<label htmlFor="cpw-confirm" className="block text-sm font-medium text-slate-700">
						Confirm new password
					</label>
					<input
						id="cpw-confirm"
						type="password"
						autoComplete="new-password"
						required
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
						className={inputCls}
					/>
				</div>
			</div>

			<div className="mt-6 flex items-center gap-3">
				<button
					type="submit"
					disabled={busy}
					className="brand-gradient inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
				>
					{busy ? "Saving…" : "Save new password"}
				</button>
				<button
					type="button"
					onClick={() => {
						reset();
						setOpen(false);
					}}
					className="rounded-full px-4 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-800"
				>
					Cancel
				</button>
			</div>
		</form>
	);
}
