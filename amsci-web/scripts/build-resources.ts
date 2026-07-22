/**
 * Build src/data/resources.json — the Resources page data (teacher's guides +
 * product videos). READ-ONLY against NetSuite (SuiteQL only).
 *
 *  - Guides: the already-validated working guides (src/data/teacher_guides.json),
 *    joined with product titles from NetSuite. The PDF itself is served by
 *    /api/teacher-guide?sku=… (built in the teacher-guides feature).
 *  - Videos: online items with a YouTube embed (`custitemyoutubeembedcode`); the
 *    YouTube id is extracted from the embed iframe so the page can render a clean
 *    click-to-play facade.
 *
 * Usage (from amsci-web/, creds from .dev.vars):  npx tsx scripts/build-resources.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { NetSuiteClient } from "../src/lib/netsuite/client";

dotenv.config({ path: resolve(process.cwd(), ".dev.vars"), override: true });

const OUT = resolve(process.cwd(), "src/data/resources.json");
const GUIDES_IN = resolve(process.cwd(), "src/data/teacher_guides.json");

interface Row {
	itemid: string | null;
	storedisplayname: string | null;
	tg?: string | null;
	embed?: string | null;
}

/** Extract the YouTube video id from a (possibly HTML-escaped) embed iframe. */
function youtubeId(embed: string): string | null {
	const m = embed.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/i);
	return m ? m[1] : null;
}

async function main() {
	const client = NetSuiteClient.fromEnv(process.env);
	console.log("\nBuild resources.json — NetSuite (READ-ONLY)\n");

	// --- Guides: working set from teacher_guides.json, titled from NetSuite ---
	const guideMap = JSON.parse(readFileSync(GUIDES_IN, "utf-8")) as Record<string, { guide?: string }>;
	const workingGuideSkus = new Set(
		Object.entries(guideMap)
			.filter(([, v]) => v.guide)
			.map(([sku]) => sku.toLowerCase()),
	);
	const titleRows = await client.suiteql<Row>(
		"SELECT itemid AS itemid, storedisplayname AS storedisplayname FROM item " +
			"WHERE isonline='T' AND isinactive='F' AND custitemtg_url IS NOT NULL",
		{ limit: 1000 },
	);
	const guides = titleRows.items
		.map((r) => ({ sku: (r.itemid ?? "").trim(), title: (r.storedisplayname ?? r.itemid ?? "").trim() }))
		.filter((g) => g.sku && workingGuideSkus.has(g.sku.toLowerCase()))
		.sort((a, b) => a.title.localeCompare(b.title));

	// --- Videos: online items with a YouTube embed ---
	const videoRows = await client.suiteql<Row>(
		"SELECT itemid AS itemid, storedisplayname AS storedisplayname, custitemyoutubeembedcode AS embed FROM item " +
			"WHERE isonline='T' AND isinactive='F' AND custitemyoutubeembedcode IS NOT NULL",
		{ limit: 1000 },
	);
	const seenVid = new Set<string>();
	const videos = videoRows.items
		.map((r) => {
			const id = youtubeId(r.embed ?? "");
			return id ? { sku: (r.itemid ?? "").trim(), title: (r.storedisplayname ?? r.itemid ?? "").trim(), youtubeId: id } : null;
		})
		.filter((v): v is { sku: string; title: string; youtubeId: string } => !!v && !!v.title)
		// One card per distinct video (some SKUs share a clip).
		.filter((v) => (seenVid.has(v.youtubeId) ? false : (seenVid.add(v.youtubeId), true)))
		.sort((a, b) => a.title.localeCompare(b.title));

	writeFileSync(OUT, JSON.stringify({ guides, videos }, null, "\t") + "\n", "utf-8");
	console.log(`Guides: ${guides.length}  |  Videos: ${videos.length} (deduped by video id)`);
	console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
