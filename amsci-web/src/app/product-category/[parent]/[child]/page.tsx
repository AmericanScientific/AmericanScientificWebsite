import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopLevelCategories, getChildCategory } from "@/data/categories";
import { categoryTheme } from "@/lib/categoryTheme";
import { getProductsByLeaf } from "@/data/products";
import { ProductGrid } from "@/components/ProductGrid";
import { CategoryIcon } from "@/components/CategoryIcon";

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
	const theme = categoryTheme(parentCategory.slug);

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
						<Link href={`/product-category/${parentCategory.slug}`} className="hover:text-white">
							{parentCategory.name}
						</Link>
						<span className="mx-2">/</span>
						<span className="text-white">{category.name}</span>
					</nav>
					<div className="mt-4 flex items-center gap-4">
						<span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
							<CategoryIcon slug={parentCategory.slug} className="h-9 w-9" />
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
				<ProductGrid products={products} />
			</div>
		</div>
	);
}
