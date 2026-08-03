import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
	countAccounts,
	getAccountSummary,
	getDb,
	listAccounts,
	type AccountFilter,
	type AccountSort,
} from "@/lib/auth/db";
import { AdminTabs } from "@/components/AdminTabs";
import { AdminAccountFilters } from "@/components/AdminAccountFilters";
import { AdminAccountsTable, type AccountListRow } from "@/components/AdminAccountsTable";
import { Pagination } from "@/components/Pagination";

export const metadata: Metadata = {
	title: "Current accounts · Admin",
	robots: { index: false, follow: false },
};

// Reads the session per request; must be dynamic.
export const dynamic = "force-dynamic";

/** ~2,000 accounts, so the list is paged in SQL rather than in the page. */
const PER_PAGE = 50;

type Raw = Record<string, string | string[] | undefined>;

/** searchParams values may arrive as arrays; take the first. */
function one(v: string | string[] | undefined): string {
	return (Array.isArray(v) ? v[0] : v) ?? "";
}

const SORTS = new Set<AccountSort>(["newest", "oldest", "name", "email"]);

export default async function AdminAccountsPage({ searchParams }: { searchParams: Promise<Raw> }) {
	const user = await getCurrentUser();
	if (!user) redirect("/login?next=/admin/accounts");
	// Don't reveal the route to non-admins.
	if (!user.isAdmin) notFound();

	const sp = await searchParams;
	const q = one(sp.q).trim();
	const statusRaw = one(sp.status);
	const passwordRaw = one(sp.password);
	const tierRaw = one(sp.tier);
	const sortRaw = one(sp.sort);

	// Everything from the query string is validated against a fixed set before it
	// reaches the query builder.
	const status = statusRaw === "approved" || statusRaw === "pending" || statusRaw === "denied" ? statusRaw : undefined;
	const setPassword = passwordRaw === "yes" || passwordRaw === "no" ? passwordRaw : undefined;
	const tier = [1, 2, 3, 4, 7, 8].includes(Number(tierRaw)) ? Number(tierRaw) : undefined;
	const sort: AccountSort = SORTS.has(sortRaw as AccountSort) ? (sortRaw as AccountSort) : "newest";

	const filter: AccountFilter = { q, status, setPassword, priceLevel: tier, sort };

	const db = getDb();
	const total = await countAccounts(db, filter);
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	let page = Number(one(sp.page));
	if (!Number.isFinite(page) || page < 1) page = 1;
	page = Math.min(Math.floor(page), totalPages);

	const [summary, rows] = await Promise.all([
		getAccountSummary(db),
		listAccounts(db, filter, PER_PAGE, (page - 1) * PER_PAGE),
	]);

	// Dates are formatted here, not in the client table, so SSR and hydration
	// can't disagree about locale or timezone.
	const fmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });
	const list: AccountListRow[] = rows.map((r) => {
		const t = Date.parse(r.created_at);
		return {
			id: r.id,
			name: r.display_name,
			email: r.email,
			company: r.company ?? "",
			accountType: r.account_type ?? "",
			status: r.status,
			priceLevel: r.price_level,
			isAdmin: r.is_admin === 1,
			migrated: r.wp_user_id !== null,
			hasSetPassword: r.has_set_password === 1,
			createdLabel: Number.isNaN(t) ? "—" : fmt.format(new Date(t)),
		};
	});

	// Carry the filters through paging; `page` is added by <Pagination>.
	const carried = new URLSearchParams();
	if (q) carried.set("q", q);
	if (status) carried.set("status", status);
	if (setPassword) carried.set("password", setPassword);
	if (tier) carried.set("tier", String(tier));
	if (sort !== "newest") carried.set("sort", sort);
	const baseHref = carried.toString() ? `/admin/accounts?${carried}` : "/admin/accounts";

	const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
	const to = Math.min(page * PER_PAGE, total);

	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
			<h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Accounts</h1>
			<AdminTabs active="accounts" pendingCount={summary.pending} />

			<p className="mt-6 text-sm text-slate-500">
				Every registered account. <strong className="font-semibold text-slate-700">Password</strong> shows
				whether someone has set a password on the new site yet. Until they do they can&rsquo;t sign in, even
				though the account is approved, so those rows offer a button to re-send their setup link. Changing a
				price tier saves immediately and emails nobody.
			</p>

			<dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Stat label="Total accounts" value={summary.total} href="/admin/accounts" />
				<Stat label="Password set" value={summary.ready} href="/admin/accounts?status=approved&password=yes" />
				<Stat
					label="Awaiting setup"
					value={summary.awaitingSetup}
					href="/admin/accounts?status=approved&password=no"
					tone="warn"
				/>
				<Stat label="Pending requests" value={summary.pending} href="/admin" tone={summary.pending > 0 ? "warn" : undefined} />
			</dl>

			<AdminAccountFilters
				values={{ q, status: status ?? "", password: setPassword ?? "", tier: tier ? String(tier) : "", sort }}
			/>

			<p className="mt-5 text-sm text-slate-500 tabular-nums">
				{total === 0 ? "No matching accounts" : `Showing ${from}–${to} of ${total.toLocaleString("en-US")}`}
			</p>

			<div className="mt-3">
				<AdminAccountsTable rows={list} />
			</div>

			<Pagination page={page} totalPages={totalPages} baseHref={baseHref} />
		</main>
	);
}

function Stat({
	label,
	value,
	href,
	tone,
}: {
	label: string;
	value: number;
	href: string;
	tone?: "warn";
}) {
	return (
		<Link
			href={href}
			className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
		>
			<dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
			<dd
				className={
					"mt-1 font-display text-2xl font-bold tabular-nums " +
					(tone === "warn" ? "text-amber-600" : "text-slate-900")
				}
			>
				{value.toLocaleString("en-US")}
			</dd>
		</Link>
	);
}
