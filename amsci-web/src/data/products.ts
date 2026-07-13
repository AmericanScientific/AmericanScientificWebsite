import type { Product } from "@/types/product";
import { productSlug } from "@/types/product";
import { getAllLeafCategories, getParentCategory } from "@/data/categories";

/**
 * Placeholder catalog for the storefront shell.
 *
 * This is mock data ONLY. In production the catalog is populated from NetSuite
 * (`item WHERE isonline='T' AND isinactive='F'`, per CLAUDE.md §3) and cached.
 * Nothing here should be treated as authoritative. SKUs follow the real
 * "NNN-NNNNN" / "NN-NNNN" formats seen on the live site; internalIds are
 * fabricated stand-ins for NetSuite's canonical keys.
 *
 * `category` is a LEAF category slug from `src/data/categories.ts`; the parent
 * is resolved through the taxonomy.
 */
export const MOCK_PRODUCTS: Product[] = [
	// ── Chemistry ▸ Properties of Matter ───────────────────────────────────────
	{
		internalId: "1001",
		sku: "10-1530",
		title: "pH Test Strips, Universal (0–14), Vial of 100",
		description:
			"Universal indicator strips for rapid pH determination across the full 0–14 range. Color-matched to a reference chart for clear classroom readings. Sold by the vial.",
		price: 8.95,
		imageUrl: "",
		category: "chemistry-properties-of-matter",
		grades: ["6-8", "9-12"],
	},
	{
		internalId: "1004",
		sku: "10-1875",
		title: "Density Cube Set, 10-Piece, Assorted Metals & Woods",
		description:
			"Ten equal-volume cubes in assorted materials for hands-on investigation of mass, volume, and density. Includes aluminum, brass, copper, steel, and hardwoods.",
		price: 34.5,
		imageUrl: "",
		category: "chemistry-properties-of-matter",
		grades: ["6-8", "9-12"],
	},

	// ── Chemistry ▸ Chemical Reactions ─────────────────────────────────────────
	{
		internalId: "1002",
		sku: "10-2245",
		title: "Sodium Chloride, Reagent Grade, 500 g",
		description:
			"Laboratory-grade sodium chloride (ACS reagent) suitable for solution preparation, titration standards, and general chemistry instruction. Packaged in a resealable 500 g bottle.",
		price: 14.5,
		imageUrl: "",
		category: "chemical-reactions",
		grades: ["9-12", "College"],
	},
	{
		internalId: "1005",
		sku: "10-2610",
		title: "Copper(II) Sulfate Pentahydrate, 500 g",
		description:
			"Bright blue crystalline reagent for electrolysis, single-replacement, and crystal-growth demonstrations. Lab grade, resealable bottle. Follow local disposal guidance.",
		price: 18.75,
		imageUrl: "",
		category: "chemical-reactions",
		grades: ["9-12", "College"],
	},

	// ── Laboratory ▸ Glass & Plasticware ───────────────────────────────────────
	{
		internalId: "1003",
		sku: "10-3390",
		title: "Erlenmeyer Flask, Borosilicate Glass, 250 mL",
		description:
			"Heavy-wall borosilicate 3.3 flask with a durable white graduation scale and a wide base for stability during swirling and heating. Autoclavable.",
		price: 6.75,
		imageUrl: "",
		category: "glass-plasticware",
		grades: ["9-12", "College"],
	},
	{
		internalId: "2005",
		sku: "22-1120",
		title: "Griffin Beaker Set, Borosilicate, 50–1000 mL (5-Piece)",
		description:
			"Graduated low-form beakers in five sizes with pouring spouts and heavy-duty rims. Borosilicate 3.3 glass for repeated heating and chemical resistance.",
		price: 27.9,
		imageUrl: "",
		category: "glass-plasticware",
		grades: ["9-12", "College"],
	},

	// ── Laboratory ▸ Microscopes & Optics ──────────────────────────────────────
	{
		internalId: "2001",
		sku: "22-4100",
		title: "Student Compound Microscope, 40x–400x, LED",
		description:
			"Monocular compound microscope with three achromatic objectives, coaxial coarse/fine focus, and cool LED illumination. Built for durability in the teaching lab.",
		price: 129.0,
		imageUrl: "",
		category: "microscopes-optics",
		grades: ["6-8", "9-12", "College"],
	},

	// ── Laboratory ▸ Lab Equipment & Accessories ───────────────────────────────
	{
		internalId: "2004",
		sku: "22-6620",
		title: "Digital Hot Plate Stirrer, 5 in. Ceramic Top",
		description:
			"Combined hotplate and magnetic stirrer with independent heat and speed control and a chemical-resistant ceramic top. Includes one PTFE stir bar.",
		price: 189.0,
		imageUrl: "",
		category: "lab-equipment-accessories",
		grades: ["9-12", "College"],
	},
	{
		internalId: "2003",
		sku: "22-5015",
		title: "Nitrile Examination Gloves, Powder-Free, Box of 100 (M)",
		description:
			"Textured, powder-free nitrile gloves offering strong chemical resistance and tactile sensitivity. Latex-free. Medium; 100 ambidextrous gloves per box.",
		price: 11.25,
		imageUrl: "",
		category: "lab-equipment-accessories",
		grades: ["6-8", "9-12", "College"],
	},

	// ── Laboratory ▸ Measuring Equipment ───────────────────────────────────────
	{
		internalId: "2002",
		sku: "22-4780",
		title: "Digital Pocket Scale, 0.01 g Resolution, 200 g Capacity",
		description:
			"Compact precision balance with a stainless steel platform, tare function, and backlit display. Ideal for measuring reagents and small samples at the bench.",
		price: 24.95,
		imageUrl: "",
		category: "measuring-equipment",
		grades: ["9-12", "College"],
	},
	{
		internalId: "2006",
		sku: "22-3050",
		title: "Graduated Cylinder, Borosilicate Glass, 100 mL",
		description:
			"Class B graduated cylinder with a hexagonal base and pour spout for accurate volume measurement. Durable borosilicate glass with a clear white scale.",
		price: 9.4,
		imageUrl: "",
		category: "measuring-equipment",
		grades: ["9-12", "College"],
	},

	// ── Laboratory ▸ Dissection Tools ──────────────────────────────────────────
	{
		internalId: "2007",
		sku: "22-7700",
		title: "Student Dissection Tool Set, 7-Piece with Case",
		description:
			"Stainless steel dissection kit including scalpel, forceps, scissors, probes, and teasing needle in a reusable storage case. Sized for student hands.",
		price: 15.6,
		imageUrl: "",
		category: "dissection-tools",
		grades: ["6-8", "9-12"],
	},

	// ── Laboratory ▸ Biotechnology Equipment ───────────────────────────────────
	{
		internalId: "2008",
		sku: "22-9200",
		title: "Adjustable Micropipette, 100–1000 µL",
		description:
			"Single-channel variable-volume micropipette with a digital volume display and ejector. Accepts standard 1000 µL tips for molecular biology and biotech labs.",
		price: 74.0,
		imageUrl: "",
		category: "biotechnology-equipment",
		grades: ["9-12", "College"],
	},

	// ── Life Science ▸ Models & Bioplast ───────────────────────────────────────
	{
		internalId: "3002",
		sku: "35-2210",
		title: "Human Skeleton Model, Miniature, 17 in. with Stand",
		description:
			"Desktop-scale skeleton showing all major bones and joints, mounted on a stable base. A durable, cost-effective aid for teaching human anatomy.",
		price: 42.0,
		imageUrl: "",
		category: "models-bioplast",
		grades: ["6-8", "9-12"],
	},

	// ── Life Science ▸ Environmental Science ───────────────────────────────────
	{
		internalId: "3003",
		sku: "35-4455",
		title: "Owl Pellet Dissection Kit, Class Pack of 15",
		description:
			"Heat-sterilized owl pellets with bone identification charts and dissection tools. Supports hands-on lessons in food webs, ecology, and skeletal anatomy.",
		price: 58.5,
		imageUrl: "",
		category: "environmental-science",
		grades: ["3-5", "6-8"],
	},

	// ── Life Science ▸ Microbiology ────────────────────────────────────────────
	{
		internalId: "3001",
		sku: "480-00120",
		title: "Prepared Microscope Slide, Streptococcus Bacteria",
		description:
			"Professionally prepared and stained slide of Streptococcus for the study of bacterial morphology. Cover-slipped and labeled for immediate classroom use.",
		price: 0.89,
		imageUrl: "",
		category: "microbiology",
		grades: ["9-12", "College"],
	},

	// ── Physics & Physical Science ▸ Force, Energy & Motion ─────────────────────
	{
		internalId: "4001",
		sku: "50-1100",
		title: "Dynamics Cart Set with Track, 1.2 m",
		description:
			"Low-friction cart-and-track system with adjustable end stops and mass bars for experiments in motion, momentum, and collisions. Aluminum track with a leveling foot.",
		price: 96.0,
		imageUrl: "",
		category: "force-energy-motion",
		grades: ["9-12", "College"],
	},

	// ── Physics & Physical Science ▸ Magnetism ─────────────────────────────────
	{
		internalId: "4002",
		sku: "50-2075",
		title: "Horseshoe Magnet, Alnico, 3 in., Pair",
		description:
			"Powerful alnico horseshoe magnets with keeper bars for demonstrating magnetic fields, poles, and attraction/repulsion. Sold as a matched pair.",
		price: 12.4,
		imageUrl: "",
		category: "magnetism",
		grades: ["3-5", "6-8", "9-12"],
	},

	// ── Physics & Physical Science ▸ Electricity ───────────────────────────────
	{
		internalId: "4003",
		sku: "50-3300",
		title: "Basic Electric Circuit Kit, Student Set",
		description:
			"Hands-on kit with battery holders, bulbs, switches, and leads for building series and parallel circuits. Introduces current, voltage, and conductivity.",
		price: 33.25,
		imageUrl: "",
		category: "electricity",
		grades: ["6-8", "9-12"],
	},

	// ── Physics & Physical Science ▸ Light & Sound Waves ───────────────────────
	{
		internalId: "4004",
		sku: "50-4120",
		title: "Equilateral Glass Prism, 75 mm",
		description:
			"Optical-grade glass prism for demonstrating refraction, dispersion, and the visible spectrum. Polished faces produce a clean, bright spectrum in sunlight or a beam.",
		price: 10.8,
		imageUrl: "",
		category: "light-sound-waves",
		grades: ["6-8", "9-12"],
	},

	// ── Physics & Physical Science ▸ Heat & Thermodynamics ─────────────────────
	{
		internalId: "4005",
		sku: "50-5090",
		title: "Student Alcohol Thermometer, -20 to 110 °C, Pack of 10",
		description:
			"Red-spirit thermometers with dual Celsius/Fahrenheit scales for calorimetry and heat-transfer labs. Non-mercury and shatter-resistant. Ten per pack.",
		price: 21.5,
		imageUrl: "",
		category: "heat-thermodynamics",
		grades: ["6-8", "9-12"],
	},

	// ── Physics & Physical Science ▸ Earth & Space Science ─────────────────────
	{
		internalId: "4006",
		sku: "50-6015",
		title: "Rock & Mineral Classroom Collection, 50 Specimens",
		description:
			"Curated set of igneous, sedimentary, and metamorphic rocks plus common minerals, with an identification key and streak plate. Ideal for geology units.",
		price: 39.0,
		imageUrl: "",
		category: "earth-space-science",
		grades: ["3-5", "6-8"],
	},

	// ── Special ────────────────────────────────────────────────────────────────
	// Standalone top-level category (no subcategories). Products reference the
	// top-level slug directly rather than a leaf.
	{
		internalId: "9001",
		sku: "99-0010",
		title: "STEM Starter Lab Bundle, Classroom of 24",
		description:
			"A curated cross-disciplinary bundle of introductory chemistry, physics, and life science materials sized for a class of 24. A cost-effective way to outfit a new lab.",
		price: 249.0,
		imageUrl: "",
		category: "special",
		grades: ["6-8", "9-12"],
	},
	{
		internalId: "9002",
		sku: "99-0025",
		title: "Clearance: Assorted Glassware Lot (Overstock)",
		description:
			"Overstock lot of assorted borosilicate glassware offered at a reduced rate while supplies last. Contents vary by lot. Sold as-is; not restockable.",
		price: 59.0,
		imageUrl: "",
		category: "special",
		grades: ["9-12", "College"],
	},
];

