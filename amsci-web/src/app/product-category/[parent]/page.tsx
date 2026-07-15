import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTopLevelCategories, getParentCategory } from "@/data/categories";
import { getProductsByParent, getLeafProductCounts } from "@/data/products";
import { CategorySubfilter } from "@/components/CategorySubfilter";
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
				{/* Subcategory filter toggles + the (filtered) product grid */}
				<CategorySubfilter
					themeSlug={category.slug}
					subcategories={(category.children ?? []).map((child) => ({
						slug: child.slug,
						name: child.name,
						count: counts[child.slug] ?? 0,
					}))}
					products={products}
				/>
			</div>
		</div>
	);
}
