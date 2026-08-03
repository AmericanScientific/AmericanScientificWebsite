import Link from "next/link";

/**
 * Section nav for the admin area. A server component taking the active tab as a
 * prop rather than reading `usePathname()`, so it stays out of the client bundle.
 *
 * `count` is rendered as a badge when it's greater than zero — used to surface
 * the pending-request backlog from either tab.
 */
export type AdminTab = "requests" | "accounts";

export function AdminTabs({ active, pendingCount }: { active: AdminTab; pendingCount?: number }) {
	const tabs: { key: AdminTab; href: string; label: string; count?: number }[] = [
		{ key: "requests", href: "/admin", label: "Account requests", count: pendingCount },
		{ key: "accounts", href: "/admin/accounts", label: "Current accounts" },
	];

	return (
		<nav aria-label="Admin sections" className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
			{tabs.map((t) => {
				const isActive = t.key === active;
				return (
					<Link
						key={t.key}
						href={t.href}
						aria-current={isActive ? "page" : undefined}
						className={
							"-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors " +
							(isActive
								? "border-brand-blue text-brand-blue-deep"
								: "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700")
						}
					>
						{t.label}
						{t.count !== undefined && t.count > 0 && (
							<span className="rounded-full bg-brand-red px-2 py-0.5 text-[0.68rem] font-bold text-white">
								{t.count}
							</span>
						)}
					</Link>
				);
			})}
		</nav>
	);
}
