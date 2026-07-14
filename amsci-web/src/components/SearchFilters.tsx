"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getTopLevelCategories } from "@/data/categories";

/**
 * Advanced-search controls for the results page: category (family or leaf),
 * grade level, price range, and sort. Each change rewrites the URL query (the
 * server page re-runs the search), preserving the current `q`.
 */
export function SearchFilters({ grades }: { grades: string[] }) {
	const router = useRouter();
	const params = useSearchParams();
	const categories = getTopLevelCategories().filter((c) => !c.external);

	const [min, setMin] = useState(params.get("min") ?? "");
	const [max, setMax] = useState(params.get("max") ?? "");

	function apply(updates: Record<string, string | null>) {
		const next = new URLSearchParams(params.toString());
		for (const [k, v] of Object.entries(updates)) {
			if (v == null || v === "") next.delete(k);
			else next.set(k, v);
		}
		router.push(`/search?${next.toString()}`, { scroll: false });
	}

	const hasFilters =
		params.get("category") || params.get("grade") || params.get("min") || params.get("max");

	const selectCls =
		"w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/20";
	const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

	return (
		<aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-sm font-bold text-slate-900">Refine</h2>
				{hasFilters ? (
					<button
						type="button"
						onClick={() => {
							setMin("");
							setMax("");
							apply({ category: null, grade: null, min: null, max: null });
						}}
						className="text-xs font-semibold text-brand-blue-deep hover:underline"
					>
						Clear
					</button>
				) : null}
			</div>

			<div className="flex flex-col gap-4">
				<div>
					<label className={labelCls} htmlFor="f-category">
						Category
					</label>
					<select
						id="f-category"
						className={selectCls}
						value={params.get("category") ?? ""}
						onChange={(e) => apply({ category: e.target.value || null })}
					>
						<option value="">All categories</option>
						{categories.map((c) =>
							c.children?.length ? (
								<optgroup key={c.slug} label={c.name}>
									<option value={c.slug}>All {c.name}</option>
									{c.children.map((child) => (
										<option key={child.slug} value={child.slug}>
											{child.name}
										</option>
									))}
								</optgroup>
							) : (
								<option key={c.slug} value={c.slug}>
									{c.name}
								</option>
							),
						)}
					</select>
				</div>

				{grades.length > 0 && (
					<div>
						<label className={labelCls} htmlFor="f-grade">
							Grade level
						</label>
						<select
							id="f-grade"
							className={selectCls}
							value={params.get("grade") ?? ""}
							onChange={(e) => apply({ grade: e.target.value || null })}
						>
							<option value="">All grades</option>
							{grades.map((g) => (
								<option key={g} value={g}>
									{g}
								</option>
							))}
						</select>
					</div>
				)}

				<div>
					<span className={labelCls}>Price (base)</span>
					<div className="flex items-center gap-2">
						<input
							type="number"
							min={0}
							inputMode="decimal"
							placeholder="Min"
							value={min}
							onChange={(e) => setMin(e.target.value)}
							onBlur={() => apply({ min: min || null })}
							onKeyDown={(e) => e.key === "Enter" && apply({ min: min || null })}
							className={selectCls}
							aria-label="Minimum price"
						/>
						<span className="text-slate-400">–</span>
						<input
							type="number"
							min={0}
							inputMode="decimal"
							placeholder="Max"
							value={max}
							onChange={(e) => setMax(e.target.value)}
							onBlur={() => apply({ max: max || null })}
							onKeyDown={(e) => e.key === "Enter" && apply({ max: max || null })}
							className={selectCls}
							aria-label="Maximum price"
						/>
					</div>
				</div>

				<div>
					<label className={labelCls} htmlFor="f-sort">
						Sort by
					</label>
					<select
						id="f-sort"
						className={selectCls}
						value={params.get("sort") ?? "relevance"}
						onChange={(e) => apply({ sort: e.target.value })}
					>
						<option value="relevance">Relevance</option>
						<option value="price-asc">Price: low to high</option>
						<option value="price-desc">Price: high to low</option>
						<option value="name">Name (A–Z)</option>
					</select>
				</div>
			</div>
		</aside>
	);
}
