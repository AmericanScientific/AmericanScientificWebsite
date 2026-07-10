import Link from "next/link";
import { CATEGORIES } from "@/types/product";

/**
 * Site header: American Scientific wordmark + top-level category navigation.
 *
 * Categories link to the catalog filtered by their top-level `class`. Ordering
 * and pricing are login-gated in the real B2B storefront; the shell exposes a
 * placeholder account action to hold that space.
 */
export function SiteHeader() {
	return (
		<header className="border-b border-slate-200 bg-white">
			<div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between gap-4">
					<Link href="/" className="flex flex-col leading-tight">
						<span className="text-xl font-bold tracking-tight text-slate-900">
							American Scientific
						</span>
						<span className="text-xs font-medium uppercase tracking-widest text-blue-700">
							Wholesale STEM &amp; Laboratory Supply
						</span>
					</Link>
					<div className="flex items-center gap-3 text-sm">
						<span className="hidden text-slate-500 sm:inline">Account pricing at sign in</span>
						<button
							type="button"
							className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
						>
							Sign In
						</button>
					</div>
				</div>
				<nav aria-label="Product categories">
					<ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium">
						<li>
							<Link href="/products" className="text-slate-700 transition-colors hover:text-blue-700">
								All Products
							</Link>
						</li>
						{CATEGORIES.map((category) => (
							<li key={category}>
								<Link
									href={`/products?category=${encodeURIComponent(category)}`}
									className="text-slate-700 transition-colors hover:text-blue-700"
								>
									{category}
								</Link>
							</li>
						))}
					</ul>
				</nav>
			</div>
		</header>
	);
}
