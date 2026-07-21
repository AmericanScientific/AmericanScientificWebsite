import type { Metadata } from "next";
import Link from "next/link";
import { getTopLevelCategories } from "@/data/categories";
import { categoryTheme } from "@/lib/categoryTheme";
import { getListingProducts } from "@/data/products";
import { ProductGrid } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import { paginate } from "@/lib/pagination";
import { CategoryIcon } from "@/components/CategoryIcon";

export const metadata: Metadata = {
	title: "Catalog",
	description: "Browse American Scientific's wholesale catalog of STEM and laboratory products.",
};

/** Re-read the cron-synced catalog from D1 at most this often (seconds). */
export const revalidate = 300;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
	const allProducts = await getListingProducts();
	const { items: products, page, totalPages } = paginate(allProducts, (await searchParams).page);
	const categories = getTopLevelCategories();

	return (
		<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
			<h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
				All Products
			</h1>

			{/* Category quick-jump */}
			<div className="mt-8 flex flex-wrap gap-2">
				{categories.map((category) => {
					const theme = categoryTheme(category.slug);
					return (
						<Link
							key={category.slug}
							href={category.external ? `/${category.slug}` : `/product-category/${category.slug}`}
							className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
						>
							<span className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-white ${theme.tile}`}>
								<CategoryIcon slug={category.slug} className="h-4 w-4" />
							</span>
							{category.name}
						</Link>
					);
				})}
			</div>

			<ProductGrid products={products} />
			<Pagination page={page} totalPages={totalPages} baseHref="/products" />
		</div>
	);
}
