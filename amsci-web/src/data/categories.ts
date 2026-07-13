/**
 * Category taxonomy — single source of truth for storefront navigation and
 * category landing pages.
 *
 * These names mirror the NetSuite `class` display names. In the real build this
 * tree will be GENERATED from NetSuite `class` records (via SuiteQL
 * `BUILTIN.DF(class)` / the class hierarchy, split on " : " into parent → child,
 * per CLAUDE.md §3), not hand-maintained here. For the shell it is a static mock
 * so the taxonomy, routes, and nav can be built before the NetSuite sync exists.
 *
 * Slugs are kebab-case and are the stable keys used in URLs
 * (`/product-category/[parent]/[child]`) and in `Product.category`.
 */

export interface CategoryNode {
	/** kebab-case URL key. Stable identity for routing and product assignment. */
	slug: string;
	/** Display name (from NetSuite `class`). */
	name: string;
	/** Child categories. Absent/empty for leaf or standalone top-level nodes. */
	children?: CategoryNode[];
	/**
	 * Marks a top-level node whose catalog is NOT sourced from the NetSuite item
	 * sync (e.g. PHYWE — a separate catalog source per CLAUDE.md §4). Nav links it
	 * to a standalone placeholder page rather than a NetSuite-backed listing.
	 */
	external?: boolean;
}

/** The full category tree. Order here is the order rendered in the nav. */
export const CATEGORY_TREE: CategoryNode[] = [
	{
		slug: "chemistry",
		name: "Chemistry",
		children: [
			{ slug: "chemistry-properties-of-matter", name: "Chemistry Properties of Matter" },
			{ slug: "chemical-reactions", name: "Chemical Reactions" },
		],
	},
	{
		slug: "laboratory",
		name: "Laboratory",
		children: [
			{ slug: "glass-plasticware", name: "Glass & Plasticware" },
			{ slug: "microscopes-optics", name: "Microscopes & Optics" },
			{ slug: "lab-equipment-accessories", name: "Lab Equipment & Accessories" },
			{ slug: "measuring-equipment", name: "Measuring Equipment" },
			{ slug: "dissection-tools", name: "Dissection Tools" },
			{ slug: "biotechnology-equipment", name: "Biotechnology Equipment" },
		],
	},
	{
		slug: "life-science",
		name: "Life Science",
		children: [
			{ slug: "models-bioplast", name: "Models & Bioplast" },
			{ slug: "environmental-science", name: "Environmental Science" },
			{ slug: "health-science", name: "Health Science" },
			{ slug: "physiology", name: "Physiology" },
			{ slug: "microbiology", name: "Microbiology" },
		],
	},
	{
		slug: "physics-physical-science",
		name: "Physics & Physical Science",
		children: [
			{ slug: "light-sound-waves", name: "Light & Sound Waves" },
			{ slug: "electricity", name: "Electricity" },
			{ slug: "force-energy-motion", name: "Force, Energy & Motion" },
			{ slug: "magnetism", name: "Magnetism" },
			{ slug: "heat-thermodynamics", name: "Heat & Thermodynamics" },
			{ slug: "physics-properties-of-matter", name: "Physics Properties of Matter" },
			{ slug: "physical-science-equipment", name: "Physical Science Equipment" },
			{ slug: "earth-space-science", name: "Earth & Space Science" },
			{ slug: "alternative-energy", name: "Alternative Energy" },
			{ slug: "robotics", name: "Robotics" },
		],
	},
	{ slug: "special", name: "Special" },
	{ slug: "phywe", name: "PHYWE", external: true },
];

// ── Lookups ──────────────────────────────────────────────────────────────────

/** Top-level categories, in nav order. */
export function getTopLevelCategories(): CategoryNode[] {
	return CATEGORY_TREE;
}

/** Find a top-level (parent) category by slug. */
export function getParentCategory(parentSlug: string): CategoryNode | undefined {
	return CATEGORY_TREE.find((c) => c.slug === parentSlug);
}

/** Find a leaf (child) category within a parent by slug. */
export function getChildCategory(
	parentSlug: string,
	childSlug: string,
): CategoryNode | undefined {
	return getParentCategory(parentSlug)?.children?.find((c) => c.slug === childSlug);
}

/** Find the parent node that contains a given leaf slug. */
export function getParentOfLeaf(leafSlug: string): CategoryNode | undefined {
	return CATEGORY_TREE.find((c) => c.children?.some((child) => child.slug === leafSlug));
}

/** Every leaf category node across the whole tree. */
export function getAllLeafCategories(): CategoryNode[] {
	return CATEGORY_TREE.flatMap((c) => c.children ?? []);
}

/**
 * Resolve any category slug (leaf OR standalone top-level, e.g. "special") to its
 * display name. Falls back to the raw slug if unknown.
 */
export function getCategoryName(slug: string): string {
	const leaf = getAllLeafCategories().find((c) => c.slug === slug);
	if (leaf) return leaf.name;
	return CATEGORY_TREE.find((c) => c.slug === slug)?.name ?? slug;
}

/**
 * Resolve any category slug to its top-level family slug. Leaves map to their
 * parent; standalone top-level slugs (e.g. "special") map to themselves.
 */
export function getTopLevelSlug(slug: string): string {
	return getParentOfLeaf(slug)?.slug ?? slug;
}

/**
 * Find a leaf by its display NAME (as returned from NetSuite `BUILTIN.DF(class)`,
 * e.g. "Heat & Thermodynamics"). Case-insensitive. Returns the leaf and its
 * parent so callers can build breadcrumb links. Undefined if unmatched.
 */
export function findLeafByName(
	name: string,
): { parent: CategoryNode; leaf: CategoryNode } | undefined {
	const needle = name.trim().toLowerCase();
	for (const parent of CATEGORY_TREE) {
		const leaf = parent.children?.find((c) => c.name.toLowerCase() === needle);
		if (leaf) return { parent, leaf };
	}
	return undefined;
}
