import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTopLevelCategories, getChildCategory } from "@/data/categories";
import { getProductsByLeaf } from "@/data/products";
import { ProductGrid } from "@/components/ProductGrid";
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

	const products = await getProductsByLeaf(child);

	return (
		<div>
			<CategoryHero
				themeSlug={parentCategory.slug}
				title={category.name}
				count={products.length}
				eyebrow={parentCategory.name}
			/>

			<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
				<ProductGrid products={products} />
			</div>
		</div>
	);
}
