import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { formatPrice } from "@/lib/format";
import type { TokenPurpose } from "./tokens";

/**
 * Transactional email via Resend (https://resend.com). Sender is a dedicated
 * domain (am-sci.com) verified in Resend with its own DNS records, separate
 * from the american-scientific.com M365 mail, so it can't affect that setup.
 * Secret: RESEND_API_KEY (wrangler secret). Config vars: EMAIL_FROM,
 * EMAIL_FROM_NAME, SITE_URL.
 */
interface MailEnv {
	RESEND_API_KEY?: string;
	EMAIL_FROM?: string;
	EMAIL_FROM_NAME?: string;
	SITE_URL?: string;
	AUTH_DEV_LINKS?: string;
	/** Where new-account requests are emailed (defaults to sales@american-scientific.com). */
	SALES_NOTIFY_EMAIL?: string;
}

function mailEnv(): MailEnv {
	try {
		return getCloudflareContext().env as unknown as MailEnv;
	} catch {
		return {};
	}
}

/**
 * Whether to surface setup/reset links in API responses (for local testing
 * without a mail provider). Gated on an EXPLICIT env flag set only in .dev.vars,
 * never in production, so a prod deploy without the EMAIL binding can't leak links.
 */
export function devLinksEnabled(): boolean {
	return mailEnv().AUTH_DEV_LINKS === "1";
}

/** Absolute base URL for links in emails: SITE_URL if set, else the request origin. */
export function siteBaseUrl(request: Request): string {
	const env = mailEnv();
	if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, "");
	return new URL(request.url).origin;
}

const COPY: Record<TokenPurpose, { subject: string; heading: string; intro: string; cta: string; expiry: string }> = {
	setup: {
		subject: "Set up your American Scientific account",
		heading: "Welcome to the new American Scientific",
		intro: "We've launched a brand new website. To keep your account secure, please set a new password. Your previous password does not carry over to the new site.",
		cta: "Set your password",
		expiry: "72 hours",
	},
	reset: {
		subject: "Reset your American Scientific password",
		heading: "Reset your password",
		intro: "We received a request to reset your password. Choose a new one using the button below. If you did not request this, you can safely ignore this email.",
		cta: "Reset your password",
		expiry: "1 hour",
	},
};

// Brand palette (matches src/app/globals.css).
const BRAND_GRADIENT = "linear-gradient(100deg,#c1121f,#7a2f8f 52%,#1391d5)";
const BRAND_BLUE_DEEP = "#0a6ea8"; // solid fallback for clients that drop gradients (Outlook)

