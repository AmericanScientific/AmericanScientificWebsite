import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopLevelCategories, getParentCategory } from "@/data/categories";
import { categoryTheme } from "@/lib/categoryTheme";
import { getProductsByParent, getLeafProductCounts } from "@/data/products";
import { ProductGrid } from "@/components/ProductGrid";
import { CategoryIcon } from "@/components/CategoryIcon";

/**
 * Top-level category landing page.
 *
 * URL shape (`/product-category/[parent]`) preserves the current site's category
 * URLs for SEO (CLAUDE.md §8). Shows the parent's subcategories (if any) plus
 * every product beneath it. Standalone top-level categories (e.g. Special) are
 * included; external sources (PHYWE) have their own route and are excluded.
 */
/** Re-read the cron-synced catalog from D1 at most this often (seconds). */
export const revalidate = 300;

export function generateStaticParams() {
	return getTopLevelCategories()
		.filter((c) => !c.external)
		.map((c) => ({ parent: c.slug }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ parent: string }>;
}): Promise<Metadata> {
	const { parent } = await params;
	const category = getParentCategory(parent);
	if (!category) return { title: "Category not found" };
	return {
		title: category.name,
		description: `Browse ${category.name} products in the American Scientific wholesale catalog.`,
	};
}

export default async function ParentCategoryPage({
	params,
}: {
	params: Promise<{ parent: string }>;
}) {
	const { parent } = await params;
	const category = getParentCategory(parent);
	if (!category || category.external) notFound();

	const products = await getProductsByParent(parent);
	const counts = await getLeafProductCounts();
	const theme = categoryTheme(category.slug);

	return (
		<div>
			{/* Themed header banner */}
			<div className={`bg-gradient-to-br ${theme.tile}`}>
				<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
					<nav className="text-sm text-white/70" aria-label="Breadcrumb">
						<Link href="/products" className="hover:text-white">
							Catalog
						</Link>
						<span className="mx-2">/</span>
						<span className="text-white">{category.name}</span>
					</nav>
					<div className="mt-4 flex items-center gap-4">
						<span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
							<CategoryIcon slug={category.slug} className="h-9 w-9" />
						</span>
						<div>
							<h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
								{category.name}
							</h1>
							<p className="mt-1 text-sm text-white/80">
								{products.length} {products.length === 1 ? "product" : "products"} · Sign in for
								your account pricing
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
				{/* Subcategories */}
				{category.children?.length ? (
					<div className="flex flex-wrap gap-2">
						{category.children.map((child) => (
							<Link
								key={child.slug}
								href={`/product-category/${category.slug}/${child.slug}`}
								className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
							>
								{child.name}
								<span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-500">
									{counts[child.slug] ?? 0}
								</span>
							</Link>
						))}
					</div>
				) : null}

				<ProductGrid products={products} />
			</div>
		</div>
	);
}
