import Link from "next/link";
import { getTopLevelCategories } from "@/data/categories";
import { categoryTheme } from "@/lib/categoryTheme";
import { getListingProducts, getLeafProductCounts, getProductsByParent } from "@/data/products";
import { productSlug } from "@/types/product";
import { mediaProxyUrl } from "@/lib/media";
import { ProductCard } from "@/components/ProductCard";
import { CategoryIcon } from "@/components/CategoryIcon";
import { HeroCategoryTiles } from "@/components/HeroCategoryTiles";
import { HeroNetwork } from "@/components/HeroNetwork";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { SecretCircles } from "@/components/SecretCircles";
import type { BubbleItem } from "@/components/CategoryBubbles";

/** Max product images shipped per category for the hero bubble collage. */
const BUBBLES_PER_CATEGORY = 30;

/** Build the per-category image pool for the hero bubbles (server-side, so the
 *  full catalog never ships to the client). Only products with a usable image. */
async function buildBubbleData(): Promise<Record<string, BubbleItem[]>> {
	const out: Record<string, BubbleItem[]> = {};
	for (const category of getTopLevelCategories()) {
		const items: BubbleItem[] = [];
		for (const p of await getProductsByParent(category.slug)) {
			const src = mediaProxyUrl(p.imageUrl);
			if (!src) continue;
			items.push({ id: p.internalId, slug: productSlug(p), title: p.title, src });
			if (items.length >= BUBBLES_PER_CATEGORY) break;
		}
		out[category.slug] = items;
	}
	return out;
}

/** Re-read the cron-synced catalog from D1 at most this often (seconds). */
export const revalidate = 300;

export default async function Home() {
	const featured = (await getListingProducts()).slice(0, 4);
	const categories = getTopLevelCategories();
	const counts = await getLeafProductCounts();
	const bubblesByCategory = await buildBubbleData();

	return (
		<>
			<RevealOnScroll />

			{/* ── Hero ─────────────────────────────────────────────────────────── */}
			<section className="hero-surface relative overflow-hidden">
				{/* Ambient: three brand blobs breathing behind the content */}
				<div className="hero-mesh" aria-hidden="true">
					<span className="hero-blob hero-blob-red" />
					<span className="hero-blob hero-blob-blue" />
					<span className="hero-blob hero-blob-plum" />
				</div>
				<div className="grid-overlay absolute inset-0" />
				{/* Signature graphic as ambient backdrop — glows through the tiles on the
				    right, fades out before it reaches the headline on the left. */}
				<div
					className="pointer-events-none absolute inset-0 z-0 hidden opacity-60 lg:block"
					style={{
						maskImage: "linear-gradient(105deg, transparent 32%, black 72%)",
						WebkitMaskImage: "linear-gradient(105deg, transparent 32%, black 72%)",
					}}
					aria-hidden="true"
				>
					<HeroNetwork fill showLabel={false} />
				</div>
				<div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28 lg:px-8">
					<div>
						<span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur">
							<span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400 text-emerald-400" />
							Wholesale direct · Distributor &amp; manufacturer
						</span>
						<h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
							Scientific supply,
							<br />
							<span className="brand-gradient-text-light">engineered for educators.</span>
						</h1>
						<p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
							American Scientific is a wholesale distributor, manufacturer, and exporter serving
							schools, districts, and laboratories. Browse the catalog and sign in for your
							account-specific tiered pricing.
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<Link
								href="/products"
								className="brand-gradient rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105"
							>
								Browse Catalog
							</Link>
							<button
								type="button"
								className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
							>
								Request an Account
							</button>
						</div>
					</div>

					{/* Floating glass category tiles */}
					<div className="relative hidden lg:block">
						<HeroCategoryTiles bubblesByCategory={bubblesByCategory} />
					</div>
				</div>

				{/* Stats bar */}
				<div className="relative border-t border-white/10">
					<div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/10 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
						{[
							{ n: "Wholesale", l: "Buy direct" },
							{ n: "4", l: "Core disciplines" },
							{ n: "K–College", l: "Grade coverage" },
							{ n: "Tiered", l: "Account pricing" },
						].map((s) => (
							<div key={s.l} className="px-2 py-6 text-center sm:py-8">
								<p className="font-display text-2xl font-bold text-white sm:text-3xl">{s.n}</p>
								<p className="mt-1 text-xs uppercase tracking-wider text-slate-400">{s.l}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Shop by category ─────────────────────────────────────────────── */}
			<section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
				<div className="reveal flex items-end justify-between">
					<div>
						<h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
							Shop by category
						</h2>
						<p className="mt-2 text-slate-500">Curriculum-aligned equipment across every discipline.</p>
					</div>
					<Link href="/products" className="hidden text-sm font-semibold text-brand-blue-deep hover:underline sm:inline">
						View all →
					</Link>
				</div>

				<div className="reveal-stagger mt-8 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{categories.map((category) => {
						const theme = categoryTheme(category.slug);
						const childCount = category.children?.length ?? 0;
						const productCount = category.children?.reduce((n, c) => n + (counts[c.slug] ?? 0), 0) ?? 0;
						return (
							<Link
								key={category.slug}
								href={category.external ? `/${category.slug}` : `/product-category/${category.slug}`}
								className="card-hover group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 hover:shadow-lg"
							>
								<span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${theme.tile}`}>
									<CategoryIcon slug={category.slug} className="h-7 w-7" />
								</span>
								<span className="min-w-0">
									<span className="block font-semibold text-slate-900">{category.name}</span>
									<span className="block text-sm text-slate-400">
										{category.external
											? "Specialty catalog · by quote"
											: childCount
												? `${childCount} subcategories · ${productCount} products`
												: "Featured & clearance"}
									</span>
								</span>
								<svg viewBox="0 0 24 24" className="ml-auto h-5 w-5 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
									<path d="M5 12h14M13 6l6 6-6 6" />
								</svg>
							</Link>
						);
					})}
				</div>
			</section>

			{/* ── Featured products ────────────────────────────────────────────── */}
			<section className="dot-grid border-y border-slate-200/70 bg-white/50">
				<div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
					<div className="reveal flex items-end justify-between">
						<h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
							Featured products
						</h2>
						<Link href="/products" className="text-sm font-semibold text-brand-blue-deep hover:underline">
							View all →
						</Link>
					</div>
					<div className="reveal-stagger mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
						{featured.map((product) => (
							<ProductCard key={product.internalId} product={product} />
						))}
					</div>
				</div>
			</section>

			{/* ── CTA band ─────────────────────────────────────────────────────── */}
			<section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
				<div className="hero-surface relative overflow-hidden rounded-3xl px-8 py-12 text-center sm:px-16 sm:py-16">
					<div className="grid-overlay absolute inset-0" />
					<div className="reveal relative mx-auto max-w-2xl">
						<h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
							Ready to order at your account price?
						</h2>
						<p className="mt-4 text-slate-300">
							Create a wholesale account to unlock tiered pricing, quantity breaks, and
							purchase-order checkout. Guests can browse; pricing is account-specific.
						</p>
						<div className="mt-8 flex flex-wrap justify-center gap-3">
							<button
								type="button"
								className="brand-gradient rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-105"
							>
								Request an Account
							</button>
							<Link
								href="/products"
								className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
							>
								Browse Catalog
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Four circles under the CTA band — hidden sequence puzzle. */}
			<section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
				<SecretCircles />
			</section>
		</>
	);
}