function renderHtml(name: string, link: string, purpose: TokenPurpose): string {
	const c = COPY[purpose];
	const greeting = name ? `Hi ${name},` : "Hello,";
	let base = "";
	try {
		base = new URL(link).origin;
	} catch {
		base = "";
	}
	const logo = `${base}/am-sci-logo.png`;
	const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
	return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f6f7fb;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Set a new password for your American Scientific account.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <tr><td style="height:6px;background:${BRAND_BLUE_DEEP};background-image:${BRAND_GRADIENT};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td align="center" style="padding:32px 32px 8px;">
          <img src="${logo}" alt="American Scientific" width="170" style="width:170px;max-width:70%;height:auto;display:block;border:0;">
        </td></tr>
        <tr><td style="padding:12px 40px 40px;font-family:${font};color:#0b1220;">
          <h1 style="margin:16px 0 16px;font-size:22px;line-height:1.3;color:#0a0f1c;">${c.heading}</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${greeting}</p>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#334155;">${c.intro}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr>
            <td align="center" bgcolor="${BRAND_BLUE_DEEP}" style="border-radius:9999px;background-image:${BRAND_GRADIENT};">
              <a href="${link}" style="display:inline-block;padding:14px 32px;font-family:${font};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:9999px;">${c.cta}</a>
            </td>
          </tr></table>
          <p style="margin:0 0 6px;font-size:13px;color:#64748b;">Or paste this link into your browser:</p>
          <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${link}" style="color:${BRAND_BLUE_DEEP};">${link}</a></p>
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">This secure link can only be used once and expires in ${c.expiry}. If you weren't expecting it, you can ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #eef2f7;font-family:${font};font-size:12px;color:#94a3b8;line-height:1.7;">
          American Scientific, LLC<br>
          888-490-9002 &nbsp;&middot;&nbsp; office@american-scientific.com &nbsp;&middot;&nbsp; Columbus, OH
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderText(name: string, link: string, purpose: TokenPurpose): string {
	const c = COPY[purpose];
	return `${name ? `Hi ${name},` : "Hello,"}

${c.intro}

${c.cta}: ${link}

This secure link can only be used once and expires in ${c.expiry}.

American Scientific, LLC
888-490-9002 | office@american-scientific.com | Columbus, OH`;
}

/**
 * Send a password setup/reset email via Resend. When RESEND_API_KEY is unset
 * (local dev, or before the sender domain is configured), it logs the link and
 * returns { delivered:false, devFallback:true } so the flow still works and can
 * be tested without a mail provider. Never throws.
 */
export async function sendPasswordEmail(
	to: string,
	name: string,
	link: string,
	purpose: TokenPurpose,
): Promise<{ delivered: boolean; devFallback: boolean; link: string }> {
	const env = mailEnv();
	const c = COPY[purpose];
	// No API key = dev / not yet configured. Log the link and flag it as a dev
	// fallback so callers may surface it locally (never in production).
	if (!env.RESEND_API_KEY) {
		console.log(`[auth/email] no RESEND_API_KEY: ${purpose} link for ${to}: ${link}`);
		return { delivered: false, devFallback: true, link };
	}
	const fromAddr = env.EMAIL_FROM || "hello@am-sci.com";
	const fromName = env.EMAIL_FROM_NAME || "American Scientific";
	try {
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: `${fromName} <${fromAddr}>`,
				to: [to],
				subject: c.subject,
				html: renderHtml(name, link, purpose),
				text: renderText(name, link, purpose),
			}),
		});
		if (!res.ok) {
			const detail = await res.text().catch(() => "");
			console.error(`[auth/email] Resend ${res.status} for ${to}: ${detail}`);
			return { delivered: false, devFallback: false, link };
		}
		return { delivered: true, devFallback: false, link };
	} catch (err) {
		// Network/API failure → do NOT leak the link.
		console.error(`[auth/email] send failed for ${to}:`, err);
		return { delivered: false, devFallback: false, link };
	}
}

const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Low-level Resend send used by the account-lifecycle emails below. Never throws. */
async function sendMail(to: string, subject: string, html: string, text: string): Promise<boolean> {
	const env = mailEnv();
	if (!env.RESEND_API_KEY) {
		console.log(`[auth/email] no RESEND_API_KEY: would send "${subject}" to ${to}`);
		return false;
	}
	const fromAddr = env.EMAIL_FROM || "hello@am-sci.com";
	const fromName = env.EMAIL_FROM_NAME || "American Scientific";
	try {
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
			body: JSON.stringify({ from: `${fromName} <${fromAddr}>`, to: [to], subject, html, text }),
		});
		if (!res.ok) {
			console.error(`[auth/email] Resend ${res.status} for ${to}: ${await res.text().catch(() => "")}`);
			return false;
		}
		return true;
	} catch (err) {
		console.error(`[auth/email] send failed for ${to}:`, err);
		return false;
	}
}

const esc = (s: string) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Details captured by the /register form, for the Sales notification. */
export interface AccountRequestDetails {
	name: string;
	email: string;
	company: string;
	phone: string;
	address: string;
	accountType: string;
}

/**
 * Notify the team of a new account request (replaces the old Gravity Forms
 * "New user registration" email). Recipient = SALES_NOTIFY_EMAIL, default
 * sales@american-scientific.com. Returns whether it was delivered.
 */
export async function sendNewAccountEmail(d: AccountRequestDetails): Promise<boolean> {
	const to = mailEnv().SALES_NOTIFY_EMAIL || "sales@american-scientific.com";
	const rows: [string, string][] = [
		["Name", d.name],
		["Email", d.email],
		["Company", d.company],
		["Phone", d.phone],
		["Address", d.address],
		["Account type", d.accountType],
	];
	const htmlRows = rows
		.map(
			([k, v]) =>
				`<tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:600;font-size:13px;color:#334155;white-space:nowrap;vertical-align:top;">${esc(k)}</td>` +
				`<td style="padding:6px 12px;font-size:14px;color:#0b1220;white-space:pre-line;">${esc(v || "—")}</td></tr>`,
		)
		.join("");
	const html = `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:${font};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:20px 24px;border-bottom:1px solid #eef2f7;font-size:16px;font-weight:700;color:#0a0f1c;">New account request</td></tr>
      <tr><td style="padding:16px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${htmlRows}</table></td></tr>
      <tr><td style="padding:14px 24px;background:#f8fafc;border-top:1px solid #eef2f7;font-size:12px;color:#64748b;">Review and approve in the admin queue, then set the customer's price tier.</td></tr>
    </table>
  </td></tr></table></body></html>`;
	const text =
		`New account request\n\n` +
		rows.map(([k, v]) => `${k}: ${v || "—"}`).join("\n") +
		`\n\nReview and approve in the admin queue, then set the customer's price tier.`;
	return sendMail(to, "American Scientific - New account request", html, text);
}

