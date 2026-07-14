import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopLevelCategories, getParentCategory } from "@/data/categories";
import { getProductsByParent, getLeafProductCounts } from "@/data/products";
import { ProductGrid } from "@/components/ProductGrid";
import { CategoryHero } from "@/components/CategoryHero";

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

	return (
		<div>
			<CategoryHero themeSlug={category.slug} title={category.name} count={products.length} />

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
