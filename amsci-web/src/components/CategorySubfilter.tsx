"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { categoryTheme } from "@/lib/categoryTheme";
import { ProductGrid } from "@/components/ProductGrid";

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
	const theme = categoryTheme(themeSlug);

	const toggle = (slug: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(slug)) next.delete(slug);
			else next.add(slug);
			return next;
		});
	};

	const shown = useMemo(
		() => (selected.size === 0 ? products : products.filter((p) => selected.has(p.category))),
		[products, selected],
	);

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
							onClick={() => setSelected(new Set())}
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

			{selected.size > 0 ? (
				<p className="mt-3 text-sm text-slate-500">
					Showing <span className="font-semibold text-slate-700">{shown.length}</span> of {products.length}{" "}
					products
				</p>
			) : null}

			<ProductGrid products={shown} />
		</div>
	);
}
