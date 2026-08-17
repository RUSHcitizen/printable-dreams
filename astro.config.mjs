// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // Output stays "static" (the default): the whole site is prerendered to
  // HTML at build time UNLESS a page opts out with `export const
  // prerender = false`. Only the member-platform/auth pages do that — see
  // README "Architecture". The adapter below is what makes those on-demand
  // pages renderable at all when deployed to Cloudflare.
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()]
  }
});
