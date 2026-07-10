import type { Product } from "@/types/product";

/**
 * Placeholder product image.
 *
 * The real storefront renders `product.imageUrl` (NetSuite `custitem_imageurltext`).
 * In the shell we have no images, so we draw a labeled swatch keyed off the SKU —
 * enough to size and lay out the catalog without wiring up remote image domains.
 */
export function ProductImage({ product, className = "" }: { product: Product; className?: string }) {
	const initials = product.category
		.split(/\s|&/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase())
		.join("");

	return (
		<div
			className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 ${className}`}
			aria-hidden="true"
		>
			<span className="text-3xl font-semibold tracking-wide">{initials}</span>
			<span className="mt-1 text-xs font-medium uppercase tracking-wider">{product.sku}</span>
		</div>
	);
}
