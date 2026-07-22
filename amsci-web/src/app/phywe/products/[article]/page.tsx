import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { phyweByArticle } from "@/data/phywe";

/**
 * PHYWE product detail. ISR on-demand: nothing is prerendered at build (the
 * catalog is ~3,200 items), but each page is generated on first request and
 * cached, and stays crawlable. Quote-only — no price, "Request a Quote" instead.
 */
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
	return [];
}

const QUOTE_EMAIL = "marketing@american-scientific.com";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ article: string }>;
}): Promise<Metadata> {
	const { article } = await params;
	const p = phyweByArticle(article);
	if (!p) return { title: "PHYWE product not found" };
	return {
		title: `${p.name} · PHYWE`,
		description: p.description ? p.description.slice(0, 155) : `PHYWE ${p.name} (Art. ${p.articleNo}) — available by quote from American Scientific.`,
	};
}

export default async function PhyweProductPage({
	params,
}: {
	params: Promise<{ article: string }>;
}) {
	const { article } = await params;
	const p = phyweByArticle(article);
	if (!p) notFound();

	const subject = encodeURIComponent(`PHYWE Quote Request — ${p.name} (${p.articleNo})`);
	const bodyText = encodeURIComponent(
		`I'd like a quote for the following PHYWE product:\n\n${p.name}\nArticle No: ${p.articleNo}\n\nQuantity: \nOrganization: \n`,
	);
	const quoteHref = `mailto:${QUOTE_EMAIL}?subject=${subject}&body=${bodyText}`;

	return (
		<div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
			<nav className="mb-8 text-sm text-slate-400" aria-label="Breadcrumb">
				<Link href="/phywe" className="hover:text-slate-700">PHYWE</Link>
				<span className="mx-2">/</span>
				<Link href="/phywe/products" className="hover:text-slate-700">Products</Link>
				<span className="mx-2">/</span>
				<Link href={`/phywe/products?category=${encodeURIComponent(p.category)}`} className="hover:text-slate-700">
					{p.category}
				</Link>
			</nav>

			<div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
				{/* Media */}
				<div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					{p.image ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={p.image} alt={p.name} className="h-full w-full object-contain" />
					) : (
						<span className="text-sm font-medium text-slate-300">No image available</span>
					)}
				</div>

				{/* Details */}
				<div className="flex flex-col">
					<span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-blue/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-blue ring-1 ring-inset ring-brand-blue/20">
						PHYWE · {p.category}
					</span>

					<h1 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
						{p.name}
					</h1>
					<p className="mt-2 text-sm text-slate-400">Article No. {p.articleNo}</p>
					{(p.focus || p.subcategory) && (
						<p className="mt-1 text-sm text-slate-400">
							{[p.category, p.focus, p.subcategory].filter(Boolean).join(" › ")}
						</p>
					)}

					{p.description && (
						<p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-slate-600">{p.description}</p>
					)}

					<div className="mt-8 flex flex-wrap gap-3">
						<a
							href={quoteHref}
							className="brand-gradient rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105"
						>
							Request a Quote
						</a>
						<Link
							href="/phywe#advisor"
							className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
						>
							Talk to an Advisor
						</Link>
					</div>
					<p className="mt-4 text-xs text-slate-400">
						PHYWE is a specialty line, priced and fulfilled by quote. Call 888-490-9002 or email {QUOTE_EMAIL}.
					</p>
				</div>
			</div>
		</div>
	);
}
