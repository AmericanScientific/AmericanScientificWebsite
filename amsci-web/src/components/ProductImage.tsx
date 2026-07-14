import type { Product } from "@/types/product";
import { categoryTheme } from "@/lib/categoryTheme";
import { CategoryIcon } from "@/components/CategoryIcon";
import { mediaProxyUrl } from "@/lib/media";

/**
 * Product image.
 *
 * Renders the real NetSuite image (`product.imageUrl`, a public File Cabinet URL)
 * routed through our `/api/media` proxy — which fetches it server-side and
 * re-serves over our origin, fixing NetSuite's cross-origin hotlink block and any
 * mixed content. When a product has no image (a handful of items), we fall back to
 * a category-accented gradient tile with the family icon and SKU.
 */
export function ProductImage({
	product,
	className = "",
	iconClassName = "h-16 w-16",
}: {
	product: Product;
	className?: string;
	iconClassName?: string;
}) {
	const theme = categoryTheme(product.category);
	const src = mediaProxyUrl(product.imageUrl);

	if (src) {
		return (
			<div className={`relative overflow-hidden bg-white ${className}`}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={src}
					alt={product.title}
					className="h-full w-full object-contain p-3"
					loading="lazy"
				/>
			</div>
		);
	}

	return (
		<div
			className={`relative overflow-hidden bg-gradient-to-br ${theme.tile} ${className}`}
			aria-hidden="true"
		>
			{/* Soft light bloom */}
			<div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
			<div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:16px_16px]" />

			{/* Family icon watermark */}
			<div className="absolute inset-0 flex items-center justify-center text-white/90">
				<CategoryIcon slug={product.category} className={iconClassName} />
			</div>

			{/* SKU chip */}
			<div className="absolute bottom-2.5 left-2.5">
				<span className="rounded-md bg-black/25 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
					{product.sku}
				</span>
			</div>
		</div>
	);
}
