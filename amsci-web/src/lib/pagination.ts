/** Shared pagination for catalog listing grids. */

export const PAGE_SIZE = 48; // multiple of 4 → fills the xl:grid-cols-4 grid evenly

export interface Paged<T> {
	items: T[];
	page: number;
	totalPages: number;
	total: number;
}

/** Slice `all` for the requested page. Clamps out-of-range/invalid page values to [1, totalPages]. */
export function paginate<T>(all: T[], pageParam: string | undefined, perPage = PAGE_SIZE): Paged<T> {
	const total = all.length;
	const totalPages = Math.max(1, Math.ceil(total / perPage));
	let page = Number(pageParam);
	if (!Number.isFinite(page) || page < 1) page = 1;
	page = Math.min(Math.floor(page), totalPages);
	const start = (page - 1) * perPage;
	return { items: all.slice(start, start + perPage), page, totalPages, total };
}

/**
 * Compact page-number sequence for the control: first, a window around the
 * current page, and last, with `"…"` gaps. e.g. [1,"…",5,6,7,"…",21].
 */
export function pageWindow(page: number, totalPages: number): (number | "…")[] {
	const out: (number | "…")[] = [];
	const push = (n: number) => out.push(n);
	const lo = Math.max(2, page - 1);
	const hi = Math.min(totalPages - 1, page + 1);
	push(1);
	if (lo > 2) out.push("…");
	for (let n = lo; n <= hi; n++) push(n);
	if (hi < totalPages - 1) out.push("…");
	if (totalPages > 1) push(totalPages);
	return out;
}
