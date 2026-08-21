"use client";

import { useState } from "react";
import { PRICE_LEVEL_HELP, withCurrentLevel } from "@/lib/price-levels";

/**
 * One account in the admin directory.
 *
 * `createdLabel` arrives preformatted from the server: formatting a date in a
 * client component would render one string during SSR and a possibly different
 * one after hydration (locale/timezone), which React reports as a mismatch.
 */
export interface AccountListRow {
	id: number;
	name: string;
	email: string;
	company: string;
	accountType: string;
	status: string | null;
	priceLevel: number;
	isAdmin: boolean;
	/** Migrated from WordPress vs created through /register. */
	migrated: boolean;
	/** Has set a password on the new site, so can actually sign in. */
	hasSetPassword: boolean;
	createdLabel: string;
}

export function AdminAccountsTable({ rows }: { rows: AccountListRow[] }) {
	if (rows.length === 0) {
		return (
			<div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
				No accounts match these filters.
			</div>
		);
	}

	return (
		// The table is wider than a phone; it scrolls in its own container so the
		// page body never scrolls sideways.
		<div>
		<div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
			<table className="w-full min-w-[54rem] border-collapse text-sm">
				<thead>
					<tr className="border-b border-slate-200 bg-slate-50/70 text-left">
						<Th>Account</Th>
						<Th>Origin</Th>
						<Th>Status</Th>
						<Th>Password</Th>
						<Th>Price tier</Th>
						<Th>Registered</Th>
					</tr>
				</thead>
				<tbody>
					{rows.map((r) => (
						<Row key={r.id} row={r} />
					))}
				</tbody>
			</table>
		</div>
		<p className="mt-2 px-1 text-xs text-slate-500">{PRICE_LEVEL_HELP}</p>
		</div>
	);
}

function Th({ children }: { children: React.ReactNode }) {
	return (
		<th scope="col" className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
			{children}
		</th>
	);
}

function Row({ row }: { row: AccountListRow }) {
	const [level, setLevel] = useState(row.priceLevel);
	const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
	const [error, setError] = useState<string | null>(null);

	async function changeTier(next: number) {
		const previous = level;
		setLevel(next);
		setState("saving");
		setError(null);
		try {
			const res = await fetch("/api/admin/user", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: row.id, action: "set-tier", priceLevel: next }),
			});
			if (!res.ok) {
				const j = (await res.json().catch(() => ({}))) as { error?: string };
				// Put the control back to the truth we last knew.
				setLevel(previous);
				setError(j.error ?? "Could not change the tier.");
				setState("idle");
				return;
			}
			setState("saved");
		} catch {
			setLevel(previous);
			setError("Network error.");
			setState("idle");
		}
	}

	return (
		<tr className="border-b border-slate-100 last:border-0 align-top hover:bg-slate-50/60">
			<td className="px-4 py-3">
				<div className="flex items-center gap-2">
					<span className="font-semibold text-slate-900">{row.name || "—"}</span>
					{row.isAdmin && (
						<span className="rounded bg-brand-plum/10 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-brand-plum">
							Admin
						</span>
					)}
				</div>
				<div className="text-slate-500">{row.email}</div>
				{row.company && <div className="mt-0.5 text-xs text-slate-400">{row.company}</div>}
			</td>

			<td className="whitespace-nowrap px-4 py-3">
				<Badge tone={row.migrated ? "neutral" : "info"}>{row.migrated ? "Migrated" : "Signed up"}</Badge>
				{row.accountType && <div className="mt-1 text-xs text-slate-400">{row.accountType}</div>}
			</td>

			<td className="whitespace-nowrap px-4 py-3">
				<StatusBadge status={row.status} />
			</td>

			<td className="whitespace-nowrap px-4 py-3">
				{row.hasSetPassword ? (
					<Badge tone="good">Set</Badge>
				) : (
					<>
						<Badge tone="warn">Awaiting setup</Badge>
						{/*
						 * Only offered where the server will actually allow it: a pending
						 * account needs approving (which sends its own email) and a denied
						 * one has nothing to set up, so both would be refused.
						 */}
						{row.status !== "pending" && row.status !== "denied" && (
							<ResendSetupLink userId={row.id} email={row.email} />
						)}
					</>
				)}
			</td>

			<td className="whitespace-nowrap px-4 py-3">
				<div className="flex items-center gap-2">
					<label className="sr-only" htmlFor={`tier-${row.id}`}>
						Price tier for {row.email}
					</label>
					<select
						id={`tier-${row.id}`}
						value={level}
						onChange={(e) => changeTier(Number(e.target.value))}
						disabled={state === "saving"}
						className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:opacity-60"
					>
						{withCurrentLevel(level).map((p) => (
							<option key={p.value} value={p.value} title={p.description}>
								{p.label}
							</option>
						))}
					</select>
					{state === "saving" && <span className="text-xs text-slate-400">Saving…</span>}
					{state === "saved" && <span className="text-xs font-semibold text-emerald-600">Saved</span>}
				</div>
				{error && <p className="mt-1 text-xs text-red-600">{error}</p>}
			</td>

			<td className="whitespace-nowrap px-4 py-3 text-slate-500 tabular-nums">{row.createdLabel}</td>
		</tr>
	);
}

