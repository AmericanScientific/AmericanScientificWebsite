import Link from "next/link";
import type { PhyweProduct } from "@/data/phywe";

/**
 * PHYWE product card for the catalog grid. Quote-only (no price). Image comes
 * straight from PHYWE's CDN (plain <img> — it's an external public CDN, not
 * routed through /api/media like NetSuite images).
 */
export function PhyweCard({ p }: { p: PhyweProduct }) {
	return (
		<Link
			href={`/phywe/products/${encodeURIComponent(p.articleNo)}`}
			className="card-hover group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-lg"
		>
			<div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-white">
				{p.image ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={p.image}
						alt={p.name}
						loading="lazy"
						className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
					/>
				) : (
					<span className="text-xs font-medium text-slate-300">No image</span>
				)}
			</div>
			<p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-brand-blue">{p.category}</p>
			<h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{p.name}</h3>
			<p className="mt-auto pt-2 text-xs text-slate-400">Art. {p.articleNo}</p>
		</Link>
	);
}