/** All products. Mirrors the shape a cached catalog query would return. */
export function getAllProducts(): Product[] {
	return MOCK_PRODUCTS;
}

/** Products in a single leaf category (by leaf slug). */
export function getProductsByLeaf(leafSlug: string): Product[] {
	return MOCK_PRODUCTS.filter((p) => p.category === leafSlug);
}

/**
 * Products under a top-level parent (by parent slug).
 *
 * Parents with subcategories match any of their leaf slugs. Standalone top-level
 * categories (e.g. Special) have products assigned directly to the parent slug.
 */
export function getProductsByParent(parentSlug: string): Product[] {
	const parent = getParentCategory(parentSlug);
	if (!parent) return [];
	if (parent.children?.length) {
		const leaves = new Set(parent.children.map((c) => c.slug));
		return MOCK_PRODUCTS.filter((p) => leaves.has(p.category));
	}
	return MOCK_PRODUCTS.filter((p) => p.category === parentSlug);
}

/** Look up one product by its detail-page slug (derived from SKU). */
export function getProductBySlug(slug: string): Product | undefined {
	return MOCK_PRODUCTS.find((p) => productSlug(p) === slug.toLowerCase());
}

/** Count of products in each leaf category slug. Handy for nav/landing badges. */
export function getLeafProductCounts(): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const leaf of getAllLeafCategories()) counts[leaf.slug] = 0;
	for (const p of MOCK_PRODUCTS) counts[p.category] = (counts[p.category] ?? 0) + 1;
	return counts;
}
