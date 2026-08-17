// Identity resolution for the current request.
//
// Always uses supabase.auth.getUser(), never getSession(). getSession()
// only decodes the session cookie locally and does NOT verify it against
// Supabase's Auth server — a cookie is client-writable storage, so trusting
// it unverified would mean trusting client-side state for authorization,
// which the project's security requirements explicitly forbid. getUser()
// re-validates the token with Supabase on every call. This is Supabase's
// own documented guidance, not a project-specific preference.
import type { APIContext } from "astro";
import { createClient } from "./supabase";

export async function getAuth(context: Pick<APIContext, "request" | "cookies">) {
  const supabase = createClient({ request: context.request, cookies: context.cookies });
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user ?? null };
}
