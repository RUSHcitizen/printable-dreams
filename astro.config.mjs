// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // The real production domain (see src/config/site.ts PRODUCTION_URL) —
  // drives canonical URLs, absolute Open Graph URLs, and the sitemap below.
  site: 'https://printabledreams.org',

  // Output stays "static" (the default): the whole site is prerendered to
  // HTML at build time UNLESS a page opts out with `export const
  // prerender = false`. Only the member-platform/auth pages do that — see
  // README "Architecture". The adapter below is what makes those on-demand
  // pages renderable at all when deployed to Cloudflare.
  adapter: cloudflare(),

  // /partner (singular) was the route name briefly used during
  // development before it was renamed to /partners — the site has never
  // been deployed to the production domain, so there's no real inbound
  // traffic to it, but the redirect is here in case anything (a bookmark,
  // a preview link) still points at the old path.
  redirects: {
    '/partner': '/partners',
  },

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [
    sitemap({
      // Keep the sitemap to genuinely public, indexable pages. Signed-in-only
      // pages (dashboard/profile/groups) and non-content routes (signout,
      // the OAuth callback) have nothing for a search engine to index and
      // would just 302 a crawler to /signin anyway.
      filter: (page) =>
        !['/dashboard/', '/profile/', '/groups/', '/signout/', '/auth/callback/'].some((path) =>
          page.endsWith(path),
        ),
    }),
  ]
});