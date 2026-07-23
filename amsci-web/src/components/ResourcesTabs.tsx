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

/**
 * Resources page body: a segmented toggle between "Teacher's & Instruction
 * Guides" and "Videos", each a 3-column grid. Guide cards reuse
 * TeacherGuideButtons (View/Download via /api/teacher-guide); video cards use the
 * click-to-play facade.
 */
export function ResourcesTabs({ guides, videos }: { guides: Guide[]; videos: Video[] }) {
	const [tab, setTab] = useState<"guides" | "videos">("guides");
	const btn = (active: boolean) =>
		`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
			active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
		}`;

	return (
		<div>
			{/* Toggle */}
			<div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
				<button type="button" onClick={() => setTab("guides")} className={btn(tab === "guides")}>
					Teacher&rsquo;s &amp; Instruction Guides
				</button>
				<button type="button" onClick={() => setTab("videos")} className={btn(tab === "videos")}>
					Videos
				</button>
			</div>

			{tab === "guides" ? (
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
			) : (
				<div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{videos.map((v) => (
						<VideoCard key={v.youtubeId} id={v.youtubeId} title={v.title} />
					))}
				</div>
			)}
		</div>
	);
}
