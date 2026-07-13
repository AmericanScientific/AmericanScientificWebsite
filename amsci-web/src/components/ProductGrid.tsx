import type { Product } from "@/types/product";
import { ProductCard } from "@/components/ProductCard";

/** Responsive grid of product cards, with a styled empty state. */
export function ProductGrid({ products }: { products: Product[] }) {
	if (products.length === 0) {
		return (
			<div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white/50 py-16 text-center">
				<p className="font-medium text-slate-600">No products in this category yet.</p>
				<p className="mt-1 text-sm text-slate-400">Check back soon — the catalog syncs from NetSuite.</p>
			</div>
		);
	}
	return (
		<div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{products.map((product) => (
				<ProductCard key={product.internalId} product={product} />
			))}
		</div>
	);
}
