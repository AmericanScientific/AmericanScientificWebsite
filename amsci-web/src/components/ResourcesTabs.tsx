"use client";

import { useState } from "react";
import { TeacherGuideButtons } from "@/components/TeacherGuideButtons";
import { VideoCard } from "@/components/VideoCard";

interface Guide {
	sku: string;
	title: string;
}
interface Video {
	sku: string;
	title: string;
	youtubeId: string;
}
interface Catalog {
	title: string;
	url: string;
	note?: string;
}

type Tab = "guides" | "videos" | "catalogs";

/**
 * Resources page body: a segmented toggle across "Teacher's & Instruction
 * Guides", "Videos", and "Catalogs", each a 3-column grid. Guide cards reuse
 * TeacherGuideButtons; video cards use the click-to-play facade; catalog cards
 * link to same-origin PDFs (View opens, Download saves).
 */
export function ResourcesTabs({
	guides,
	videos,
	catalogs,
}: {
	guides: Guide[];
	videos: Video[];
	catalogs: Catalog[];
}) {
	const [tab, setTab] = useState<Tab>("guides");
	const btn = (active: boolean) =>
		`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
			active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
		}`;

	return (
		<div>
			{/* Toggle */}
			<div className="inline-flex flex-wrap rounded-full border border-slate-200 bg-white p-1 shadow-sm">
				<button type="button" onClick={() => setTab("guides")} className={btn(tab === "guides")}>
					Teacher&rsquo;s &amp; Instruction Guides
				</button>
				<button type="button" onClick={() => setTab("videos")} className={btn(tab === "videos")}>
					Videos
				</button>
				<button type="button" onClick={() => setTab("catalogs")} className={btn(tab === "catalogs")}>
					Catalogs
				</button>
			</div>

			{tab === "guides" && (
				<div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{guides.map((g) => (
						<div key={g.sku} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
							<h3 className="text-sm font-semibold leading-snug text-slate-900">{g.title}</h3>
							<p className="mt-0.5 text-xs text-slate-400">Item {g.sku}</p>
							<div className="mt-auto">
								<TeacherGuideButtons sku={g.sku} available />
							</div>
						</div>
					))}
				</div>
			)}

			{tab === "videos" && (
				<div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{videos.map((v) => (
						<VideoCard key={v.youtubeId} id={v.youtubeId} title={v.title} />
					))}
				</div>
			)}

			{tab === "catalogs" && (
				<div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{catalogs.map((c) => (
						<div key={c.url} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
							<span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/5 text-brand-blue">
								<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
									<path d="M4 4h10l6 6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
									<path d="M14 4v6h6" />
								</svg>
							</span>
							<h3 className="mt-3 text-sm font-semibold leading-snug text-slate-900">{c.title}</h3>
							{c.note && <p className="mt-0.5 text-xs text-slate-400">{c.note}</p>}
							<div className="mt-auto flex flex-wrap gap-2.5 pt-4">
								<a
									href={c.url}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-blue/5 px-4 py-2 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue/10"
								>
									View
								</a>
								<a
									href={c.url}
									download
									className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
								>
									Download
								</a>
							</div>
						</div>
					))}

					{/* Always invite a request for the current catalog. */}
					<div className="flex flex-col justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5 text-center">
						<h3 className="text-sm font-semibold text-slate-900">Looking for our latest catalog?</h3>
						<p className="mt-1 text-xs text-slate-500">Request the current American Scientific catalog and a rep will send it over.</p>
						<a
							href="mailto:marketing@american-scientific.com?subject=Catalog%20Request"
							className="brand-gradient mx-auto mt-4 inline-block rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105"
						>
							Request the Catalog
						</a>
					</div>
				</div>
			)}
		</div>
	);
}
