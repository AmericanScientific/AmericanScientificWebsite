import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { fetchNetSuiteItem, type NetSuiteItem } from "@/lib/netsuite";
import { findLeafByName } from "@/data/categories";
import { categoryTheme } from "@/lib/categoryTheme";
import { formatPrice } from "@/lib/format";
import {
	toHttps,
	parseDescription,
	extractYouTubeId,
	trimForMeta,
	splitKeywords,
} from "@/lib/content";
import { mediaProxyUrl } from "@/lib/media";
import { OrderControls } from "@/components/OrderControls";
import { CategoryIcon } from "@/components/CategoryIcon";

/**
 * LIVE single-item template. Fetches item 2420 from NetSuite on the server on
 * every request (never at build — no build-time secret dependency; the Worker
 * env supplies secrets at request time). This is the layout we'll generalize to
 * /product/[slug] once the whole catalog is wired in.
 */
export const dynamic = "force-dynamic";

/** Item under design. */
const PREVIEW_ITEM_ID = 2420;

/** Cache within a single request so the page + generateMetadata share one fetch. */
const getItem = cache((): Promise<NetSuiteItem | null> => fetchNetSuiteItem(PREVIEW_ITEM_ID));

export async function generateMetadata(): Promise<Metadata> {
	let item: NetSuiteItem | null = null;
	try {
		item = await getItem();
	} catch {
		// Fall through to defaults if NetSuite is unavailable at request time.
	}
	if (!item) return { title: "Product preview" };

	return {
		title: item.title,
		description: trimForMeta(item.description),
		keywords: splitKeywords(item.searchKeywords),
	};
}

