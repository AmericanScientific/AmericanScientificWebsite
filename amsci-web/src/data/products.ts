import type { Product } from "@/types/product";
import { productSlug } from "@/types/product";

/**
 * Placeholder catalog for the storefront shell.
 *
 * This is mock data ONLY. In production the catalog is populated from NetSuite
 * (`item WHERE isonline='T' AND isinactive='F'`, per CLAUDE.md §3) and cached.
 * Nothing here should be treated as authoritative. SKUs follow the real
 * "NNN-NNNNN" / "NN-NNNN" formats seen on the live site; internalIds are
 * fabricated stand-ins for NetSuite's canonical keys.
 */
export const MOCK_PRODUCTS: Product[] = [
	// ── Chemistry ────────────────────────────────────────────────────────────
	{
		internalId: "1001",
		sku: "10-1530",
		title: "pH Test Strips, Universal (0–14), Vial of 100",
		description:
			"Universal indicator strips for rapid pH determination across the full 0–14 range. Color-matched to a reference chart for clear classroom readings. Sold by the vial.",
		price: 8.95,
		imageUrl: "",
		category: "Chemistry",
		grades: ["6-8", "9-12"],
	},
	{
		internalId: "1002",
		sku: "10-2245",
		title: "Sodium Chloride, Reagent Grade, 500 g",
		description:
			"Laboratory-grade sodium chloride (ACS reagent) suitable for solution preparation, titration standards, and general chemistry instruction. Packaged in a resealable 500 g bottle.",
		price: 14.5,
		imageUrl: "",
		category: "Chemistry",
		grades: ["9-12", "College"],
	},
	{
		internalId: "1003",
		sku: "10-3390",
		title: "Erlenmeyer Flask, Borosilicate Glass, 250 mL",
		description:
			"Heavy-wall borosilicate 3.3 flask with a durable white graduation scale and a wide base for stability during swirling and heating. Autoclavable.",
		price: 6.75,
		imageUrl: "",
		category: "Chemistry",
		grades: ["9-12", "College"],
	},

	// ── Laboratory ───────────────────────────────────────────────────────────
	{
		internalId: "2001",
		sku: "22-4100",
		title: "Student Compound Microscope, 40x–400x, LED",
		description:
			"Monocular compound microscope with three achromatic objectives, coaxial coarse/fine focus, and cool LED illumination. Built for durability in the teaching lab.",
		price: 129.0,
		imageUrl: "",
		category: "Laboratory",
		grades: ["6-8", "9-12", "College"],
	},
	{
		internalId: "2002",
		sku: "22-4780",
		title: "Digital Pocket Scale, 0.01 g Resolution, 200 g Capacity",
		description:
			"Compact precision balance with a stainless steel platform, tare function, and backlit display. Ideal for measuring reagents and small samples at the bench.",
		price: 24.95,
		imageUrl: "",
		category: "Laboratory",
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
		category: "Laboratory",
		grades: ["6-8", "9-12", "College"],
	},
	{
		internalId: "2004",
		sku: "22-6620",
		title: "Digital Hot Plate Stirrer, 5 in. Ceramic Top",
		description:
			"Combined hotplate and magnetic stirrer with independent heat and speed control and a chemical-resistant ceramic top. Includes one PTFE stir bar.",
		price: 189.0,
		imageUrl: "",
		category: "Laboratory",
		grades: ["9-12", "College"],
	},

	// ── Life Science ─────────────────────────────────────────────────────────
	{
		internalId: "3001",
		sku: "480-00120",
		title: "Prepared Microscope Slide, Streptococcus Bacteria",
		description:
			"Professionally prepared and stained slide of Streptococcus for the study of bacterial morphology. Cover-slipped and labeled for immediate classroom use.",
		price: 0.89,
		imageUrl: "",
		category: "Life Science",
		grades: ["9-12", "College"],
	},
	{
		internalId: "3002",
		sku: "35-2210",
		title: "Human Skeleton Model, Miniature, 17 in. with Stand",
		description:
			"Desktop-scale skeleton showing all major bones and joints, mounted on a stable base. A durable, cost-effective aid for teaching human anatomy.",
		price: 42.0,
		imageUrl: "",
		category: "Life Science",
		grades: ["6-8", "9-12"],
	},
	{
		internalId: "3003",
		sku: "35-4455",
		title: "Owl Pellet Dissection Kit, Class Pack of 15",
		description:
			"Heat-sterilized owl pellets with bone identification charts and dissection tools. Supports hands-on lessons in food webs, ecology, and skeletal anatomy.",
		price: 58.5,
		imageUrl: "",
		category: "Life Science",
		grades: ["3-5", "6-8"],
	},

	// ── Physics & Physical Science ─────────────────────────────────────────────
	{
		internalId: "4001",
		sku: "50-1100",
		title: "Dynamics Cart Set with Track, 1.2 m",
		description:
			"Low-friction cart-and-track system with adjustable end stops and mass bars for experiments in motion, momentum, and collisions. Aluminum track with a leveling foot.",
		price: 96.0,
		imageUrl: "",
		category: "Physics & Physical Science",
		grades: ["9-12", "College"],
	},
	{
		internalId: "4002",
		sku: "50-2075",
		title: "Horseshoe Magnet, Alnico, 3 in., Pair",
		description:
			"Powerful alnico horseshoe magnets with keeper bars for demonstrating magnetic fields, poles, and attraction/repulsion. Sold as a matched pair.",
		price: 12.4,
		imageUrl: "",
		category: "Physics & Physical Science",
		grades: ["3-5", "6-8", "9-12"],
	},
];

/** All products. Mirrors the shape a cached catalog query would return. */
export function getAllProducts(): Product[] {
	return MOCK_PRODUCTS;
}

/** Products filtered to a single top-level category. */
export function getProductsByCategory(category: string): Product[] {
	return MOCK_PRODUCTS.filter((p) => p.category === category);
}

/** Look up one product by its detail-page slug (derived from SKU). */
export function getProductBySlug(slug: string): Product | undefined {
	return MOCK_PRODUCTS.find((p) => productSlug(p) === slug.toLowerCase());
}
