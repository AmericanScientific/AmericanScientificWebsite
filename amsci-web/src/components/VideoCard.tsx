"use client";

import { useState } from "react";

/**
 * Product video card. Renders a lightweight facade (YouTube thumbnail + play
 * button) and only mounts the iframe on click — so a grid of 35 videos doesn't
 * load 35 iframes up front. Uses youtube-nocookie for privacy.
 */
export function VideoCard({ id, title }: { id: string; title: string }) {
	const [play, setPlay] = useState(false);
	return (
		<div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
			<div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
				{play ? (
					<iframe
						src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
						title={title}
						className="absolute inset-0 h-full w-full"
						allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
						allowFullScreen
					/>
				) : (
					<button
						type="button"
						onClick={() => setPlay(true)}
						className="group absolute inset-0 h-full w-full"
						aria-label={`Play video: ${title}`}
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
							alt=""
							loading="lazy"
							className="h-full w-full object-cover opacity-95 transition group-hover:opacity-100"
						/>
						<span className="absolute inset-0 flex items-center justify-center">
							<span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/30 backdrop-blur transition group-hover:scale-110 group-hover:bg-red-600">
								<svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 text-white" fill="currentColor" aria-hidden="true">
									<path d="M8 5v14l11-7z" />
								</svg>
							</span>
						</span>
					</button>
				)}
			</div>
			<h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{title}</h3>
		</div>
	);
}
