import Link from "next/link";
import { getTopLevelCategories } from "@/data/categories";
import { categoryTheme } from "@/lib/categoryTheme";
import { CategoryIcon } from "@/components/CategoryIcon";

/**
 * Sticky, glassmorphic site header.
 *
 * A thin brand strip sits above a blurred nav bar with the am-sci logo and
 * taxonomy-driven navigation. Parents with children reveal an icon-accented
 * flyout of subcategories on hover/focus (pure CSS — stays a server component);
 * standalone nodes (Special) link straight through, and external sources (PHYWE)
 * link to their own page.
 */
export function SiteHeader() {
	const categories = getTopLevelCategories();

	return (
		<header className="sticky top-0 z-50">
			{/* Brand announcement strip */}
			<div className="brand-gradient text-white">
				<div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium sm:justify-between sm:px-6 lg:px-8">
					<span>Wholesale B2B pricing · Sign in to see your account tier</span>
					<span className="hidden sm:inline">📞 888-490-9002 · office@american-scientific.com</span>
				</div>
			</div>

			{/* Glass nav bar */}
			<div className="border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between gap-4 py-3">
						<Link href="/" aria-label="American Scientific — home" className="flex items-center">
							{/* Plain <img> avoids wiring a Cloudflare image loader in the shell. */}
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src="/am-sci-logo.png"
								alt="American Scientific"
								className="h-11 w-auto transition-transform duration-300 hover:scale-[1.02]"
								width={308}
								height={110}
							/>
						</Link>

						<div className="flex items-center gap-2 sm:gap-3">
							<button
								type="button"
								aria-label="Search catalog"
								className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:flex"
							>
								<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
									<circle cx="11" cy="11" r="7" />
									<path d="m20 20-3.2-3.2" />
								</svg>
							</button>
							<button
								type="button"
								className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:inline-flex"
							>
								Sign In
							</button>
							<button
								type="button"
								className="brand-gradient rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-105"
							>
								Request Account
							</button>
						</div>
					</div>

					{/* Category nav */}
					<nav aria-label="Product categories" className="-mx-1 hidden pb-2 md:block">
						<ul className="flex flex-wrap items-center gap-x-1 text-sm font-medium">
							<li>
								<Link
									href="/products"
									className="inline-flex items-center rounded-full px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
								>
									All Products
								</Link>
							</li>

							{categories.map((category) => {
								const hasChildren = !!category.children?.length;
								const href = category.external
									? `/${category.slug}`
									: `/product-category/${category.slug}`;
								const theme = categoryTheme(category.slug);

								if (!hasChildren) {
									return (
										<li key={category.slug}>
											<Link
												href={href}
												className="inline-flex items-center rounded-full px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
											>
												{category.name}
											</Link>
										</li>
									);
								}

								return (
									<li key={category.slug} className="group relative">
										<Link
											href={href}
											className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 group-focus-within:bg-slate-100"
										>
											{category.name}
											<svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
												<path d="m6 9 6 6 6-6" />
											</svg>
										</Link>

										{/* Flyout */}
										<div className="flyout invisible absolute left-0 top-full z-30 pt-2 opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
											<div className="w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10 ring-1 ring-black/5">
												<Link
													href={href}
													className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50"
												>
													<span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white ${theme.tile}`}>
														<CategoryIcon slug={category.slug} className="h-5 w-5" />
													</span>
													<span>
														<span className="block text-sm font-semibold text-slate-900">
															All {category.name}
														</span>
														<span className="block text-xs text-slate-400">
															Browse the full range
														</span>
													</span>
												</Link>
												<div className="my-1 border-t border-slate-100" />
												<ul className="grid grid-cols-1 gap-0.5">
													{category.children!.map((child) => (
														<li key={child.slug}>
															<Link
																href={`/product-category/${category.slug}/${child.slug}`}
																className="block rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
															>
																{child.name}
															</Link>
														</li>
													))}
												</ul>
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					</nav>

					{/* Compact nav for small screens */}
					<nav aria-label="Product categories" className="flex gap-2 overflow-x-auto pb-3 md:hidden">
						<Link href="/products" className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
							All
						</Link>
						{categories.map((category) => (
							<Link
								key={category.slug}
								href={category.external ? `/${category.slug}` : `/product-category/${category.slug}`}
								className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
							>
								{category.name}
							</Link>
						))}
					</nav>
				</div>
			</div>
		</header>
	);
}
