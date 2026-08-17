/**
 * Central site configuration.
 *
 * Anything that might need to change without hunting through page/component
 * code — contact info, external links, nav structure — lives here in one
 * place. Pages and components import from here rather than hardcoding
 * values inline.
 */

export const SITE_TITLE = "Printable Dreams";

// TODO(content): Replace with the real one-line mission summary once it's
// provided (Phase 4). Used as the default <meta name="description"> and
// Open Graph description for pages that don't set their own.
export const SITE_DESCRIPTION_PLACEHOLDER =
  "Printable Dreams is a nonprofit that uses 3D printing to help kids. Full mission statement coming soon.";

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
