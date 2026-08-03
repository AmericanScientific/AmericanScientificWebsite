/**
 * Filter bar for the admin account directory.
 *
 * A plain GET form, deliberately: it needs no client JS, every filtered view is
 * a shareable URL, and the browser repopulates the controls from the query string
 * on its own. `page` is intentionally NOT carried over — changing a filter should
 * return you to page 1 rather than to page 14 of a different result set.
 */
export interface AccountFilterValues {
	q: string;
	status: string;
	password: string;
	tier: string;
	sort: string;
}

const SELECT =
	"rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20";

export function AdminAccountFilters({ values }: { values: AccountFilterValues }) {
	return (
		<form method="get" action="/admin/accounts" className="mt-6 flex flex-wrap items-end gap-3">
			<div className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
				<label htmlFor="acc-q" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
					Search
				</label>
				<input
					id="acc-q"
					type="search"
					name="q"
					defaultValue={values.q}
					placeholder="Name, email or company"
					className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="acc-status" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
					Status
				</label>
				<select id="acc-status" name="status" defaultValue={values.status} className={SELECT}>
					<option value="">All</option>
					<option value="approved">Approved</option>
					<option value="pending">Pending</option>
					<option value="denied">Denied</option>
				</select>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="acc-password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
					Password
				</label>
				<select id="acc-password" name="password" defaultValue={values.password} className={SELECT}>
					<option value="">All</option>
					<option value="yes">Set</option>
					<option value="no">Awaiting setup</option>
				</select>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="acc-tier" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
					Tier
				</label>
				<select id="acc-tier" name="tier" defaultValue={values.tier} className={SELECT}>
					<option value="">All</option>
					{[1, 2, 3, 4, 7, 8].map((t) => (
						<option key={t} value={String(t)}>
							Tier {t}
						</option>
					))}
				</select>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="acc-sort" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
					Sort
				</label>
				<select id="acc-sort" name="sort" defaultValue={values.sort} className={SELECT}>
					<option value="newest">Newest first</option>
					<option value="oldest">Oldest first</option>
					<option value="name">Name A–Z</option>
					<option value="email">Email A–Z</option>
				</select>
			</div>

			<div className="flex gap-2">
				<button
					type="submit"
					className="brand-gradient rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-105"
				>
					Apply
				</button>
				<a
					href="/admin/accounts"
					className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
				>
					Reset
				</a>
			</div>
		</form>
	);
}
