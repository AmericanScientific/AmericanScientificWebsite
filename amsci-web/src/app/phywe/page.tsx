import type { Metadata } from "next";
import Link from "next/link";
import { CategoryIcon } from "@/components/CategoryIcon";

export const metadata: Metadata = {
	title: "PHYWE",
	description:
		"PHYWE laboratory and physics apparatus — a separate catalog, available by quote from American Scientific.",
};

/**
 * PHYWE placeholder.
 *
 * PHYWE is a SEPARATE catalog source, not part of the NetSuite item sync
 * (CLAUDE.md §4). It is quote-only and will be ingested through its own pipeline.
 * This page holds the route until that ingest exists.
 */
export default function PhywePage() {
	return (
		<div className="hero-surface relative overflow-hidden">
			<div className="grid-overlay absolute inset-0" />
			<div className="relative mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
				<span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
					<CategoryIcon slug="phywe" className="h-9 w-9" />
				</span>
				<span className="mt-6 inline-block text-xs font-semibold uppercase tracking-widest text-slate-400">
					Specialty Catalog
				</span>
				<h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
					PHYWE
				</h1>
				<p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
					PHYWE precision physics and laboratory apparatus is offered by American Scientific as a
					separate, quote-only catalog. This line is sourced independently of our main catalog and
					is not yet available to browse online.
				</p>
				<p className="mt-4 max-w-2xl text-slate-400">
					For pricing and availability on PHYWE products, contact our team and an account
					representative will follow up.
				</p>
				<div className="mt-8 flex flex-wrap gap-3">
					<a
						href="mailto:office@american-scientific.com?subject=PHYWE%20Product%20Inquiry"
						className="brand-gradient rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-105"
					>
						Request a PHYWE Quote
					</a>
					<Link
						href="/products"
						className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
					>
						Back to Catalog
					</Link>
				</div>
				<p className="mt-12 text-xs text-slate-500">
					Placeholder page — the PHYWE catalog ingest is not part of this shell.
				</p>
			</div>
		</div>
	);
}
