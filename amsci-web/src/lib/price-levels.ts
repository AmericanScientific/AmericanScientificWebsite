/**
 * The price tiers an admin can assign to an account.
 *
 * These values are NetSuite price level IDs, not our own numbering — which is why
 * they skip: 5 is NetSuite's per-customer "Custom" level (not assignable from the
 * admin UI, since it needs per-item prices) and 6 doesn't exist in the account.
 *
 * `discountLabel` is descriptive, not the actual maths. Real prices come from
 * `product_prices` in D1, one row per (item, level), synced from NetSuite — see
 * `resolvePrices`. Nothing here is used to calculate a price; it exists so an
 * admin picking a tier can tell what they're giving away.
 *
 * The percentages are the dominant discount measured across ~4,100 priced items
 * (2026-08-21). They hold for the main catalog, but items in the "Special" class
 * (~1,700 of them) run shallower — Tier 3 is ~8% off there rather than ~12%, and
 * Tier 2 is actually a small markup over base. Hence "approx" everywhere: treat
 * these as a guide to relative generosity, not a quotable number.
 */
export interface PriceLevelOption {
	/** NetSuite price level ID, stored on `users.price_level`. */
	value: number;
	/** Compact label for a <select> option. */
	label: string;
	/** Longer description for tooltips / help text. */
	description: string;
}

export const PRICE_LEVELS: readonly PriceLevelOption[] = [
	{
		value: 1,
		label: "Tier 1 — base / list price",
		description: "Base list price. No negotiated discount. The default for every new account.",
	},
	{
		value: 2,
		label: "Tier 2 — approx. 4% off list",
		description: "Approx. 4% off list on the main catalog. Slightly above list on Special-class items.",
	},
	{
		value: 3,
		label: "Tier 3 — approx. 12% off list",
		description: "Approx. 12% off list on the main catalog, approx. 8% off on Special-class items. The most common dealer tier.",
	},
	{
		value: 4,
		label: "Tier 4 — approx. 20% off list",
		description: "Approx. 20% off list on the main catalog, approx. 17% off on Special-class items. The deepest standard tier.",
	},
	{
		value: 7,
		label: "Tier 7 — approx. 6% off list",
		description: "Approx. 6% off list on the main catalog, approx. 2% off on Special-class items.",
	},
	{
		value: 8,
		label: "Tier 8 — approx. 18% off list",
		description: "Approx. 18% off list, applied consistently across the whole catalog.",
	},
] as const;

/** Shown under a tier picker so the approximations above aren't read as exact. */
export const PRICE_LEVEL_HELP =
	"Percentages are typical for the main catalog; Special-class items discount less. " +
	"The price a customer actually sees always comes from NetSuite, per item.";

/**
 * Label for a stored level, including ones the picker doesn't offer.
 *
 * An account can legitimately hold a level that isn't in `PRICE_LEVELS` — level 5
 * ("Custom") set directly in NetSuite, or a new level added there and not yet
 * reflected here. Returning a real label for those matters: a `<select>` whose
 * `value` matches no `<option>` silently displays the FIRST option instead, so a
 * Custom-priced dealer would render as "Tier 1 — base / list price" and look like
 * they need fixing. Callers should pair this with `withCurrentLevel`.
 */
export function priceLevelLabel(value: number): string {
	return PRICE_LEVELS.find((p) => p.value === value)?.label ?? `Tier ${value} — set in NetSuite`;
}

/**
 * The pickable tiers, plus the account's current one if it isn't among them.
 *
 * Keeps an unusual level visible and selected rather than silently rewriting it
 * to Tier 1 in the UI. The extra entry sorts by value so the list stays ordered.
 */
export function withCurrentLevel(current: number): PriceLevelOption[] {
	if (PRICE_LEVELS.some((p) => p.value === current)) return [...PRICE_LEVELS];
	return [...PRICE_LEVELS, {
		value: current,
		label: priceLevelLabel(current),
		description: "This level was set in NetSuite and isn't one of the standard tiers.",
	}].sort((a, b) => a.value - b.value);
}
