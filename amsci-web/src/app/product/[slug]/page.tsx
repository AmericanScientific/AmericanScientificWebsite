import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProducts, getProductBySlug, getProductsByLeaf } from "@/data/products";
import { productSlug } from "@/types/product";
import { getCategoryName, getParentOfLeaf } from "@/data/categories";
import { categoryTheme } from "@/lib/categoryTheme";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import { ProductCard } from "@/components/ProductCard";
import { AddToOrderButton } from "@/components/AddToOrderButton";
import { CategoryIcon } from "@/components/CategoryIcon";

/** Re-read the cron-synced catalog from D1 at most this often (seconds). */
export const revalidate = 300;

/** Pre-render a detail page for every product (routes enumerated from the seed). */
export async function generateStaticParams() {
	const products = await getAllProducts();
	return products.map((product) => ({ slug: productSlug(product) }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const product = await getProductBySlug(slug);
	if (!product) return { title: "Product not found" };
	return {
		title: product.title,
		description: product.description,
	};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const product = await getProductBySlug(slug);
	if (!product) notFound();

	const leafName = getCategoryName(product.category);
	const parent = getParentOfLeaf(product.category);
	const theme = categoryTheme(product.category);
	const related = (await getProductsByLeaf(product.category))
		.filter((p) => p.internalId !== product.internalId)
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
				<Link
					href={parent ? `/product-category/${parent.slug}/${product.category}` : `/product-category/${product.category}`}
					className="hover:text-slate-700"
				>
					{leafName}
				</Link>
			</nav>

			<div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
				{/* Media */}
				<div>
					<ProductImage
						product={product}
						className="aspect-square w-full rounded-3xl shadow-lg shadow-slate-900/5"
						iconClassName="h-28 w-28"
					/>
				</div>

				{/* Details */}
				<div className="flex flex-col">
					<Link
						href={parent ? `/product-category/${parent.slug}/${product.category}` : `/product-category/${product.category}`}
						className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${theme.chip}`}
					>
						<CategoryIcon slug={product.category} className="h-3.5 w-3.5" />
						{leafName}
					</Link>

					<h1 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
						{product.title}
					</h1>
					<p className="mt-2 text-sm text-slate-400">SKU {product.sku}</p>

					{/* Price card */}
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

					<p className="mt-6 text-sm leading-relaxed text-slate-600">{product.description}</p>

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

					{/* Trust points */}
					<ul className="mt-8 grid grid-cols-1 gap-3 border-t border-slate-200 pt-6 sm:grid-cols-3">
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
				</div>
			</div>

			{/* Related */}
			{related.length > 0 && (
				<section className="mt-16">
					<h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
						More in {leafName}
					</h2>
					<div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
						{related.map((p) => (
							<ProductCard key={p.internalId} product={p} />
						))}
					</div>
				</section>
			)}
		</div>
	);
}
