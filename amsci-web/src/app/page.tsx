import Link from "next/link";
import { CATEGORIES } from "@/types/product";
import { getAllProducts } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";

export default function Home() {
	const featured = getAllProducts().slice(0, 4);

	return (
		<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
			<section className="rounded-xl bg-slate-900 px-6 py-12 text-white sm:px-12">
				<div className="max-w-2xl">
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
						Scientific &amp; STEM supplies for schools and institutions
					</h1>
					<p className="mt-4 text-slate-300">
						American Scientific is a wholesale distributor, manufacturer, and exporter serving
						educators, districts, and laboratories. Browse the catalog and sign in for your
						account-specific pricing.
					</p>
					<div className="mt-6 flex flex-wrap gap-3">
						<Link
							href="/products"
							className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-blue-500"
						>
							Browse Catalog
						</Link>
						<button
							type="button"
							className="rounded-md border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800"
						>
							Request an Account
						</button>
					</div>
				</div>
			</section>

			<section className="mt-12">
				<h2 className="text-lg font-semibold text-slate-900">Shop by category</h2>
				<div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
					{CATEGORIES.map((category) => (
						<Link
							key={category}
							href={`/products?category=${encodeURIComponent(category)}`}
							className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-medium text-slate-800 transition-colors hover:border-blue-300 hover:text-blue-700"
						>
							{category}
						</Link>
					))}
				</div>
			</section>

			<section className="mt-12">
				<div className="flex items-baseline justify-between">
					<h2 className="text-lg font-semibold text-slate-900">Featured products</h2>
					<Link href="/products" className="text-sm font-medium text-blue-700 hover:underline">
						View all →
					</Link>
				</div>
				<div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
					{featured.map((product) => (
						<ProductCard key={product.internalId} product={product} />
					))}
				</div>
			</section>
		</div>
	);
}
