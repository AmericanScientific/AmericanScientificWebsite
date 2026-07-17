import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getProductBySku, getProductsByLeaf } from "@/data/products";
import {
	allPages,
	pageBySlug,
	pageForSku,
	slugForPage,
	isMultiVariant,
	defaultMember,
	axisParts,
	splitLabel,
	labelsAreUsable,
	deriveVariantLabels,
	type VariantPage,
} from "@/data/variant-groups";
import type { Product } from "@/types/product";
import { getCategoryName, getParentOfLeaf } from "@/data/categories";
import { categoryTheme } from "@/lib/categoryTheme";
import { ProductImage } from "@/components/ProductImage";
import { ProductCard } from "@/components/ProductCard";
import { ProductVariantView, type VariantOption } from "@/components/ProductVariantView";
import { ProductPrice } from "@/components/ProductPrice";
import { CategoryIcon } from "@/components/CategoryIcon";

/** Re-read the cron-synced catalog from D1 at most this often (seconds). */
export const revalidate = 300;

/** Pre-render one page per consolidated product (975 name-based slugs). */
export async function generateStaticParams() {
	return allPages().map((page) => ({ slug: slugForPage(page) }));
}

/** Canonical page path (no ?sku= — variant params must not index as duplicates). */
function pagePath(page: VariantPage): string {
	return `/product/${slugForPage(page)}`;
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const page = pageBySlug(slug);
	if (!page) return { title: "Product not found" };

	// Canonical metadata reflects the default member (the ?sku= variants are
	// non-canonical and applied client-side).
	const product = await getProductBySku(defaultMember(page).item_number);

	return {
		title: product?.title ?? page.product_name,
		description: product?.description || undefined,
		alternates: { canonical: pagePath(page) },
	};
}

export default async function ProductPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	const page = pageBySlug(slug);

	// A legacy per-SKU URL (/product/3484-01) → 301 to the consolidated page,
	// deep-linking the member for multi-variant products.
	if (!page) {
		const bySku = pageForSku(slug);
		if (bySku) {
			const target = isMultiVariant(bySku) ? `${pagePath(bySku)}?sku=${slug}` : pagePath(bySku);
			permanentRedirect(target);
		}
		notFound();
	}

	// Category chrome is constant across a page's members (same product).
	const defaultProduct = await getProductBySku(defaultMember(page).item_number);
	if (!defaultProduct) notFound();
	const category = defaultProduct.category;
	const leafName = getCategoryName(category);
	const parent = getParentOfLeaf(category);
	const theme = categoryTheme(category);
	const categoryHref = parent
		? `/product-category/${parent.slug}/${category}`
		: `/product-category/${category}`;

	const currentSlug = slugForPage(page);
	const related = (await getProductsByLeaf(category))
		.filter((p) => (p.pageSlug ?? "") !== currentSlug)
		.slice(0, 4);

	return (
		<div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
			<nav className="mb-8 text-sm text-slate-400" aria-label="Breadcrumb">
				<Link href="/products" className="hover:text-slate-700">
					Catalog
				</Link>
				{parent && (
					<>
						<span className="mx-2">/</span>
						<Link href={`/product-category/${parent.slug}`} className="hover:text-slate-700">
							{parent.name}
						</Link>
					</>
				)}
				<span className="mx-2">/</span>
				<Link href={categoryHref} className="hover:text-slate-700">
					{leafName}
				</Link>
			</nav>

			{isMultiVariant(page) ? (
				<MultiVariant
					page={page}
					categorySlug={category}
					leafName={leafName}
					categoryHref={categoryHref}
				/>
			) : (
				<SingleProduct
					product={defaultProduct}
					categorySlug={category}
					leafName={leafName}
					categoryHref={categoryHref}
					chipClass={theme.chip}
				/>
			)}

			{/* Trust strip (constant) */}
			<ul className="mt-10 grid grid-cols-1 gap-3 border-t border-slate-200 pt-6 sm:grid-cols-3">
				{[
					{ t: "Wholesale direct", d: "Distributor & manufacturer" },
					{ t: "Volume pricing", d: "Quantity breaks by tier" },
					{ t: "PO checkout", d: "For approved accounts" },
				].map((f) => (
					<li key={f.t} className="text-sm">
						<p className="font-semibold text-slate-800">{f.t}</p>
						<p className="text-xs text-slate-400">{f.d}</p>
					</li>
				))}
			</ul>

			{related.length > 0 && (
				<section className="mt-16">
					<h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
						More in {leafName}
					</h2>
					<div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
						{related.map((p) => (
							<ProductCard key={p.pageSlug ?? p.internalId} product={p} />
						))}
					</div>
				</section>
			)}
		</div>
	);
}

/** Build the variant options for a multi-variant page from the catalog cache. */
async function MultiVariant({
	page,
	categorySlug,
	leafName,
	categoryHref,
}: {
	page: VariantPage;
	categorySlug: string;
	leafName: string;
	categoryHref: string;
}) {
	// Hydrate each member from the catalog cache (title/image/price/etc.).
	const members = (
		await Promise.all(
			page.members.map(async (m) => {
				const product = await getProductBySku(m.item_number);
				return product ? { m, product } : null;
			}),
		)
	).filter((x): x is { m: (typeof page.members)[number]; product: Product } => x !== null);

	if (members.length === 0) notFound();

	// Prefer the grouping's own labels, but only when they actually distinguish
	// the members. Otherwise derive from titles (fixes the "all labelled the
	// same" / truncated cases) and present as a single selector.
	const provided = members.map(({ m }) => m.variant_label ?? "");
	let axes = axisParts(page);
	let options: VariantOption[];

	if (labelsAreUsable(provided)) {
		options = members.map(({ m, product }) => {
			const values = splitLabel(m);
			const label = m.variant_label ?? product.title;
			return { product, label, values: values.length ? values : [label] };
		});
	} else {
		const derived =
			deriveVariantLabels(members.map(({ product }) => product.title)) ??
			members.map(({ product }) => product.sku);
		// Single selector under one heading (the whole axis string, or "Option").
		axes = [page.variant_axis || "Option"];
		options = members.map(({ product }, i) => ({
			product,
			label: derived[i],
			values: [derived[i]],
		}));
	}

	return (
		<ProductVariantView
			axes={axes}
			options={options}
			categorySlug={categorySlug}
			leafName={leafName}
			categoryHref={categoryHref}
		/>
	);
}

/** A single-item product (no selector) — the classic detail layout. */
function SingleProduct({
	product,
	categorySlug,
	leafName,
	categoryHref,
	chipClass,
}: {
	product: import("@/types/product").Product;
	categorySlug: string;
	leafName: string;
	categoryHref: string;
	chipClass: string;
}) {
	return (
		<div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
			<div>
				<ProductImage
					product={product}
					className="aspect-square w-full rounded-3xl shadow-lg shadow-slate-900/5"
					iconClassName="h-28 w-28"
				/>
			</div>

			<div className="flex flex-col">
				<Link
					href={categoryHref}
					className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${chipClass}`}
				>
					<CategoryIcon slug={categorySlug} className="h-3.5 w-3.5" />
					{leafName}
				</Link>

				<h1 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
					{product.title}
				</h1>
				<p className="mt-2 text-sm text-slate-400">SKU {product.sku}</p>

				{product.description && (
					<p className="mt-6 text-sm leading-relaxed text-slate-600">{product.description}</p>
				)}

				<ProductPrice sku={product.sku} title={product.title} imageUrl={product.imageUrl} />

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
