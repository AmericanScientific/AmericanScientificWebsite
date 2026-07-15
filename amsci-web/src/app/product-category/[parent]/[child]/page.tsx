import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTopLevelCategories, getChildCategory } from "@/data/categories";
import { getProductsByParent, getProductsByLeaf, getLeafProductCounts } from "@/data/products";
import { CategorySubfilter } from "@/components/CategorySubfilter";
import { CategoryHero } from "@/components/CategoryHero";

/**
 * Leaf category landing page.
 *
 * URL shape (`/product-category/[parent]/[child]`) preserves the current site's
 * category URLs for SEO (CLAUDE.md §8). Lists the products in a single leaf
 * category.
 */
/** Re-read the cron-synced catalog from D1 at most this often (seconds). */
export const revalidate = 300;

export function generateStaticParams() {
	return getTopLevelCategories().flatMap((parent) =>
		(parent.children ?? []).map((child) => ({ parent: parent.slug, child: child.slug })),
	);
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ parent: string; child: string }>;
}): Promise<Metadata> {
	const { parent, child } = await params;
	const category = getChildCategory(parent, child);
	if (!category) return { title: "Category not found" };
	return {
		title: category.name,
		description: `Browse ${category.name} products in the American Scientific wholesale catalog.`,
	};
}

export default async function LeafCategoryPage({
	params,
}: {
	params: Promise<{ parent: string; child: string }>;
}) {
	const { parent, child } = await params;
	const parentCategory = getTopLevelCategories().find((c) => c.slug === parent);
	const category = getChildCategory(parent, child);
	if (!parentCategory || !category) notFound();

	// The hero count reflects this leaf; the grid below shows every product under
	// the parent so the pills can filter across siblings, with this leaf pre-lit.
	const leafProducts = await getProductsByLeaf(child);
	const parentProducts = await getProductsByParent(parent);
	const counts = await getLeafProductCounts();

	return (
		<div>
			<CategoryHero
				themeSlug={parentCategory.slug}
				title={category.name}
				count={leafProducts.length}
				eyebrow={parentCategory.name}
			/>

			<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
				<CategorySubfilter
					themeSlug={parentCategory.slug}
					subcategories={(parentCategory.children ?? []).map((c) => ({
						slug: c.slug,
						name: c.name,
						count: counts[c.slug] ?? 0,
					}))}
					products={parentProducts}
					initialSelected={[child]}
				/>
			</div>
		</div>
	);
}
