import Link from "next/link";
import {
	PAGE_BTN,
	PAGE_BTN_ACTIVE,
	PAGE_BTN_DISABLED,
	PAGE_BTN_IDLE,
	pageWindow,
} from "@/lib/pagination";

/**
 * Page navigation for listing grids. Server component (plain links), so it works
 * without client JS and keeps each page a crawlable URL. Page 1 links to the
 * clean base href (no ?page=) so the canonical listing stays param-free.
 *
 * `baseHref` may already carry a query string (the admin account directory
 * passes its filters through it); the page param is joined with `&` in that case
 * so the filters survive paging.
 */
export function Pagination({ page, totalPages, baseHref }: { page: number; totalPages: number; baseHref: string }) {
	if (totalPages <= 1) return null;

	const sep = baseHref.includes("?") ? "&" : "?";
	const href = (p: number) => (p <= 1 ? baseHref : `${baseHref}${sep}page=${p}`);
	const base = PAGE_BTN;
	const idle = PAGE_BTN_IDLE;
	const active = PAGE_BTN_ACTIVE;
	const disabled = PAGE_BTN_DISABLED;

	return (
		<nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
			{page > 1 ? (
				<Link href={href(page - 1)} rel="prev" className={`${base} ${idle}`}>
					‹ Prev
				</Link>
			) : (
				<span className={`${base} ${disabled}`} aria-disabled>
					‹ Prev
				</span>
			)}

			{pageWindow(page, totalPages).map((p, i) =>
				p === "…" ? (
					<span key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden>
						…
					</span>
				) : p === page ? (
					<span key={p} aria-current="page" className={`${base} ${active}`}>
						{p}
					</span>
				) : (
					<Link key={p} href={href(p)} className={`${base} ${idle}`}>
						{p}
					</Link>
				),
			)}

			{page < totalPages ? (
				<Link href={href(page + 1)} rel="next" className={`${base} ${idle}`}>
					Next ›
				</Link>
			) : (
				<span className={`${base} ${disabled}`} aria-disabled>
					Next ›
				</span>
			)}
		</nav>
	);
}
