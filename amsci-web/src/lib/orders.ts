import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCatalogLinesBySku } from "@/lib/catalog/d1";
import { getProductBySku } from "@/data/products";
import { BASE_PRICE_LEVEL, resolvePrices } from "@/lib/pricing";

/** A priced order line, resolved authoritatively server-side. */
export interface OrderLine {
	sku: string;
	title: string;
	qty: number;
	/** Base (per-account) unit price, or null = "call for pricing". */
	unitPrice: number | null;
	/** unitPrice * qty, or null when the unit price is unknown. */
	lineTotal: number | null;
}

export interface OrderTotals {
	lines: OrderLine[];
	subtotal: number;
	total: number;
	hasUnpriced: boolean;
}

/**
 * Resolve requested { sku, qty } items into authoritative priced lines. Titles
 * and prices come from D1 (falling back to the catalog map at build/dev), NEVER
 * from the client — the browser only says which SKU and how many. Unknown SKUs
 * are dropped.
 *
 * Prices come from the SAME `resolvePrices` the storefront uses, at the
 * customer's own level. That shared path is the point: if the order resolved
 * price independently, a divergence between the two would show up as an order
 * confirmation that disagrees with the cart the customer just approved.
 */
export async function resolveOrderLines(
	items: { sku: string; qty: number }[],
	priceLevel: number = BASE_PRICE_LEVEL,
): Promise<OrderTotals> {
	const skus = items.map((i) => i.sku);
	let info: Record<string, { title: string; price: number | null }> = {};
	try {
		const { env } = getCloudflareContext();
		const db = (env as { DB?: D1Database }).DB;
		if (db) info = await getCatalogLinesBySku(db, skus);
	} catch {
		// No Cloudflare context (build / plain Node) → fall back to the catalog map.
	}

	// Tier-resolved prices, keyed by requested SKU. `info` still supplies titles.
	const tierPrices = await resolvePrices(skus, priceLevel);

	const lines: OrderLine[] = [];
	for (const { sku, qty } of items) {
		let entry = info[sku];
		if (!entry) {
			const product = await getProductBySku(sku);
			if (product) entry = { title: product.title, price: product.price };
		}
		if (!entry) continue; // unknown SKU — drop it
		// Prefer the tier-resolved price; fall back to the catalog line's base
		// price only if the resolver had nothing for this SKU.
		const resolved = tierPrices[sku] ?? entry.price;
		const unitPrice = typeof resolved === "number" && Number.isFinite(resolved) ? resolved : null;
		lines.push({
			sku,
			title: entry.title || sku,
			qty,
			unitPrice,
			lineTotal: unitPrice != null ? unitPrice * qty : null,
		});
	}

	let subtotal = 0;
	let hasUnpriced = false;
	for (const l of lines) {
		if (l.lineTotal != null) subtotal += l.lineTotal;
		else hasUnpriced = true;
	}
	return { lines, subtotal, total: subtotal, hasUnpriced };
}

export interface CreateOrderInput {
	userId: number;
	customer: { name: string; email: string; company: string | null; phone: string | null; address: string | null };
	priceLevel: number;
	totals: OrderTotals;
	/** Optional customer-entered PO number. */
	poNumber: string | null;
}

/** Persist an order and return its generated order number (autoincrement id). */
export async function createOrder(db: D1Database, input: CreateOrderInput, now: string): Promise<number> {
	const { customer, totals } = input;
	const res = await db
		.prepare(
			"INSERT INTO orders " +
				"(user_id, customer_name, customer_email, customer_company, customer_phone, customer_address, " +
				"price_level, items, subtotal, total, has_unpriced, po_number, status, created_at) " +
				"VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,'requested',?13)",
		)
		.bind(
			input.userId,
			customer.name,
			customer.email,
			customer.company,
			customer.phone,
			customer.address,
			input.priceLevel,
			JSON.stringify(totals.lines),
			totals.subtotal,
			totals.total,
			totals.hasUnpriced ? 1 : 0,
			input.poNumber,
			now,
		)
		.run();
	return Number(res.meta?.last_row_id ?? 0);
}
