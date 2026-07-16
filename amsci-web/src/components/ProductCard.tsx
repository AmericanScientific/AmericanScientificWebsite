import Link from "next/link";
import type { Product } from "@/types/product";
import { productSlug } from "@/types/product";
import { getCategoryName } from "@/data/categories";
import { categoryTheme } from "@/lib/categoryTheme";
import { ProductImage } from "@/components/ProductImage";
import { CardPrice } from "@/components/CardPrice";

/** Catalog card: accent tile, category chip, title, SKU, and login-gated price. */
export function ProductCard({ product }: { product: Product }) {
	const theme = categoryTheme(product.category);
	const isGroup = (product.variantCount ?? 0) > 1;
	// Prefer the consolidated page slug; fall back to the SKU slug (which redirects).
	const href = `/product/${product.pageSlug ?? productSlug(product)}`;

	return (
		<Link
			href={href}
			className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5"
		>
			<div className="relative">
				<ProductImage product={product} className="aspect-[4/3] w-full" iconClassName="h-14 w-14" />
				<span
					className={`absolute left-2.5 top-2.5 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${theme.chip}`}
				>
					{getCategoryName(product.category)}
				</span>
				{isGroup && (
					<span className="absolute right-2.5 top-2.5 inline-flex items-center rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
						{product.variantCount} options
					</span>
				)}
			</div>

			<div className="flex flex-1 flex-col gap-2 p-4">
				<h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 transition-colors group-hover:text-brand-blue-deep">
					{product.title}
				</h3>
				{!isGroup && <p className="text-xs text-slate-400">SKU {product.sku}</p>}

				<div className="mt-auto flex items-end justify-between pt-3">
					<div>
						<CardPrice sku={product.sku} isGroup={isGroup} />
					</div>
					<span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all group-hover:bg-brand-blue group-hover:text-white">
						<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
							<path d="M5 12h14M13 6l6 6-6 6" />
						</svg>
					</span>
				</div>
			</div>
		</Link>
	);
}
