import Link from "next/link";
import { pageWindow } from "@/lib/pagination";

/**
 * Page navigation for listing grids. Server component (plain links), so it works
 * without client JS and keeps each page a crawlable URL. Page 1 links to the
 * clean base href (no ?page=) so the canonical listing stays param-free.
 */
export function Pagination({ page, totalPages, baseHref }: { page: number; totalPages: number; baseHref: string }) {
	if (totalPages <= 1) return null;

	const href = (p: number) => (p <= 1 ? baseHref : `${baseHref}?page=${p}`);
	const base =
		"inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors";
	const idle = "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";
	const active = "border border-brand-blue bg-brand-blue text-white";
	const disabled = "cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-300";

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
