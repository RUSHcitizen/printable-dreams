/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig(
  {
    test: {
      globals: true,
    },
  },
  // Component tests do not run in the Cloudflare Worker environment. Loading
  // the production adapter here adds Worker-only Vite settings that conflict
  // with Vitest's Node SSR environment.
  { configFile: false },
);
