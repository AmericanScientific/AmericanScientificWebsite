import type { Metadata } from "next";
import resources from "@/data/resources.json";
import { ResourcesTabs } from "@/components/ResourcesTabs";

export const metadata: Metadata = {
	title: "Resources · Teacher's Guides & Product Videos",
	description:
		"Teacher's guides, instruction manuals, and product demonstration videos for American Scientific products.",
};

interface ResourcesData {
	guides: { sku: string; title: string }[];
	videos: { sku: string; title: string; youtubeId: string }[];
}

/** Catalog PDFs (hosted in public/catalogs/). Add entries here as new catalogs land. */
const CATALOGS = [
	{
		title: "American Scientific Catalog (2021)",
		url: "/catalogs/american-scientific-catalog-2021.pdf",
		note: "Full product catalog",
	},
];

export default function ResourcesPage() {
	const { guides, videos } = resources as ResourcesData;
	return (
		<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
			<h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Resources</h1>
			<div className="mt-8">
				<ResourcesTabs guides={guides} videos={videos} catalogs={CATALOGS} />
			</div>
		</div>
	);
}
