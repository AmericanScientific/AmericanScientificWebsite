"use client";

import {
	PAGE_BTN,
	PAGE_BTN_ACTIVE,
	PAGE_BTN_DISABLED,
	PAGE_BTN_IDLE,
	pageWindow,
} from "@/lib/pagination";

/**
 * Button-based pagination for a grid whose contents are decided on the client.
 *
 * The link-based `Pagination` is preferred wherever the page can be described by
 * a URL, because those pages stay crawlable. It doesn't fit the category grid:
 * the visible set depends on which subcategory pills are toggled, which is
 * client state, so a `?page=` link would either lose the filter or claim a
 * crawlable URL that renders something different. Category SEO is served by the
 * sitemap and the unfiltered first render instead.
 */
export function PaginationControls({
	page,
	totalPages,
	onPageChange,
}: {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}) {
	if (totalPages <= 1) return null;

	return (
		<nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
			{page > 1 ? (
				<button type="button" onClick={() => onPageChange(page - 1)} className={`${PAGE_BTN} ${PAGE_BTN_IDLE}`}>
					‹ Prev
				</button>
			) : (
				<span className={`${PAGE_BTN} ${PAGE_BTN_DISABLED}`} aria-disabled>
					‹ Prev
				</span>
			)}

			{pageWindow(page, totalPages).map((p, i) =>
				p === "…" ? (
					<span key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden>
						…
					</span>
				) : p === page ? (
					<span key={p} aria-current="page" className={`${PAGE_BTN} ${PAGE_BTN_ACTIVE}`}>
						{p}
					</span>
				) : (
					<button key={p} type="button" onClick={() => onPageChange(p)} className={`${PAGE_BTN} ${PAGE_BTN_IDLE}`}>
						{p}
					</button>
				),
			)}

			{page < totalPages ? (
				<button type="button" onClick={() => onPageChange(page + 1)} className={`${PAGE_BTN} ${PAGE_BTN_IDLE}`}>
					Next ›
				</button>
			) : (
				<span className={`${PAGE_BTN} ${PAGE_BTN_DISABLED}`} aria-disabled>
					Next ›
				</span>
			)}
		</nav>
	);
}
