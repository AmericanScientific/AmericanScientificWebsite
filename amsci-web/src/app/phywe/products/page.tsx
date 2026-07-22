import type { Metadata } from "next";
import Link from "next/link";
import { phyweByCategory, phyweCategories } from "@/data/phywe";
import { PhyweCard } from "@/components/PhyweCard";
import { paginate, pageWindow } from "@/lib/pagination";

export const metadata: Metadata = {
	title: "PHYWE Products",
	description:
		"Browse the PHYWE catalog from American Scientific — physics, chemistry, biology, sensors, and complete experiment systems. Quote-only; request pricing from our team.",
};

/** Reads category/page from the URL, so it renders per-request (no huge prerender). */
export default async function PhyweProductsPage({
	searchParams,
}: {
	searchParams: Promise<{ category?: string; page?: string }>;
}) {
	const sp = await searchParams;
	const categories = phyweCategories();
	const active = categories.includes(sp.category ?? "") ? sp.category! : undefined;
	const list = phyweByCategory(active);
	const { items, page, totalPages, total } = paginate(list, sp.page);

	const chip = (label: string, cat?: string) => {
		const isActive = (cat ?? undefined) === active;
		const href = cat ? `/phywe/products?category=${encodeURIComponent(cat)}` : "/phywe/products";
		return (
			<Link
				key={label}
				href={href}
				className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
					isActive
						? "bg-slate-900 text-white"
						: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
				}`}
			>
				{label}
			</Link>
		);
	};

	// Pagination links must preserve the active category.
	const pageHref = (p: number) => {
		const params = new URLSearchParams();
		if (active) params.set("category", active);
		if (p > 1) params.set("page", String(p));
		const qs = params.toString();
		return qs ? `/phywe/products?${qs}` : "/phywe/products";
	};

	return (
		<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
			<nav className="mb-6 text-sm text-slate-400" aria-label="Breadcrumb">
				<Link href="/phywe" className="hover:text-slate-700">PHYWE</Link>
				<span className="mx-2">/</span>
				<span className="text-slate-600">Products</span>
			</nav>

			<h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
				{active ?? "All"} PHYWE Products
			</h1>
			<p className="mt-2 text-slate-500">
				{total.toLocaleString()} products · quote-only. Contact us for pricing and availability.
			</p>

			{/* Category filter */}
			<div className="mt-6 flex flex-wrap gap-2">
				{chip("All")}
				{categories.map((c) => chip(c, c))}
			</div>

			{/* Grid */}
			<div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{items.map((p) => (
					<PhyweCard key={p.articleNo} p={p} />
				))}
			</div>

			{/* Pagination (category-preserving) */}
			{totalPages > 1 && (
				<nav className="mt-10 flex flex-wrap items-center justify-center gap-1.5 text-sm" aria-label="Pagination">
					{page > 1 && (
						<Link href={pageHref(page - 1)} rel="prev" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50">
							Prev
						</Link>
					)}
					{pageWindow(page, totalPages).map((n, i) =>
						n === "…" ? (
							<span key={`gap-${i}`} className="px-2 text-slate-400">…</span>
						) : (
							<Link
								key={n}
								href={pageHref(n)}
								aria-current={n === page ? "page" : undefined}
								className={`rounded-lg px-3 py-1.5 font-medium ${
									n === page ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
								}`}
							>
								{n}
							</Link>
						),
					)}
					{page < totalPages && (
						<Link href={pageHref(page + 1)} rel="next" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50">
							Next
						</Link>
					)}
				</nav>
			)}
		</div>
	);
}
