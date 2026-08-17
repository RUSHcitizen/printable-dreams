// Server-side Supabase client factory for Astro (Content Layer API era —
// the current @supabase/ssr pattern, verified against Supabase's official
// Astro quickstart, not an older `auth-helpers` tutorial).
//
// Always call this per-request, from an Astro page/action/API route — never
// create a module-level singleton, since it's bound to that request's
// cookies. There is no browser/client Supabase client anywhere in this
// project: every database call happens server-side, scoped to the visitor's
// own session, so Postgres Row Level Security is enforced as that specific
// user on every query. See README "Architecture".
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function createClient({ request, cookies }: { request: Request; cookies: AstroCookies }) {
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookies.set(name, value, options));
      },
    },
  });
}
