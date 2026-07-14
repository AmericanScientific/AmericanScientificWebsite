/**
 * Server-side single-item fetch from NetSuite (SuiteQL) for the product page.
 *
 * Uses the TBA client — secrets never reach the client. This is the read path
 * that the full catalog build will generalize; for now it fetches one item by
 * internalId plus its base (level-1) price.
 */
import { NetSuiteClient } from "./client";
import { getEnv, type RawEnv } from "./env";
import { absoluteMediaUrl } from "./images";

export interface NetSuiteItem {
	internalId: string;
	/** storedisplayname (web title). */
	title: string;
	/** itemid (SKU). */
	sku: string;
	/** storedescription (raw; has \r\n + "•" bullets — shape with parseDescription). */
	description: string;
	/**
	 * Product image, absolute URL. Sourced from the native File Cabinet field
	 * `storeDisplayImage` (public `4093468.app.netsuite.com/core/media/...` long-hash
	 * URLs that load without a login — verified across the catalog). Falls back to
	 * `custitem_imageurltext` only when no File Cabinet image is set; note that field
	 * mostly holds login-gated `shopping.na1`/`system.na1` URLs that DON'T load, which
	 * is why we prefer the File Cabinet. Route through mediaProxyUrl for display.
	 */
	imageUrl: string | null;
	/** custitemtg_url (Teacher's Guide PDF). */
	teachersGuideUrl: string | null;
	/** custitemyoutubeembedcode (HTML-encoded embed — extract ID, don't inject). */
	youtubeEmbed: string | null;
	/** BUILTIN.DF(custitem_grades), e.g. "4+". */
	grades: string | null;
	/** custitem_size (often empty). */
	size: string | null;
	/** BUILTIN.DF(class) — leaf category display name, e.g. "Heat & Thermodynamics". */
	category: string | null;
	/** searchkeywords (CSV). */
	searchKeywords: string | null;
	/** Base/list price (price level 1, qty 1). Null if no price row. */
	basePrice: number | null;
}

/** Read a field case-insensitively; NetSuite REST returns column names lowercased. */
function field(row: Record<string, unknown>, name: string): string | null {
	const value = row[name] ?? row[name.toLowerCase()] ?? row[name.toUpperCase()];
	if (value === null || value === undefined) return null;
	const s = String(value).trim();
	return s === "" ? null : s;
}

/**
 * Fetch one item + its base price. `internalId` is coerced to digits before
 * interpolation (SuiteQL has no bound params here; this guards against injection).
 * Returns null if the item isn't found.
 */
export async function fetchNetSuiteItem(
	internalId: number | string,
	env: RawEnv = getEnv(),
): Promise<NetSuiteItem | null> {
	const id = String(internalId).replace(/\D/g, "");
	if (!id) return null;

	const client = NetSuiteClient.fromEnv(env);

	const account = (env.NS_ACCOUNT ?? "").trim();

	const itemQuery =
		"SELECT i.id, i.storedisplayname, i.itemid, i.storedescription, i.custitem_imageurltext, " +
		"i.custitemtg_url, i.custitemyoutubeembedcode, BUILTIN.DF(i.custitem_grades) AS grades, " +
		"i.custitem_size AS size, BUILTIN.DF(i.class) AS category, i.searchkeywords, " +
		"f.url AS filecabinet_url " +
		"FROM item i LEFT JOIN file f ON f.id = i.storedisplayimage " +
		`WHERE i.id = ${id}`;
	const priceQuery =
		`SELECT unitPrice AS unitprice FROM pricing WHERE item = ${id} AND priceLevel = 1 AND priceQty = 1`;

	const [itemPage, pricePage] = await Promise.all([
		client.suiteql<Record<string, unknown>>(itemQuery, { limit: 1 }),
		client.suiteql<Record<string, unknown>>(priceQuery, { limit: 1 }),
	]);

	const row = itemPage.items[0];
	if (!row) return null;

	const priceRaw = pricePage.items[0]?.unitprice ?? pricePage.items[0]?.unitPrice;
	const basePrice = priceRaw != null && priceRaw !== "" ? Number(priceRaw) : null;

	// Prefer the File Cabinet image (public, verified) over custitem_imageurltext
	// (mostly login-gated na1 URLs). Both are absolute after this resolution.
	const fileUrl = field(row, "filecabinet_url");
	const imageUrl =
		fileUrl && account
			? absoluteMediaUrl(fileUrl, account)
			: field(row, "custitem_imageurltext");

	return {
		internalId: field(row, "id") ?? id,
		title: field(row, "storedisplayname") ?? field(row, "itemid") ?? "Untitled item",
		sku: field(row, "itemid") ?? "",
		description: field(row, "storedescription") ?? "",
		imageUrl,
		teachersGuideUrl: field(row, "custitemtg_url"),
		youtubeEmbed: field(row, "custitemyoutubeembedcode"),
		grades: field(row, "grades"),
		size: field(row, "size"),
		category: field(row, "category"),
		searchKeywords: field(row, "searchkeywords"),
		basePrice: basePrice != null && Number.isFinite(basePrice) ? basePrice : null,
	};
}
