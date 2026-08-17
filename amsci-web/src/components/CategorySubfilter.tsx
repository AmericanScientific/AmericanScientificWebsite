"use client";

import { useMemo, useRef, useState } from "react";
import type { Product } from "@/types/product";
import { categoryTheme } from "@/lib/categoryTheme";
import { paginate } from "@/lib/pagination";
import { ProductGrid } from "@/components/ProductGrid";
import { PaginationControls } from "@/components/PaginationControls";

export interface SubcategoryOption {
	slug: string;
	name: string;
	count: number;
}

/**
 * Subcategory pills as multi-select filter toggles (not links). The pills are
 * always present; clicking one adds its leaf to the view, clicking again removes
 * it. With nothing selected, every product under the parent shows. Filtering is
 * client-side over the products already on the page — no navigation, no refetch.
 *
 * Active pills take the parent category's gradient (`themeSlug`) so the control
 * reads as part of the category, matching the hero.
 *
 * The grid is paginated at the shared PAGE_SIZE. Because the visible set is
 * client state, paging is too — see `PaginationControls` for why this one can't
 * use crawlable ?page= URLs the way the all-products listing does.
 */
export function CategorySubfilter({
	themeSlug,
	subcategories,
	products,
	initialSelected = [],
}: {
	themeSlug: string;
	subcategories: SubcategoryOption[];
	products: Product[];
	/** Subcategory slugs lit on first render (e.g. a leaf reached from the nav). */
	initialSelected?: string[];
}) {
	const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));
	const [page, setPage] = useState(1);
	const gridTop = useRef<HTMLDivElement>(null);
	const theme = categoryTheme(themeSlug);

	// Any filter change invalidates the current page number — being on page 3 of
	// 5 and then narrowing to a single subcategory with one page of results would
	// otherwise show an empty grid.
	const toggle = (slug: string) => {
		setPage(1);
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(slug)) next.delete(slug);
			else next.add(slug);
			return next;
		});
	};

	const clear = () => {
		setPage(1);
		setSelected(new Set());
	};

	const shown = useMemo(
		() => (selected.size === 0 ? products : products.filter((p) => selected.has(p.category))),
		[products, selected],
	);

	// The largest categories run past 200 products; rendering all of them meant a
	// very long document and one bulk pricing request covering every card on it.
	const paged = useMemo(() => paginate(shown, String(page)), [shown, page]);

	const goToPage = (next: number) => {
		setPage(next);
		// Without this you land at the bottom of the new page, where the control
		// you just clicked used to be.
		gridTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	return (
		<div>
			{subcategories.length ? (
				<div className="flex flex-wrap items-center gap-2">
					{subcategories.map((sub) => {
						const active = selected.has(sub.slug);
						return (
							<button
								key={sub.slug}
								type="button"
								onClick={() => toggle(sub.slug)}
								aria-pressed={active}
								className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium shadow-sm transition-all ${
									active
										? `border-transparent bg-gradient-to-br text-white shadow-md ${theme.tile}`
										: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-md"
								}`}
							>
								{sub.name}
								<span
									className={`rounded-full px-1.5 text-xs ${
										active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
									}`}
								>
									{sub.count}
								</span>
							</button>
						);
					})}

					{selected.size > 0 ? (
						<button
							type="button"
							onClick={clear}
							className="ml-1 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
						>
							<svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
								<path d="M18 6 6 18M6 6l12 12" />
							</svg>
							Clear
						</button>
					) : null}
				</div>
			) : null}

			<div ref={gridTop} className="scroll-mt-24">
				{/*
				 * Two different counts, deliberately. Filtered: how much the pills
				 * narrowed things. Paginated: where you are in the full set, which
				 * matters once a category spills past one page.
				 */}
				{selected.size > 0 ? (
					<p className="mt-3 text-sm text-slate-500">
						Showing <span className="font-semibold text-slate-700">{shown.length}</span> of {products.length}{" "}
						products
					</p>
				) : paged.totalPages > 1 ? (
					<p className="mt-3 text-sm text-slate-500">
						Page <span className="font-semibold text-slate-700">{paged.page}</span> of {paged.totalPages} ·{" "}
						{paged.total} products
					</p>
				) : null}

				<ProductGrid products={paged.items} />

				<PaginationControls page={paged.page} totalPages={paged.totalPages} onPageChange={goToPage} />
			</div>
		</div>
	);
}
