"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/types/product";
import { ProductImage } from "@/components/ProductImage";
import { ProductPrice } from "@/components/ProductPrice";
import { CategoryIcon } from "@/components/CategoryIcon";
import { TeacherGuideButtons } from "@/components/TeacherGuideButtons";
import { categoryTheme } from "@/lib/categoryTheme";

/** One selectable variant: its cached render data + option values per axis. */
export interface VariantOption {
	product: Product;
	/** Full option label (fallback when axes don't split cleanly). */
	label: string;
	/** Per-axis values, aligned to `axes` order. */
	values: string[];
}

/**
 * Interactive multi-variant product view.
 *
 * Renders the media + details columns of a consolidated product page and swaps
 * ALL member-specific content (SKU, image, title, description, base price, and
 * the Add-To-Order target) in place when a variant is selected — no navigation,
 * no network (every member's data is passed in from the catalog cache). The
 * selection is reflected in the URL as `?sku=` so variants are linkable and
 * back/forward work.
 */
export function ProductVariantView({
	axes,
	options,
	categorySlug,
	leafName,
	categoryHref,
}: {
	axes: string[];
	options: VariantOption[];
	categorySlug: string;
	leafName: string;
	categoryHref: string;
}) {
	// Server always renders the default (first) member so the page stays static
	// (SSG). A `?sku=` deep link is applied on the client after mount.
	const [idx, setIdx] = useState(0);
	const current = options[idx];
	const theme = categoryTheme(categorySlug);

	// Apply an incoming ?sku= deep link once, on mount.
	useEffect(() => {
		const sku = new URLSearchParams(window.location.search).get("sku");
		if (!sku) return;
		const i = options.findIndex((o) => o.product.sku.toLowerCase() === sku.toLowerCase());
		if (i > 0) setIdx(i);
		// options is stable for the life of the page
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Multi-axis mode only when every option splits into exactly one value per
	// axis; otherwise fall back to a single selector over the full labels.
	const multiAxis = axes.length > 1 && options.every((o) => o.values.length === axes.length);

	// Distinct values per axis, in first-appearance order.
	const axisValues = useMemo(() => {
		if (!multiAxis) return [];
		return axes.map((_, a) => {
			const seen = new Set<string>();
			const vals: string[] = [];
			for (const o of options) {
				const v = o.values[a];
				if (v != null && !seen.has(v)) {
					seen.add(v);
					vals.push(v);
				}
			}
			return vals;
		});
	}, [axes, options, multiAxis]);

	// Keep the URL's ?sku= in sync with the selection (shareable / back-forward).
	useEffect(() => {
		const url = new URL(window.location.href);
		url.searchParams.set("sku", current.product.sku);
		window.history.replaceState(null, "", url.toString());
	}, [current.product.sku]);

	/** Pick the member matching `value` on `axisIdx`, closest to current other axes. */
	function selectValue(axisIdx: number, value: string) {
		const cur = current.values;
		let best = -1;
		let bestScore = -1;
		options.forEach((o, i) => {
			if (o.values[axisIdx] !== value) return;
			let score = 0;
			o.values.forEach((v, a) => {
				if (a !== axisIdx && v === cur[a]) score++;
			});
			if (score > bestScore) {
				bestScore = score;
				best = i;
			}
		});
		if (best >= 0) setIdx(best);
	}

	const product = current.product;

	return (
		<div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
			{/* Media */}
			<div data-hero-media>
				<ProductImage
					product={product}
					className="aspect-square w-full rounded-3xl shadow-lg shadow-slate-900/5"
					iconClassName="h-28 w-28"
				/>
				<TeacherGuideButtons sku={product.sku} available={product.teacherGuideAvailable} />
			</div>

			{/* Details */}
			<div className="flex flex-col">
				<Link
					href={categoryHref}
					className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${theme.chip}`}
				>
					<CategoryIcon slug={categorySlug} className="h-3.5 w-3.5" />
					{leafName}
				</Link>

				<h1 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
					{product.title}
				</h1>
				<p className="mt-2 text-sm text-slate-400">SKU {product.sku}</p>

				{/* Variant selectors */}
				<div className="mt-6 flex flex-col gap-4">
					{multiAxis
						? axes.map((axisName, a) => (
								<VariantAxis
									key={axisName}
									name={axisName}
									values={axisValues[a]}
									selected={current.values[a]}
									onSelect={(v) => selectValue(a, v)}
								/>
							))
						: (
							<VariantAxis
								name={axes[0] || "Option"}
								values={options.map((o) => o.label)}
								selected={current.label}
								onSelect={(label) => {
									const i = options.findIndex((o) => o.label === label);
									if (i >= 0) setIdx(i);
								}}
							/>
						)}
				</div>

				{/* Description sits above the price card, below the variant selectors. */}
				{product.description && (
					<p className="mt-6 text-sm leading-relaxed text-slate-600">{product.description}</p>
				)}

				{/* Price card — login-gated; key on SKU so it re-fetches per variant */}
				<ProductPrice
					key={product.sku}
					sku={product.sku}
					title={product.title}
					imageUrl={product.imageUrl}
				/>

				{product.grades.length > 0 && (
					<div className="mt-6">
						<h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
							Grade Levels
						</h2>
						<div className="mt-2 flex flex-wrap gap-2">
							{product.grades.map((grade) => (
								<span
									key={grade}
									className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
								>
									{grade}
								</span>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

/** One variant axis: pill buttons for ≤6 options or a Color axis; a dropdown otherwise. */
function VariantAxis({
	name,
	values,
	selected,
	onSelect,
}: {
	name: string;
	values: string[];
	selected: string;
	onSelect: (value: string) => void;
}) {
	return (
		<div>
			<div className="mb-2 flex items-baseline gap-2">
				<span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{name}</span>
				<span className="text-xs text-slate-400">{selected}</span>
			</div>
			<select
				value={selected}
				onChange={(e) => onSelect(e.target.value)}
				aria-label={name}
				className="w-full max-w-xs rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
			>
				{values.map((v) => (
					<option key={v} value={v}>
						{v}
					</option>
				))}
			</select>
		</div>
	);
}