/** One priced line in an order email. */
export interface OrderEmailLine {
	sku: string;
	title: string;
	qty: number;
	unitPrice: number | null;
	lineTotal: number | null;
}

export interface OrderEmailData {
	orderId: number;
	dateLabel: string;
	customer: { name: string; email: string; company: string; phone: string; address: string };
	lines: OrderEmailLine[];
	subtotal: number;
	total: number;
	hasUnpriced: boolean;
	/** Optional customer-entered PO number ("" when not provided). */
	poNumber: string;
}

const money = (n: number | null) => (n != null ? formatPrice(n) : "Call for pricing");

function orderTableHtml(d: OrderEmailData): string {
	const th = "padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#334155;background:#f1f5f9;border:1px solid #e2e8f0;";
	const td = "padding:8px 12px;font-size:14px;color:#0b1220;border:1px solid #e2e8f0;vertical-align:top;";
	const rows = d.lines
		.map(
			(l) =>
				`<tr><td style="${td}">${esc(l.title)}<br><span style="color:#64748b;font-size:12px;">(#${esc(l.sku)})</span></td>` +
				`<td style="${td}">${l.qty}</td><td style="${td}">${esc(money(l.lineTotal))}</td></tr>`,
		)
		.join("");
	const summary = `<td style="${td}"></td>`;
	const poRow = d.poNumber
		? `<tr><td style="${td}"><strong>PO number:</strong></td>${summary}<td style="${td}">${esc(d.poNumber)}</td></tr>`
		: "";
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 20px;">
    <tr><th style="${th}">Product</th><th style="${th}">Quantity</th><th style="${th}">Price</th></tr>
    ${rows}
    <tr><td style="${td}"><strong>Subtotal:</strong></td>${summary}<td style="${td}">${esc(money(d.subtotal))}${d.hasUnpriced ? " +" : ""}</td></tr>
    <tr><td style="${td}"><strong>Payment method:</strong></td>${summary}<td style="${td}">Submit Purchase Order</td></tr>
    ${poRow}
    <tr><td style="${td}"><strong>Total:</strong></td>${summary}<td style="${td}">${esc(money(d.total))}${d.hasUnpriced ? " +" : ""}</td></tr>
  </table>`;
}

function orderTableText(d: OrderEmailData): string {
	const lines = d.lines.map((l) => `  - ${l.title} (#${l.sku}) x${l.qty} — ${money(l.lineTotal)}`).join("\n");
	const poLine = d.poNumber ? `\nPO number: ${d.poNumber}` : "";
	return `${lines}\n\nSubtotal: ${money(d.subtotal)}${d.hasUnpriced ? " (+ items priced on request)" : ""}\nPayment method: Submit Purchase Order${poLine}\nTotal: ${money(d.total)}`;
}

function customerBlockHtml(c: OrderEmailData["customer"]): string {
	const parts = [c.name, c.company, c.address, c.phone, c.email].filter(Boolean).map(esc);
	return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;font-size:14px;color:#334155;white-space:pre-line;">${parts.join("\n")}</div>`;
}

/**
 * Email the team a new order request (mirrors the old WooCommerce "New Order"
 * email). Recipient = SALES_NOTIFY_EMAIL (default sales@american-scientific.com).
 */
export async function sendOrderRequestEmail(d: OrderEmailData): Promise<boolean> {
	const to = mailEnv().SALES_NOTIFY_EMAIL || "sales@american-scientific.com";
	const html = `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:${font};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:20px 24px;background:${BRAND_BLUE_DEEP};background-image:${BRAND_GRADIENT};color:#fff;font-size:18px;font-weight:700;">New order request #${d.orderId}</td></tr>
      <tr><td style="padding:20px 24px;color:#0b1220;">
        <p style="margin:0 0 4px;font-size:15px;">You've received the following order from <strong>${esc(d.customer.name || d.customer.email)}</strong>:</p>
        <p style="margin:0 0 12px;font-size:13px;color:#64748b;">Order #${d.orderId} · ${esc(d.dateLabel)}</p>
        ${orderTableHtml(d)}
        <h2 style="margin:8px 0 8px;font-size:15px;color:#0a0f1c;">Account details</h2>
        ${customerBlockHtml(d.customer)}
        <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">Quote-style request — no payment taken. Write the PO from this email.${d.hasUnpriced ? " Some lines are priced on request (+)." : ""}</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
	const text =
		`New order request #${d.orderId}\n\nFrom: ${d.customer.name || d.customer.email} · ${d.dateLabel}\n\n` +
		orderTableText(d) +
		`\n\nAccount details:\n${[d.customer.name, d.customer.company, d.customer.address, d.customer.phone, d.customer.email].filter(Boolean).join("\n")}\n\nQuote-style request — write the PO from this email.`;
	return sendMail(to, `New order request #${d.orderId} from ${d.customer.name || d.customer.email}`, html, text);
}

/** Confirm to the customer that their order request was received. */
export async function sendOrderConfirmationEmail(d: OrderEmailData): Promise<boolean> {
	const html = `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:${font};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr><td style="height:6px;background:${BRAND_BLUE_DEEP};background-image:${BRAND_GRADIENT};font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:24px 24px 0;color:#0b1220;">
        <h1 style="margin:0 0 8px;font-size:20px;color:#0a0f1c;">Order request received</h1>
        <p style="margin:0 0 4px;font-size:15px;">${d.customer.name ? `Hi ${esc(d.customer.name)},` : "Hello,"}</p>
        <p style="margin:0 0 12px;font-size:15px;color:#334155;">Thanks for your order request <strong>#${d.orderId}</strong> (${esc(d.dateLabel)}). Our team will review it and follow up to confirm pricing, availability, and your purchase order.</p>
        ${orderTableHtml(d)}
      </td></tr>
      <tr><td style="padding:12px 24px 24px;background:#f8fafc;border-top:1px solid #eef2f7;font-size:12px;color:#94a3b8;line-height:1.7;">American Scientific, LLC<br>888-490-9002 &middot; office@american-scientific.com &middot; Columbus, OH</td></tr>
    </table>
  </td></tr></table></body></html>`;
	const text =
		`Order request received — #${d.orderId} (${d.dateLabel})\n\n${d.customer.name ? `Hi ${d.customer.name},` : "Hello,"}\n\nThanks for your order request. Our team will review it and follow up.\n\n` +
		orderTableText(d) +
		`\n\nAmerican Scientific, LLC\n888-490-9002 | office@american-scientific.com`;
	return sendMail(d.customer.email, `Your American Scientific order request #${d.orderId}`, html, text);
}

/** Tell an approved applicant they can now sign in. Returns whether it was delivered. */
export async function sendAccountApprovedEmail(to: string, name: string, siteUrl: string): Promise<boolean> {
	const loginUrl = `${siteUrl.replace(/\/$/, "")}/login`;
	const greeting = name ? `Hi ${esc(name)},` : "Hello,";
	const html = `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:${font};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      <tr><td style="height:6px;background:${BRAND_BLUE_DEEP};background-image:${BRAND_GRADIENT};font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:32px 40px;color:#0b1220;">
        <h1 style="margin:0 0 16px;font-size:22px;color:#0a0f1c;">Your account is approved</h1>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${greeting}</p>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#334155;">Your American Scientific account has been approved. You can now sign in with the password you chose to see your account pricing and place orders.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr>
          <td align="center" bgcolor="${BRAND_BLUE_DEEP}" style="border-radius:9999px;background-image:${BRAND_GRADIENT};">
            <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:9999px;">Sign in</a>
          </td>
        </tr></table>
        <p style="margin:0;font-size:12px;color:#94a3b8;">If the button doesn't work, go to ${loginUrl}</p>
      </td></tr>
      <tr><td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #eef2f7;font-size:12px;color:#94a3b8;line-height:1.7;">American Scientific, LLC<br>888-490-9002 &middot; office@american-scientific.com &middot; Columbus, OH</td></tr>
    </table>
  </td></tr></table></body></html>`;
	const text = `${name ? `Hi ${name},` : "Hello,"}\n\nYour American Scientific account has been approved. Sign in with the password you chose: ${loginUrl}\n\nAmerican Scientific, LLC\n888-490-9002 | office@american-scientific.com`;
	return sendMail(to, "Your American Scientific account is approved", html, text);
}
