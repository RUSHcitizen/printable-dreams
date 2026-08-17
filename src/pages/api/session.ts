// Tiny endpoint the static Header script calls client-side to decide which
// nav state to show (signed-in vs signed-out). This is the one deliberate
// exception to "zero JS on public pages" — see README "Architecture" for
// why the alternative (making every page on-demand just to know auth
// state) was rejected. This endpoint reveals nothing sensitive: only a
// boolean and the display name, both already visible to the signed-in
// visitor themselves.
export const prerender = false;
import type { APIRoute } from "astro";
import { getAuth } from "../../lib/auth";

export const GET: APIRoute = async (context) => {
  const { user } = await getAuth(context);
  return new Response(
    JSON.stringify({
      signedIn: Boolean(user),
      displayName: (user?.user_metadata?.display_name as string | undefined) ?? null,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        // Never cache a session check at a shared/CDN layer.
        "Cache-Control": "private, no-store",
      },
    },
  );
};
