/**
 * D1 access for the catalog cache. Runtime-agnostic (works in the storefront
 * Worker and the sync Worker). Maps between D1 rows and `CatalogRecord`.
 *
 * `gallery` and `grades` are JSON-encoded text columns (SQLite has no arrays).
 * `synced_at` stamps every row with the run that wrote it, so a full sync can
 * prune items that fell out of the catalog with a single cheap DELETE.
 */
import type { CatalogRecord } from "./types";

/** Shape of a `products` row as returned by D1. */
interface ProductRow {
	internal_id: string;
	sku: string;
	title: string;
	description: string;
	price: number | null;
	image: string | null;
	gallery: string;
	grades: string;
	category_name: string | null;
	item_type: string | null;
	size: string | null;
	search_keywords: string | null;
	last_modified: string | null;
}

function parseJsonArray(v: string | null | undefined): string[] {
	if (!v) return [];
	try {
		const parsed = JSON.parse(v);
		return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
	} catch {
		return [];
	}
}

function rowToRecord(r: ProductRow): CatalogRecord {
	return {
		internalId: r.internal_id,
		sku: r.sku ?? "",
		title: r.title ?? "",
		description: r.description ?? "",
		price: r.price ?? null,
		image: r.image ?? null,
		gallery: parseJsonArray(r.gallery),
		grades: parseJsonArray(r.grades),
		categoryName: r.category_name ?? null,
		itemType: r.item_type ?? null,
		size: r.size ?? null,
		searchKeywords: r.search_keywords ?? null,
		lastModified: r.last_modified ?? null,
	};
}

/** Read the whole catalog from D1. Returns [] if the table is empty/missing. */
export async function readCatalogFromD1(db: D1Database): Promise<CatalogRecord[]> {
	const { results } = await db.prepare("SELECT * FROM products").all<ProductRow>();
	return (results ?? []).map(rowToRecord);
}

/**
 * Resolve base prices for a set of SKUs with a single indexed query, instead of
 * loading the whole catalog. Used by the per-request pricing endpoints so a price
 * lookup touches only the rows it needs (idx_products_sku). Keys are the SKUs as
 * stored; unknown SKUs are simply absent from the result.
 */
export async function getPricesBySku(db: D1Database, skus: string[]): Promise<Record<string, number | null>> {
	const out: Record<string, number | null> = {};
	if (skus.length === 0) return out;
	// Chunk so a large grid (e.g. the all-products page) never exceeds D1's bound-
	// parameter limit and nothing is silently dropped.
	const CHUNK = 100;
	for (let i = 0; i < skus.length; i += CHUNK) {
		const batch = skus.slice(i, i + CHUNK);
		const placeholders = batch.map((_, j) => `?${j + 1}`).join(",");
		// Case-insensitive match (SKUs are compared lowercased elsewhere too).
		const { results } = await db
			.prepare(`SELECT sku, price FROM products WHERE sku COLLATE NOCASE IN (${placeholders})`)
			.bind(...batch)
			.all<{ sku: string; price: number | null }>();
		const byLower = new Map<string, number | null>();
		for (const r of results ?? []) byLower.set((r.sku ?? "").toLowerCase(), r.price ?? null);
		// Key by the REQUESTED sku so callers can look up what they asked for.
		for (const sku of batch) out[sku] = byLower.get(sku.toLowerCase()) ?? null;
	}
	return out;
}

const UPSERT_SQL =
	"INSERT INTO products " +
	"(internal_id, sku, title, description, price, image, gallery, grades, category_name, item_type, size, search_keywords, last_modified, synced_at) " +
	"VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14) " +
	"ON CONFLICT(internal_id) DO UPDATE SET " +
	"sku=?2, title=?3, description=?4, price=?5, image=?6, gallery=?7, grades=?8, " +
	"category_name=?9, item_type=?10, size=?11, search_keywords=?12, last_modified=?13, synced_at=?14";

/** Upsert records into D1 in batched transactions, stamping each with `syncedAt`. */
export async function upsertProducts(
	db: D1Database,
	records: CatalogRecord[],
	syncedAt: string,
	batchSize = 50,
): Promise<number> {
	const stmt = db.prepare(UPSERT_SQL);
	let written = 0;
	for (let i = 0; i < records.length; i += batchSize) {
		const batch = records.slice(i, i + batchSize).map((r) =>
			stmt.bind(
				r.internalId,
				r.sku,
				r.title,
				r.description,
				r.price,
				r.image,
				JSON.stringify(r.gallery ?? []),
				JSON.stringify(r.grades ?? []),
				r.categoryName,
				r.itemType,
				r.size,
				r.searchKeywords,
				r.lastModified,
				syncedAt,
			),
		);
		await db.batch(batch);
		written += batch.length;
	}
	return written;
}

/** Delete rows not touched by the current full-sync run (items that fell out of the catalog). */
export async function pruneStale(db: D1Database, syncedAt: string): Promise<number> {
	const res = await db.prepare("DELETE FROM products WHERE synced_at < ?1 OR synced_at IS NULL").bind(syncedAt).run();
	return res.meta?.changes ?? 0;
}

export interface SyncMeta {
	lastRun: string | null;
	itemCount: number | null;
	status: string | null;
	message: string | null;
	durationMs: number | null;
}

export async function getSyncMeta(db: D1Database): Promise<SyncMeta | null> {
	const row = await db
		.prepare("SELECT last_run, item_count, status, message, duration_ms FROM sync_meta WHERE id = 1")
		.first<{ last_run: string | null; item_count: number | null; status: string | null; message: string | null; duration_ms: number | null }>();
	if (!row) return null;
	return {
		lastRun: row.last_run,
		itemCount: row.item_count,
		status: row.status,
		message: row.message,
		durationMs: row.duration_ms,
	};
}

export async function setSyncMeta(db: D1Database, meta: SyncMeta): Promise<void> {
	await db
		.prepare(
			"INSERT INTO sync_meta (id, last_run, item_count, status, message, duration_ms) VALUES (1,?1,?2,?3,?4,?5) " +
				"ON CONFLICT(id) DO UPDATE SET last_run=?1, item_count=?2, status=?3, message=?4, duration_ms=?5",
		)
		.bind(meta.lastRun, meta.itemCount, meta.status, meta.message, meta.durationMs)
		.run();
}