export default async function ItemPreviewPage() {
	let item: NetSuiteItem | null = null;
	let error: string | null = null;
	try {
		item = await getItem();
	} catch (err) {
		error = err instanceof Error ? err.message : String(err);
	}

	if (error) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
				<h1 className="font-display text-2xl font-bold text-slate-900">Couldn’t load this item</h1>
				<p className="mt-3 text-sm text-slate-500">
					The live NetSuite fetch failed. This is a diagnostic preview — check that the NetSuite
					secrets are configured.
				</p>
				<p className="mx-auto mt-4 max-w-xl break-words rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-500">
					{error}
				</p>
			</div>
		);
	}

	if (!item) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
				<h1 className="font-display text-2xl font-bold text-slate-900">Item not found</h1>
				<p className="mt-3 text-sm text-slate-500">No NetSuite item with that internal ID.</p>
			</div>
		);
	}

	// ── Derived / shaped values ──────────────────────────────────────────────
	// Route the image through our proxy (fixes NetSuite cross-origin hotlink block
	// + mixed content). The Teacher's Guide is a direct download link the user
	// clicks, so it only needs https coercion — no proxy.
	const imageUrl = mediaProxyUrl(item.imageUrl);
	const guideUrl = toHttps(item.teachersGuideUrl);
	const videoId = extractYouTubeId(item.youtubeEmbed);
	const { paragraphs, bullets } = parseDescription(item.description);
	const cat = item.category ? findLeafByName(item.category) : undefined;
	const theme = categoryTheme(cat?.parent.slug ?? "");

	return (
		<div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
			{/* Breadcrumb */}
			<nav className="mb-8 text-sm text-slate-400" aria-label="Breadcrumb">
				<Link href="/products" className="hover:text-slate-700">
					Catalog
				</Link>
				{cat ? (
					<>
						<span className="mx-2">/</span>
						<Link href={`/product-category/${cat.parent.slug}`} className="hover:text-slate-700">
							{cat.parent.name}
						</Link>
						<span className="mx-2">/</span>
						<Link
							href={`/product-category/${cat.parent.slug}/${cat.leaf.slug}`}
							className="hover:text-slate-700"
						>
							{cat.leaf.name}
						</Link>
					</>
				) : item.category ? (
					<>
						<span className="mx-2">/</span>
						<span className="text-slate-600">{item.category}</span>
					</>
				) : null}
			</nav>

			<div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
				{/* ── Media column ──────────────────────────────────────────────── */}
				<div className="flex flex-col gap-6">
					<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
						{imageUrl ? (
							/* eslint-disable-next-line @next/next/no-img-element */
							<img
								src={imageUrl}
								alt={item.title}
								className="aspect-square w-full bg-white object-contain p-6"
							/>
						) : (
							<div className={`flex aspect-square w-full items-center justify-center bg-gradient-to-br text-white ${theme.tile}`}>
								<CategoryIcon slug={cat?.leaf.slug ?? "physics-physical-science"} className="h-24 w-24" />
							</div>
						)}
					</div>

					{videoId && (
						<figure>
							<figcaption className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
								Product Video
							</figcaption>
							<div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm">
								<iframe
									src={`https://www.youtube-nocookie.com/embed/${videoId}`}
									title={`${item.title} — product video`}
									className="h-full w-full"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
									allowFullScreen
									loading="lazy"
								/>
							</div>
						</figure>
					)}
				</div>

				{/* ── Details column ────────────────────────────────────────────── */}
				<div className="flex flex-col">
					<div className="flex flex-wrap items-center gap-2">
						{cat && (
							<Link
								href={`/product-category/${cat.parent.slug}/${cat.leaf.slug}`}
								className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${theme.chip}`}
							>
								<CategoryIcon slug={cat.leaf.slug} className="h-3.5 w-3.5" />
								{cat.leaf.name}
							</Link>
						)}
						{item.grades && (
							<span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
								Grades {item.grades}
							</span>
						)}
					</div>

					<h1 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
						{item.title}
					</h1>
					<p className="mt-2 text-sm text-slate-400">SKU {item.sku}</p>

					{/* Price + order block */}
					<div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						{/*
						 * PLACEHOLDER PRICING. Shows the base (price level 1) value only.
						 * On the live site this becomes login-gated and tier-resolved via
						 * resolvePrice(itemId, priceLevel, qty) against NetSuite's real
						 * tiered/quantity-break matrix (CLAUDE.md §2, §4) — never the flat
						 * base price for a signed-in account.
						 */}
						{item.basePrice != null ? (
							<div className="flex items-baseline gap-2">
								<span className="font-display text-4xl font-bold tracking-tight text-slate-900">
									{formatPrice(item.basePrice)}
								</span>
								<span className="text-sm font-medium text-slate-400">base price</span>
							</div>
						) : (
							<p className="text-sm font-medium text-slate-500">Price available at sign in</p>
						)}
						<p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
							<svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-brand-blue" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
								<rect x="3" y="11" width="18" height="10" rx="2" />
								<path d="M7 11V7a5 5 0 0 1 10 0v4" />
							</svg>
							Wholesale pricing is account-specific with quantity breaks. Sign in to see your tier.
						</p>
						<div className="mt-5">
							<OrderControls sku={item.sku} />
						</div>
					</div>

					{/* Description */}
					{(paragraphs.length > 0 || bullets.length > 0) && (
						<div className="mt-6 space-y-3 text-sm leading-relaxed text-slate-600">
							{paragraphs.map((p, i) => (
								<p key={i}>{p}</p>
							))}
							{bullets.length > 0 && (
								<ul className="space-y-1.5">
									{bullets.map((b, i) => (
										<li key={i} className="flex gap-2">
											<span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${theme.dot}`} />
											<span>{b}</span>
										</li>
									))}
								</ul>
							)}
						</div>
					)}

					{/* Size — conditional (this item has none, so it should not appear) */}
					{item.size && (
						<dl className="mt-6 flex gap-2 border-t border-slate-200 pt-4 text-sm">
							<dt className="font-semibold text-slate-700">Size</dt>
							<dd className="text-slate-500">{item.size}</dd>
						</dl>
					)}

					{/* Teacher's Guide */}
					{guideUrl && (
						<a
							href={guideUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:shadow-md"
						>
							<svg viewBox="0 0 24 24" className="h-5 w-5 text-brand-red" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
								<path d="M14 3v4a1 1 0 0 0 1 1h4" />
								<path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
								<path d="M12 11v6M9.5 14.5 12 17l2.5-2.5" />
							</svg>
							Download Teacher’s Guide (PDF)
						</a>
					)}
				</div>
			</div>

			<p className="mt-12 text-center text-xs text-slate-400">
				Live from NetSuite · internal ID {item.internalId} · template for /product/[slug]
			</p>
		</div>
	);
}
