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

// Legal status line shown in the footer and reflected in the Organization
// structured data (BaseLayout). Confirmed by Printable Dreams.
export const NONPROFIT_STATUS = "Printable Dreams is a registered 501(c)(3) nonprofit organization.";

export const CONTACT_EMAIL = "kumariaaatharv@gmail.com";

/**
 * The founder's name, as introduced in the founder speech — used in the
 * founder story (About, Home) and in the Organization structured data. Not
 * a title beyond what's been confirmed; just the name.
 */
export const FOUNDER_NAME = "Atharv Kumaria";

/**
 * Link to the real Google Form that kids and parents use to request a
 * print.
 *
 * To take this offline again in the future, set it back to `null` —
 * components that render a "Request Services" button check this value and
 * show a disabled "coming soon" state instead of a fake or broken link.
 */
export const SERVICE_REQUEST_FORM_URL: string | null =
  "https://docs.google.com/forms/d/e/1FAIpQLSczgQDpnlUzg-by4bg3k-OQIpNIl9gFc0JdAqtmtXGCJLQaOQ/viewform?usp=dialog";

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
 * Link to the real Google Form for organizations/people interested in
 * partnering with Printable Dreams.
 *
 * Same pattern as SERVICE_REQUEST_FORM_URL: set back to `null` to have
 * PartnershipButton show a disabled "coming soon" state instead.
 */
export const PARTNERSHIP_FORM_URL: string | null =
  "https://docs.google.com/forms/d/e/1FAIpQLSe03bOrPysO55mT__WccVaQJfV_y3iRbFodxC-NCS4sAOTQ-A/viewform?usp=dialog";

/**
 * The production domain the site is deployed to, no trailing slash. Drives
 * canonical links, absolute Open Graph URLs, and the sitemap (see
 * astro.config.mjs `site` and README "Domain configuration").
 */
export const PRODUCTION_URL: string | null = "https://printabledreams.org";

export interface NavLink {
  label: string;
  href: string;
}

// The primary nav — kept to 6 items so the header stays uncluttered even
// with auth-state nav and the "Request a Print" CTA also present (see
// Header.astro). Contact is intentionally not in this list: it's still a
// real page, reachable from the footer (where the contact email already
// lives on every page) and from Support/Get Involved — demoting it here
// was a deliberate call to make room for Partners without growing the bar.
export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about/" },
  { label: "Projects", href: "/projects/" },
  { label: "Partners", href: "/partners/" },
  { label: "Get Involved", href: "/get-involved/" },
  { label: "Support", href: "/support/" },
];

export interface Partner {
  name: string;
  /**
   * Optional one-line context — an organizational affiliation for a named
   * individual. Only ever what's been explicitly confirmed; never an
   * invented title or role.
   */
  context?: string;
}

/**
 * Confirmed Printable Dreams partners. Do not alter names or add context
 * beyond what's been explicitly provided — see README "Content accuracy".
 */
export const PARTNERS: Partner[] = [
  { name: "Sammamish Rotary" },
  { name: "BlueGrit Wellness" },
  { name: "Todd Henderson", context: "Inglewood Middle School" },
  { name: "Amy Lam", context: "Sammamish City Council" },
];

export interface SocialLink {
  label: string;
  href: string;
}

// No confirmed social accounts yet. Add entries here once real profiles
// exist — Footer already renders from this array and needs no other
// changes to pick them up.
export const SOCIAL_LINKS: SocialLink[] = [];
