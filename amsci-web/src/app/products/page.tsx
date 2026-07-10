import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/types/product";
import { getAllProducts, getProductsByCategory } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";

export const metadata: Metadata = {
	title: "Catalog",
	description: "Browse American Scientific's wholesale catalog of STEM and laboratory products.",
};

function isCategory(value: string | undefined): value is (typeof CATEGORIES)[number] {
	return !!value && (CATEGORIES as readonly string[]).includes(value);
}

export default async function ProductsPage({
	searchParams,
}: {
	searchParams: Promise<{ category?: string }>;
}) {
	const { category } = await searchParams;
	const active = isCategory(category) ? category : undefined;
	const products = active ? getProductsByCategory(active) : getAllProducts();

	return (
		<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight text-slate-900">
					{active ?? "All Products"}
				</h1>
				<p className="text-sm text-slate-500">
					{products.length} {products.length === 1 ? "product" : "products"} · Sign in for your
					account pricing
				</p>
			</div>

			{/* Category filter */}
			<div className="mt-6 flex flex-wrap gap-2">
				<FilterChip href="/products" label="All" activeState={!active} />
				{CATEGORIES.map((c) => (
					<FilterChip
						key={c}
						href={`/products?category=${encodeURIComponent(c)}`}
						label={c}
						activeState={active === c}
					/>
				))}
			</div>

			{products.length === 0 ? (
				<p className="mt-10 text-slate-500">No products found in this category.</p>
			) : (
				<div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{products.map((product) => (
						<ProductCard key={product.internalId} product={product} />
					))}
				</div>
			)}
		</div>
	);
}

function FilterChip({ href, label, activeState }: { href: string; label: string; activeState: boolean }) {
	return (
		<Link
			href={href}
			className={
				activeState
					? "rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white"
					: "rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400"
			}
		>
			{label}
		</Link>
	);
}
