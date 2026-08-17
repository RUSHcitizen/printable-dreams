/**
 * Central site configuration.
 *
 * Anything that might need to change without hunting through page/component
 * code — contact info, external links, nav structure — lives here in one
 * place. Pages and components import from here rather than hardcoding
 * values inline.
 */

export const SITE_TITLE = "Printable Dreams";

// Short tagline used in page heroes (Home, About).
export const TAGLINE = "We turn kids' drawings into real, 3D-printed keepsakes.";

// Default <meta name="description"> and Open Graph description for pages
// that don't set their own.
export const SITE_DESCRIPTION =
  "Printable Dreams turns kids' drawings into real, 3D-printed keepsakes — helping kids feel seen, proud, and know their ideas matter.";

export const CONTACT_EMAIL = "kumariaaatharv@gmail.com";

/**
 * Link to the form (e.g. a Google Form) that kids and parents will use to
 * request/use Printable Dreams services.
 *
 * Intentionally `null` until a real URL is supplied. Components that render
 * a "Request Services" button check this value and show a disabled
 * "coming soon" state instead of a fake or broken link.
 *
 * To go live: replace `null` below with the real form URL string.
 */
export const SERVICE_REQUEST_FORM_URL: string | null = null;

/**
 * Link to the real donation mechanism (payment processor page, e.g. a
 * PayPal Giving Fund / Every.org / direct Stripe link).
 *
 * Same pattern as SERVICE_REQUEST_FORM_URL: `null` until a real processor
 * is chosen. The Support page shows a disabled "coming soon" state instead
 * of a fake donate button.
 *
 * To go live: replace `null` below with the real donation URL string.
 */
export const DONATION_URL: string | null = null;

/**
 * Link to the partnership inquiry form (e.g. a Google Form) for
 * organizations/people interested in partnering with Printable Dreams.
 *
 * Same pattern as SERVICE_REQUEST_FORM_URL and DONATION_URL: `null` until a
 * real URL is supplied. PartnershipButton shows a disabled "coming soon"
 * state instead of a fake or broken link.
 *
 * To go live: replace `null` below with the real form URL string.
 */
export const PARTNERSHIP_FORM_URL: string | null = null;

/**
 * The production domain the site will be deployed to (e.g.
 * "https://printabledreams.org"), with no trailing slash. `null` until a
 * domain is chosen.
 *
 * This one value drives every URL-dependent SEO feature: canonical links
 * and absolute Open Graph URLs in BaseLayout.astro. To go live once a
 * domain is registered:
 *
 * 1. Set PRODUCTION_URL below.
 * 2. Add `site: "https://your-domain"` to astro.config.mjs and run
 *    `npx astro add sitemap` (see README "Domain configuration").
 */
export const PRODUCTION_URL: string | null = null;

export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about/" },
  { label: "Projects", href: "/projects/" },
  { label: "Get Involved", href: "/get-involved/" },
  { label: "Support", href: "/support/" },
  { label: "Contact", href: "/contact/" },
];

export interface SocialLink {
  label: string;
  href: string;
}

// No confirmed social accounts yet. Add entries here once real profiles
// exist — Footer already renders from this array and needs no other
// changes to pick them up.
export const SOCIAL_LINKS: SocialLink[] = [];
