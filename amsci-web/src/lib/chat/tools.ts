import "server-only";
import { parseSearchFilters, searchCatalog } from "@/data/search";
import { getProductBySku } from "@/data/products";
import { getAllLeafCategories, getCategoryName, getTopLevelCategories } from "@/data/categories";
import { pageForSku, slugForPage } from "@/data/variant-groups";
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
			"Search the American Scientific catalog for products by keyword (e.g. 'buchner funnel', 'magnets', 'microscope slides'). Use this whenever the customer asks about products, needs a recommendation, or you need a SKU. Returns matching products with their SKU, title, category, grade levels, and page URL. A product with size/option variants includes a `variants` array — each variant is a separate, orderable SKU (e.g. SH-1, SH-2). When the customer names a specific variant, use that exact variant SKU from the list.",
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
			"Add a product to the customer's order (their cart) by SKU and quantity. Only works when the customer is signed in. Confirm the exact product with search_products or get_product first so you use a real SKU. For products with variants, use the specific variant's SKU (from the `variants` list), never the group's representative SKU.",
		input_schema: {
			type: "object",
			properties: {
				sku: { type: "string", description: "The exact product SKU to add." },
				qty: { type: "integer", description: "Quantity to add (default 1)." },
			},
			required: ["sku"],
		},
	},
	{
		name: "browse_products",
		description:
			"Count and list products with pagination. Use this for 'how many X do you offer' or 'list all your Y' questions — it returns the EXACT total (distinct products; a variant group counts once) plus a page of results. Filter by a `query` keyword and/or a `category` name. Page through everything with `offset` until offset+count reaches total. Prefer this over search_products when the customer wants a count or a complete list.",
		input_schema: {
			type: "object",
			properties: {
				query: { type: "string", description: "Keyword to filter by, e.g. 'bulb' (optional)." },
				category: { type: "string", description: "Category name to filter by, e.g. 'Chemistry' (optional)." },
				offset: { type: "integer", description: "Start index for pagination (default 0)." },
				limit: { type: "integer", description: "Page size (default 25, max 50)." },
			},
		},
	},
] as const;

const productUrl = (sku: string, pageSlug?: string) => `/product/${pageSlug ?? sku.toLowerCase()}`;

/**
 * Variant members of the page a SKU belongs to, each with its own deep-link URL.
 * Empty for single (non-variant) products. This is how the assistant discovers
 * SKUs hidden behind a variant dropdown (e.g. SH-2 consolidated onto the SH-1
 * page) — the collapsed search listing only shows the representative member.
 */
function variantsForSku(sku: string, cap = 24): { sku: string; label: string; url: string }[] {
	const page = pageForSku(sku);
	if (!page || page.members.length <= 1) return [];
	const slug = slugForPage(page);
	return page.members.slice(0, cap).map((m) => ({
		sku: m.item_number,
		label: m.variant_label || m.item_number,
		url: `/product/${slug}?sku=${encodeURIComponent(m.item_number)}`,
	}));
}

/** Resolve a free-text category (name or slug) to a taxonomy slug, or null. */
function resolveCategory(input: string): string | null {
	const q = input.trim().toLowerCase();
	if (!q) return null;
	const nodes = [...getTopLevelCategories(), ...getAllLeafCategories()];
	for (const n of nodes) {
		if (n.slug.toLowerCase() === q || n.name.toLowerCase() === q) return n.slug;
	}
	for (const n of nodes) {
		if (n.name.toLowerCase().includes(q)) return n.slug; // loose fallback
	}
	return null;
}

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
		const limit = Math.min(Math.max(1, Number(input.limit) || 5), 8);
		const items = results.slice(0, limit).map((p) => {
			const item: Record<string, unknown> = {
				sku: p.sku,
				title: p.title,
				category: getCategoryName(p.category),
				grades: p.grades,
				url: productUrl(p.sku, p.pageSlug),
			};
			if (ctx.authed && typeof p.price === "number") item.price = formatPrice(p.price);
			const variants = variantsForSku(p.sku, 8);
			if (variants.length) {
				item.note = "Multiple variants — each is separately orderable via its own SKU in `variants`.";
				item.variants = variants;
			}
			return item;
		});
		return JSON.stringify({ total, showing: items.length, items });
	}

	if (name === "get_product") {
		const sku = typeof input.sku === "string" ? input.sku : "";
		const p = await getProductBySku(sku);
		if (!p) return JSON.stringify({ error: `No product found with SKU "${sku}".` });
		const out: Record<string, unknown> = {
			sku: p.sku,
			title: p.title,
			description: p.description || undefined,
			category: getCategoryName(p.category),
			grades: p.grades,
			url: productUrl(p.sku, p.pageSlug),
		};
		if (ctx.authed && typeof p.price === "number") out.price = formatPrice(p.price);
		const variants = variantsForSku(p.sku);
		if (variants.length) out.variants = variants;
		return JSON.stringify(out);
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

	if (name === "browse_products") {
		const query = typeof input.query === "string" ? input.query : "";
		const categoryInput = typeof input.category === "string" ? input.category : "";
		const category = categoryInput ? resolveCategory(categoryInput) : null;
		if (categoryInput && !category) {
			return JSON.stringify({
				error: `Unknown category "${categoryInput}". Use a keyword instead, or a top-level category like Chemistry, Physics, Biology, or Earth Science.`,
			});
		}
		const offset = Math.max(0, Math.floor(Number(input.offset) || 0));
		const limit = Math.min(Math.max(1, Number(input.limit) || 25), 50);
		const filters = parseSearchFilters({ q: query, category: category ?? undefined, sort: "name" });
		const { results, total } = await searchCatalog(filters);
		const page = results.slice(offset, offset + limit);
		const items = page.map((p) => ({
			sku: p.sku,
			title: p.title,
			url: productUrl(p.sku, p.pageSlug),
			...(typeof p.variantCount === "number" && p.variantCount > 1 ? { variantCount: p.variantCount } : {}),
			...(ctx.authed && typeof p.price === "number" ? { price: formatPrice(p.price) } : {}),
		}));
		return JSON.stringify({
			total,
			offset,
			count: items.length,
			hasMore: offset + items.length < total,
			items,
		});
	}

	return JSON.stringify({ error: `Unknown tool: ${name}` });
}
