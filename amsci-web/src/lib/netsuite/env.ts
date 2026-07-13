/**
 * Resolve the runtime environment that holds NetSuite secrets.
 *
 * On Cloudflare (deployed or `wrangler`/OpenNext preview) secrets live on the
 * Worker `env` binding, reachable via `getCloudflareContext()`. During plain
 * `next dev` / build / static generation there is no Cloudflare context, so we
 * fall back to `process.env` (which OpenNext populates from `.dev.vars`).
 *
 * All access is server-side only — never import this into a client component.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type RawEnv = Record<string, string | undefined>;

export function getEnv(): RawEnv {
	try {
		// Available inside a request on the Workers runtime.
		return getCloudflareContext().env as unknown as RawEnv;
	} catch {
		// Build / prerender / node dev.
		return process.env as RawEnv;
	}
}
