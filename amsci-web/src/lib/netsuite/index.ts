/**
 * NetSuite integration (server-side only).
 *
 * Secrets are read from the environment (`.dev.vars` locally, wrangler secrets
 * when deployed) — see `.dev.vars.example`. Nothing here is wired into the
 * storefront yet; this is the entry point for the integration work.
 */
export { NetSuiteClient, NetSuiteError, type SuiteQLPage } from "./client";
export {
	loadNetSuiteConfig,
	hasNetSuiteConfig,
	NS_ENV_KEYS,
	type NetSuiteConfig,
} from "./config";
export { getEnv, type RawEnv } from "./env";
export { fetchNetSuiteItem, type NetSuiteItem } from "./items";
