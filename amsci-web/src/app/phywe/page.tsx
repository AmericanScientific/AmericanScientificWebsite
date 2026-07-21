import type { Metadata } from "next";
import { PhyweLeadForm } from "@/components/PhyweLeadForm";

export const metadata: Metadata = {
	title: "PHYWE · German Innovation, American Expertise",
	description:
		"PHYWE precision physics and laboratory apparatus from American Scientific — Cobra SMARTsense, TESS experiment systems, XR 4.0 X-ray, and 20+ Nobel Prize experiment sets. Talk to a product advisor.",
};

/**
 * PHYWE marketing landing page — ported from the old WooCommerce /phywe page into
 * the new site's design language (dark hero-surface, brand-gradient, slate cards).
 * Content-only marketing page; the lead form emails the team via /api/phywe-lead.
 * PHYWE remains a separate, quote-only line (CLAUDE.md §4) — no live catalog here.
 */

const STATS = [
	{ n: "100+", l: "Years of PHYWE innovation" },
	{ n: "20+", l: "Nobel Prize experiment sets" },
	{ n: "40+", l: "Cobra SMARTsense sensors" },
	{ n: "100%", l: "Authentic lab-grade reproductions" },
];

const FEATURED = [
	{
		name: "Cobra SMARTsense",
		tag: "Sensors & data logging",
		desc: "40+ wireless & USB sensors covering every discipline, with the free measureAPP for iOS, Android, and desktop, and 150+ pre-loaded experiment configurations.",
	},
	{
		name: "TESS Experiment Systems",
		tag: "Complete. Proven. Ready to teach.",
		desc: "Turnkey experiment systems for Physics, Chemistry, Biology, and Environmental Science, built to drop straight into your curriculum.",
	},
	{
		name: "XR 4.0 Expert Unit",
		tag: "The gold standard for X-ray physics",
		desc: "Advanced X-ray education featuring computed tomography and crystal diffraction, the benchmark platform trusted by leading universities.",
	},
];

const NOBEL = [
	{ name: "Millikan", year: "1923" },
	{ name: "Photoelectric Effect", year: "1921" },
	{ name: "Franck–Hertz", year: "1925" },
	{ name: "Compton", year: "1927" },
	{ name: "Wilson Cloud Chamber", year: "1927" },
	{ name: "Stern–Gerlach", year: "1944" },
];

const WHY = [
	{ t: "Trusted Partnership", d: "Global manufacturer innovation paired with local U.S. expertise and service." },
	{ t: "Quality You Can Count On", d: "German engineering built for reliable, repeatable performance year after year." },
	{ t: "Support Beyond the Sale", d: "Consultation, setup, training, and technical support from a team that knows the equipment." },
	{ t: "Recognized Excellence", d: "Used in Nobel Prize research and trusted by leading universities worldwide." },
	{ t: "Invest in Success", d: "Scalable solutions designed for long-term institutional impact, not one-off purchases." },
];

export default function PhywePage() {
	return (
		<div>
			{/* Hero */}
			<section className="hero-surface relative overflow-hidden">
				<div className="grid-overlay absolute inset-0" />
				<div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:py-28 lg:px-8">
					<span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur">
						Specialty Catalog · PHYWE
					</span>
					<h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
						German Innovation. <span className="brand-gradient-text-light">American Expertise.</span> Future-Ready Science.
					</h1>
					<p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
						For over 100 years, PHYWE has set the global standard in laboratory science education.
						American Scientific brings that line to U.S. classrooms and labs, with expert guidance
						every step of the way.
					</p>
					<div className="mt-8 flex flex-wrap justify-center gap-3">
						<a
							href="#featured"
							className="brand-gradient rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-all hover:shadow-xl hover:brightness-105"
						>
							Explore PHYWE Products
						</a>
						<a
							href="#advisor"
							className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
						>
							Request More Information
						</a>
					</div>
				</div>
				{/* Stats */}
				<div className="relative border-t border-white/10">
					<div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-white/10 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
						{STATS.map((s) => (
							<div key={s.l} className="px-4 py-6 text-center">
								<p className="font-display text-2xl font-bold text-white sm:text-3xl">{s.n}</p>
								<p className="mt-1 text-xs leading-snug text-slate-400">{s.l}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Featured systems */}
			<section id="featured" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
				<h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
					Featured PHYWE Systems
				</h2>
				<p className="mt-2 max-w-2xl text-slate-500">
					A snapshot of the range. Ask an advisor for the full catalog and configurations that fit
					your program.
				</p>
				<div className="mt-8 grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{FEATURED.map((f) => (
						<div
							key={f.name}
							className="card-hover flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
						>
							<span className="text-xs font-semibold uppercase tracking-wider text-brand-blue">{f.tag}</span>
							<h3 className="mt-2 font-display text-lg font-bold text-slate-900">{f.name}</h3>
							<p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
						</div>
					))}
				</div>
			</section>

			{/* Nobel Prize experiments */}
			<section className="dot-grid border-y border-slate-200/70 bg-white/50">
				<div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
					<h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
						Recreate the Experiments That Won Nobel Prizes
					</h2>
					<p className="mt-2 max-w-2xl text-slate-500">
						20+ Nobel Prize experiment sets, 100% authentic lab-grade reproductions of the apparatus
						behind physics&rsquo; landmark discoveries.
					</p>
					<div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
						{NOBEL.map((e) => (
							<div key={e.name} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
								<p className="font-display text-sm font-bold text-slate-900">{e.name}</p>
								<p className="mt-1 text-xs text-slate-400">{e.year}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Why choose */}
			<section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
				<h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
					Why Educators Choose PHYWE and American Scientific
				</h2>
				<div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{WHY.map((w) => (
						<div key={w.t} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
							<h3 className="font-display text-base font-bold text-slate-900">{w.t}</h3>
							<p className="mt-2 text-sm leading-relaxed text-slate-600">{w.d}</p>
						</div>
					))}
				</div>
			</section>

			{/* Product advisor form */}
			<section id="advisor" className="dot-grid border-t border-slate-200/70 bg-white/50">
				<div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
					<div>
						<h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
							Connect with a Product Advisor
						</h2>
						<p className="mt-3 max-w-md text-slate-600">
							Interested in Nobel Prize experiment sets or any PHYWE system? Fill out the form and our
							team will follow up within one business day.
						</p>
						<div className="mt-6 space-y-2 text-sm text-slate-500">
							<p>📞 888-490-9002</p>
							<p>✉️ sales@american-scientific.com</p>
						</div>
					</div>
					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
						<PhyweLeadForm />
					</div>
				</div>
			</section>

			{/* CTA strip */}
			<section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
				<div className="hero-surface relative overflow-hidden rounded-3xl px-8 py-12 text-center sm:px-16 sm:py-16">
					<div className="grid-overlay absolute inset-0" />
					<div className="relative">
						<h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
							Let&rsquo;s build the future of science education, together.
						</h2>
						<div className="mt-8">
							<a
								href="#advisor"
								className="brand-gradient inline-block rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-105"
							>
								Request More Information
							</a>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
