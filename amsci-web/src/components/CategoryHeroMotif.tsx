/**
 * Big ghosted, animated science motif for the category hero — one bespoke design
 * per top-level category. Pure inline SVG + CSS animations (classes in
 * globals.css, `.m-*`), so it stays a server component and needs no JS.
 * Reduced-motion disables the motion; the shapes remain.
 */
const V = "0 0 200 200";

function Chemistry() {
	// Erlenmeyer flask with liquid + bubbles rising out of it.
	const bubbles = [
		{ cx: 92, cy: 138, r: 4, d: "0s" },
		{ cx: 104, cy: 132, r: 3, d: "0.9s" },
		{ cx: 110, cy: 142, r: 5, d: "1.8s" },
		{ cx: 98, cy: 128, r: 3.5, d: "2.5s" },
	];
	return (
		<svg viewBox={V} aria-hidden="true">
			<path className="m-soft" d="M76 126 L64 150 A12 12 0 0 0 76 165 H124 A12 12 0 0 0 136 150 L124 126 Z" />
			<path className="m-stroke" d="M86 55 H114 M91 55 V96 L64 150 A12 12 0 0 0 76 165 H124 A12 12 0 0 0 136 150 L109 96 V55" />
			{bubbles.map((b, i) => (
				<circle key={i} className="m-bubble" cx={b.cx} cy={b.cy} r={b.r} style={{ animationDelay: b.d }} />
			))}
		</svg>
	);
}

function Physics() {
	// Nucleus + three orbits with electrons; whole system spins.
	return (
		<svg viewBox={V} aria-hidden="true">
			<g className="m-orbit">
				<g>
					<ellipse className="m-stroke" cx="100" cy="100" rx="54" ry="21" />
					<circle className="m-dot" cx="154" cy="100" r="4.5" />
				</g>
				<g transform="rotate(60 100 100)">
					<ellipse className="m-stroke" cx="100" cy="100" rx="54" ry="21" />
					<circle className="m-dot" cx="154" cy="100" r="4.5" />
				</g>
				<g transform="rotate(120 100 100)">
					<ellipse className="m-stroke" cx="100" cy="100" rx="54" ry="21" />
					<circle className="m-dot" cx="154" cy="100" r="4.5" />
				</g>
			</g>
			<circle className="m-soft" cx="100" cy="100" r="13" />
			<circle className="m-dot" cx="100" cy="100" r="5.5" />
		</svg>
	);
}

function LifeScience() {
	// DNA double helix with shimmering rungs.
	const rungs = [
		{ y: 62, x1: 90, x2: 110, d: "0s" },
		{ y: 78, x1: 82, x2: 118, d: "0.4s" },
		{ y: 100, x1: 78, x2: 122, d: "0.8s" },
		{ y: 122, x1: 82, x2: 118, d: "1.2s" },
		{ y: 138, x1: 90, x2: 110, d: "1.6s" },
	];
	return (
		<svg viewBox={V} aria-hidden="true">
			<path className="m-stroke" d="M100 50 C78 66 78 84 100 100 C122 116 122 134 100 150" />
			<path className="m-stroke" d="M100 50 C122 66 122 84 100 100 C78 116 78 134 100 150" />
			{rungs.map((r, i) => (
				<line key={i} className="m-rung m-stroke" x1={r.x1} y1={r.y} x2={r.x2} y2={r.y} style={{ animationDelay: r.d }} />
			))}
		</svg>
	);
}

function Laboratory() {
	// Beaker with a sloshing liquid surface + a couple bubbles.
	return (
		<svg viewBox={V} aria-hidden="true">
			<path className="m-stroke" d="M72 52 V148 A28 28 0 0 0 128 148 V52 M66 52 H134" />
			<g className="m-wave">
				<path className="m-soft" d="M74 112 q14 -9 26 0 t26 0 V148 A26 26 0 0 1 74 148 Z" />
			</g>
			<circle className="m-bubble" cx="92" cy="138" r="3.5" style={{ animationDelay: "0.5s" }} />
			<circle className="m-bubble" cx="108" cy="132" r="3" style={{ animationDelay: "1.6s" }} />
		</svg>
	);
}

function Special() {
	// Twinkling four-point sparkles.
	const star = "M0 -13 C1.6 -4 4 -1.6 13 0 C4 1.6 1.6 4 0 13 C-1.6 4 -4 1.6 -13 0 C-4 -1.6 -1.6 -4 0 -13 Z";
	const stars = [
		{ x: 100, y: 92, s: 2.1, d: "0s" },
		{ x: 62, y: 66, s: 1.2, d: "0.7s" },
		{ x: 140, y: 128, s: 1.5, d: "1.3s" },
		{ x: 128, y: 58, s: 0.9, d: "1.9s" },
		{ x: 70, y: 138, s: 1.0, d: "2.3s" },
	];
	return (
		<svg viewBox={V} aria-hidden="true">
			{stars.map((st, i) => (
				<path
					key={i}
					className="m-twinkle m-soft"
					d={star}
					transform={`translate(${st.x} ${st.y}) scale(${st.s})`}
					style={{ animationDelay: st.d, opacity: 0.9 }}
				/>
			))}
		</svg>
	);
}

function Phywe() {
	// Pulsing energy rings behind a lightning bolt.
	const rings = ["0s", "1.05s", "2.1s"];
	return (
		<svg viewBox={V} aria-hidden="true">
			{rings.map((d, i) => (
				<circle key={i} className="m-ring m-stroke" cx="100" cy="100" r="46" style={{ animationDelay: d }} />
			))}
			<path className="m-soft" d="M108 52 L82 106 H100 L92 148 L122 92 H104 Z" />
			<path className="m-stroke" d="M108 52 L82 106 H100 L92 148 L122 92 H104 Z" />
		</svg>
	);
}

const MOTIFS: Record<string, () => React.ReactElement> = {
	chemistry: Chemistry,
	laboratory: Laboratory,
	"life-science": LifeScience,
	"physics-physical-science": Physics,
	special: Special,
	phywe: Phywe,
};

export function CategoryHeroMotif({ slug }: { slug: string }) {
	const Motif = MOTIFS[slug];
	if (!Motif) return null;
	return (
		<div className="cat-motif" aria-hidden="true">
			<Motif />
		</div>
	);
}
