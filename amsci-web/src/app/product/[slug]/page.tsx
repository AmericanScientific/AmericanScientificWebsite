import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProducts, getProductBySlug } from "@/data/products";
import { productSlug } from "@/types/product";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import { AddToOrderButton } from "@/components/AddToOrderButton";

/** Pre-render a detail page for every mock product. */
export function generateStaticParams() {
	return getAllProducts().map((product) => ({ slug: productSlug(product) }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const product = getProductBySlug(slug);
	if (!product) return { title: "Product not found" };
	return {
		title: product.title,
		description: product.description,
	};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const product = getProductBySlug(slug);
	if (!product) notFound();

	return (
		<div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
			<nav className="mb-6 text-sm text-slate-500" aria-label="Breadcrumb">
				<Link href="/products" className="hover:text-blue-700">
					Products
				</Link>
				<span className="mx-2">/</span>
				<Link
					href={`/products?category=${encodeURIComponent(product.category)}`}
					className="hover:text-blue-700"
				>
					{product.category}
				</Link>
			</nav>

			<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
				<ProductImage
					product={product}
					className="aspect-square w-full rounded-xl border border-slate-200"
				/>

				<div className="flex flex-col">
					<span className="text-xs font-medium uppercase tracking-wider text-blue-700">
						{product.category}
					</span>
					<h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{product.title}</h1>
					<p className="mt-2 text-sm text-slate-500">SKU: {product.sku}</p>

					<div className="mt-4">
						<span className="text-3xl font-bold text-slate-900">{formatPrice(product.price)}</span>
						<span className="ml-2 text-sm text-slate-400">base price</span>
						<p className="mt-1 text-xs text-slate-500">
							Wholesale pricing is account-specific with quantity breaks. Sign in to see your
							negotiated price.
						</p>
					</div>

					<p className="mt-6 text-sm leading-relaxed text-slate-700">{product.description}</p>

					{product.grades.length > 0 && (
						<div className="mt-6">
							<h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
								Grade Levels
							</h2>
							<div className="mt-2 flex flex-wrap gap-2">
								{product.grades.map((grade) => (
									<span
										key={grade}
										className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
									>
										{grade}
									</span>
								))}
							</div>
						</div>
					)}

					<div className="mt-8">
						<AddToOrderButton sku={product.sku} />
					</div>
				</div>
			</div>
		</div>
	);
}
