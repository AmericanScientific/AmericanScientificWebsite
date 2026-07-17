"use client";

import { useState } from "react";

export interface PendingUser {
	id: number;
	name: string;
	email: string;
	company: string;
	phone: string;
	address: string;
	accountType: string;
	createdAt: string;
}

const PRICE_LEVELS = [
	{ value: 1, label: "Tier 1 — Base / list" },
	{ value: 2, label: "Tier 2" },
	{ value: 3, label: "Tier 3" },
	{ value: 4, label: "Tier 4" },
	{ value: 7, label: "Tier 7" },
	{ value: 8, label: "Tier 8" },
];

/** Interactive queue of pending account requests with approve (set tier) / deny. */
export function AdminPendingList({ initial }: { initial: PendingUser[] }) {
	const [rows, setRows] = useState(initial);

	if (rows.length === 0) {
		return (
			<div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
				No pending account requests. 🎉
			</div>
		);
	}

	return (
		<ul className="flex flex-col gap-4">
			{rows.map((u) => (
				<AdminRow key={u.id} user={u} onResolved={() => setRows((r) => r.filter((x) => x.id !== u.id))} />
			))}
		</ul>
	);
}

function AdminRow({ user, onResolved }: { user: PendingUser; onResolved: () => void }) {
	const [level, setLevel] = useState(1);
	const [busy, setBusy] = useState<null | "approve" | "deny">(null);
	const [error, setError] = useState<string | null>(null);

	async function act(action: "approve" | "deny") {
		setBusy(action);
		setError(null);
		try {
			const res = await fetch("/api/admin/user", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: user.id, action, priceLevel: level }),
			});
			if (!res.ok) {
				const j = (await res.json().catch(() => ({}))) as { error?: string };
				setError(j.error ?? "Action failed.");
				setBusy(null);
				return;
			}
			onResolved();
		} catch {
			setError("Network error.");
			setBusy(null);
		}
	}

	return (
		<li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="font-semibold text-slate-900">{user.name || "—"}</p>
					<p className="text-sm text-slate-500">{user.email}</p>
				</div>
				<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
					{user.accountType || "—"}
				</span>
			</div>

			<dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
				<div className="flex gap-2">
					<dt className="font-medium text-slate-400">Company</dt>
					<dd className="text-slate-800">{user.company || "—"}</dd>
				</div>
				<div className="flex gap-2">
					<dt className="font-medium text-slate-400">Phone</dt>
					<dd className="text-slate-800">{user.phone || "—"}</dd>
				</div>
				<div className="flex gap-2 sm:col-span-2">
					<dt className="font-medium text-slate-400">Address</dt>
					<dd className="whitespace-pre-line text-slate-800">{user.address || "—"}</dd>
				</div>
			</dl>

			<div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
				<label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor={`lvl-${user.id}`}>
					Price tier
				</label>
				<select
					id={`lvl-${user.id}`}
					value={level}
					onChange={(e) => setLevel(Number(e.target.value))}
					disabled={busy !== null}
					className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
				>
					{PRICE_LEVELS.map((p) => (
						<option key={p.value} value={p.value}>{p.label}</option>
					))}
				</select>

				<div className="ml-auto flex items-center gap-2">
					<button
						type="button"
						onClick={() => act("deny")}
						disabled={busy !== null}
						className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
					>
						{busy === "deny" ? "Denying…" : "Deny"}
					</button>
					<button
						type="button"
						onClick={() => act("approve")}
						disabled={busy !== null}
						className="brand-gradient rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-105 disabled:opacity-60"
					>
						{busy === "approve" ? "Approving…" : "Approve"}
					</button>
				</div>
			</div>

			{error && <p className="mt-3 text-sm text-red-600">{error}</p>}
		</li>
	);
}
