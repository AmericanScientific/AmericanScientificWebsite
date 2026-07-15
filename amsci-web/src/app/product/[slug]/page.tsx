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
	type VariantPage,
} from "@/data/variant-groups";
import { getCategoryName, getParentOfLeaf } from "@/data/categories";
import { categoryTheme } from "@/lib/categoryTheme";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import { ProductCard } from "@/components/ProductCard";
import { ProductVariantView, type VariantOption } from "@/components/ProductVariantView";
import { AddToOrderButton } from "@/components/AddToOrderButton";
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
	const axes = axisParts(page);
	const options = (
		await Promise.all(
			page.members.map(async (m): Promise<VariantOption | null> => {
				const product = await getProductBySku(m.item_number);
				if (!product) return null;
				const values = splitLabel(m);
				const label = m.variant_label || m.store_name || product.title || m.item_number;
				return { product, label, values: values.length ? values : [label] };
			}),
		)
	).filter((o): o is VariantOption => o !== null);

	if (options.length === 0) notFound();

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

				<div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="flex items-baseline gap-2">
						<span className="font-display text-4xl font-bold tracking-tight text-slate-900">
							{formatPrice(product.price)}
						</span>
						<span className="text-sm font-medium text-slate-400">base price</span>
					</div>
					<p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
						<svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-blue" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
							<rect x="3" y="11" width="18" height="10" rx="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
						Wholesale pricing is account-specific with quantity breaks. Sign in to see your
						negotiated tier.
					</p>
					<div className="mt-5">
						<AddToOrderButton sku={product.sku} />
					</div>
				</div>

				{product.description && (
					<p className="mt-6 text-sm leading-relaxed text-slate-600">{product.description}</p>
				)}

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