/**
 * Re-send the one-time password setup link to someone who hasn't completed it.
 *
 * Deliberately two-step: this sends real mail to a real customer, and the button
 * sits in a dense table of 50 rows where a mis-click is easy. Nothing leaves the
 * browser until the confirm is pressed.
 */
function ResendSetupLink({ userId, email }: { userId: number; email: string }) {
	const [phase, setPhase] = useState<"idle" | "confirm" | "sending" | "sent">("idle");
	const [error, setError] = useState<string | null>(null);

	async function send() {
		setPhase("sending");
		setError(null);
		try {
			const res = await fetch("/api/admin/user", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, action: "resend-setup" }),
			});
			const j = (await res.json().catch(() => ({}))) as { error?: string; delivered?: boolean };
			if (!res.ok) {
				setError(j.error ?? "Could not send the link.");
				setPhase("idle");
				return;
			}
			setPhase("sent");
		} catch {
			setError("Network error.");
			setPhase("idle");
		}
	}

	if (phase === "sent") {
		return <p className="mt-1.5 text-xs font-semibold text-emerald-600">Link sent</p>;
	}

	return (
		<div className="mt-1.5">
			{phase === "confirm" ? (
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={send}
						className="rounded-full bg-brand-blue px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-blue-deep"
					>
						Email {email.length > 22 ? "them" : email}?
					</button>
					<button
						type="button"
						onClick={() => setPhase("idle")}
						className="text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700"
					>
						Cancel
					</button>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setPhase("confirm")}
					disabled={phase === "sending"}
					className="text-xs font-semibold text-brand-blue-deep underline underline-offset-2 transition-colors hover:text-brand-blue disabled:opacity-60"
				>
					{phase === "sending" ? "Sending…" : "Send setup link"}
				</button>
			)}
			{error && <p className="mt-1 max-w-[16rem] whitespace-normal text-xs text-red-600">{error}</p>}
		</div>
	);
}

function StatusBadge({ status }: { status: string | null }) {
	// A null status is a legacy migrated row; login treats it as approved, so the
	// directory must show the same thing rather than an empty cell.
	if (status === "pending") return <Badge tone="warn">Pending</Badge>;
	if (status === "denied") return <Badge tone="bad">Denied</Badge>;
	return <Badge tone="good">Approved</Badge>;
}

const TONES = {
	good: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
	warn: "bg-amber-50 text-amber-700 ring-amber-600/20",
	bad: "bg-red-50 text-red-700 ring-red-600/20",
	info: "bg-sky-50 text-sky-700 ring-sky-600/20",
	neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
} as const;

function Badge({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
	return (
		<span
			className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}
		>
			{children}
		</span>
	);
}
