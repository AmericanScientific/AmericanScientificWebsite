import "server-only";
import { parseSearchFilters, searchCatalog } from "@/data/search";
import { getProductBySku } from "@/data/products";
import { getCategoryName } from "@/data/categories";
import { formatPrice } from "@/lib/format";

/**
 * Tools the AI assistant can call. All of these run SERVER-side inside the
 * /api/chat Worker — the model never touches D1 or the API key directly.
 *
 * Price-gating: prices are included in tool results ONLY when the visitor is
 * logged in (`ctx.authed`), mirroring the rest of the site. The assistant can
 * never become a side-channel that leaks pricing to guests.
 */
export interface ToolContext {
	authed: boolean;
}

/** A cart mutation the assistant wants applied — relayed to the client widget. */
export interface CartAction {
	type: "add_to_order";
	sku: string;
	qty: number;
	title: string;
	imageUrl: string;
}

/** Anthropic tool definitions (JSON Schema). */
export const CHAT_TOOLS = [
	{
		name: "search_products",
		description:
			"Search the American Scientific catalog for products by keyword (e.g. 'buchner funnel', 'magnets', 'microscope slides'). Use this whenever the customer asks about products, needs a recommendation, or you need a SKU. Returns matching products with their SKU, title, category, grade levels, and page URL.",
		input_schema: {
			type: "object",
			properties: {
				query: { type: "string", description: "Keywords to search for." },
				limit: { type: "integer", description: "Max results to return (default 6, max 12)." },
			},
			required: ["query"],
		},
	},
	{
		name: "get_product",
		description:
			"Get full details for a single product by its exact SKU (e.g. '5307-08'). Use after search_products when the customer wants specifics on one item.",
		input_schema: {
			type: "object",
			properties: {
				sku: { type: "string", description: "The product SKU." },
			},
			required: ["sku"],
		},
	},
	{
		name: "add_to_order",
		description:
			"Add a product to the customer's order (their cart) by SKU and quantity. Only works when the customer is signed in. Confirm the exact product with search_products or get_product first so you use a real SKU.",
		input_schema: {
			type: "object",
			properties: {
				sku: { type: "string", description: "The exact product SKU to add." },
				qty: { type: "integer", description: "Quantity to add (default 1)." },
			},
			required: ["sku"],
		},
	},
] as const;

const productUrl = (sku: string, pageSlug?: string) => `/product/${pageSlug ?? sku.toLowerCase()}`;

/**
 * Execute a tool call. Returns a JSON string for the model's tool_result, and
 * pushes any client-side cart mutation onto `actions`.
 */
export async function runTool(
	name: string,
	input: Record<string, unknown>,
	ctx: ToolContext,
	actions: CartAction[],
): Promise<string> {
	if (name === "search_products") {
		const query = typeof input.query === "string" ? input.query : "";
		if (!query.trim()) return JSON.stringify({ error: "Empty query." });
		const filters = parseSearchFilters({ q: query });
		const { results, total } = await searchCatalog(filters);
		const limit = Math.min(Math.max(1, Number(input.limit) || 6), 12);
		const items = results.slice(0, limit).map((p) => ({
			sku: p.sku,
			title: p.title,
			category: getCategoryName(p.category),
			grades: p.grades,
			url: productUrl(p.sku, p.pageSlug),
			...(ctx.authed && typeof p.price === "number" ? { price: formatPrice(p.price) } : {}),
		}));
		return JSON.stringify({ total, showing: items.length, items });
	}

	if (name === "get_product") {
		const sku = typeof input.sku === "string" ? input.sku : "";
		const p = await getProductBySku(sku);
		if (!p) return JSON.stringify({ error: `No product found with SKU "${sku}".` });
		return JSON.stringify({
			sku: p.sku,
			title: p.title,
			description: p.description || undefined,
			category: getCategoryName(p.category),
			grades: p.grades,
			url: productUrl(p.sku, p.pageSlug),
			...(ctx.authed && typeof p.price === "number" ? { price: formatPrice(p.price) } : {}),
		});
	}

	if (name === "add_to_order") {
		if (!ctx.authed) {
			return JSON.stringify({
				ok: false,
				message: "The customer must sign in before adding items to an order.",
			});
		}
		const sku = typeof input.sku === "string" ? input.sku : "";
		const p = await getProductBySku(sku);
		if (!p) return JSON.stringify({ ok: false, message: `No product found with SKU "${sku}".` });
		const qty = Math.max(1, Math.floor(Number(input.qty) || 1));
		actions.push({ type: "add_to_order", sku: p.sku, qty, title: p.title, imageUrl: p.imageUrl });
		return JSON.stringify({ ok: true, message: `Added ${qty} × ${p.title} (${p.sku}) to the order.` });
	}

	return JSON.stringify({ error: `Unknown tool: ${name}` });
}
