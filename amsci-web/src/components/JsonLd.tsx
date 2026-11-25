import { absoluteUrl, SITE_ORIGIN } from "@/lib/site";

/** Renders one schema.org JSON-LD block. `<` is escaped so data can't close the script tag. */
export function JsonLd({ data }: { data: object }) {
	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
		/>
	);
}

/** BreadcrumbList from [name, site-relative path] pairs, in trail order. */
export function BreadcrumbJsonLd({ items }: { items: [name: string, path: string][] }) {
	return (
		<JsonLd
			data={{
				"@context": "https://schema.org",
				"@type": "BreadcrumbList",
				itemListElement: items.map(([name, path], i) => ({
					"@type": "ListItem",
					position: i + 1,
					name,
					item: absoluteUrl(path),
				})),
			}}
		/>
	);
}

/** Organization (homepage only). */
export function OrganizationJsonLd() {
	return (
		<JsonLd
			data={{
				"@context": "https://schema.org",
				"@type": "Organization",
				name: "American Scientific",
				url: SITE_ORIGIN,
				logo: absoluteUrl("/am-sci-logo.png"),
				telephone: "+1-888-490-9002",
			}}
		/>
	);
}
