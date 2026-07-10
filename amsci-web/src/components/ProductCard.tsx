import Link from "next/link";
import type { Product } from "@/types/product";
import { productSlug } from "@/types/product";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";

/** Catalog card: image, title, SKU, and base price. Links to the detail page. */
export function ProductCard({ product }: { product: Product }) {
	return (
		<Link
			href={`/product/${productSlug(product)}`}
			className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-shadow hover:shadow-md"
		>
			<ProductImage product={product} className="aspect-[4/3] w-full" />
			<div className="flex flex-1 flex-col gap-2 p-4">
				<span className="text-xs font-medium uppercase tracking-wider text-blue-700">
					{product.category}
				</span>
				<h3 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-blue-700">
					{product.title}
				</h3>
				<p className="text-xs text-slate-500">SKU: {product.sku}</p>
				<div className="mt-auto pt-2">
					<span className="text-base font-bold text-slate-900">{formatPrice(product.price)}</span>
					<span className="ml-1 text-xs text-slate-400">base</span>
				</div>
			</div>
		</Link>
	);
}
