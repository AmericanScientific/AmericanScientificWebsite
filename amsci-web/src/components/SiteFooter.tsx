import Link from "next/link";
import { getTopLevelCategories } from "@/data/categories";

/** Dark, multi-column footer with a brand gradient rule. */
export function SiteFooter() {
	const categories = getTopLevelCategories();

	return (
		<footer className="mt-20 bg-ink text-slate-300">
			<div className="brand-gradient h-1 w-full" />
			<div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
					<div>
						<p className="font-display text-xl font-bold tracking-tight text-white">
							American<span className="brand-gradient-text-light"> Scientific</span>
						</p>
						<p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
							Wholesale distributor, manufacturer, and exporter of scientific and STEM
							educational products for schools, districts, and institutions.
						</p>
						<p className="mt-4 text-sm text-slate-400">
							Columbus, OH
							<br />
							<a href="tel:+18884909002" className="hover:text-white">
								888-490-9002
							</a>
							<br />
							<a href="mailto:office@american-scientific.com" className="hover:text-white">
								office@american-scientific.com
							</a>
						</p>
					</div>

					<div>
						<h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Catalog</h3>
						<ul className="mt-4 space-y-2 text-sm">
							<li>
								<Link href="/products" className="text-slate-400 transition-colors hover:text-white">
									All Products
								</Link>
							</li>
							{categories.map((c) => (
								<li key={c.slug}>
									<Link
										href={c.external ? `/${c.slug}` : `/product-category/${c.slug}`}
										className="text-slate-400 transition-colors hover:text-white"
									>
										{c.name}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
					<p>© {2026} American Scientific, LLC. All rights reserved.</p>
				</div>
			</div>
		</footer>
	);
}
