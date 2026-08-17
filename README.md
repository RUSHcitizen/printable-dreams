# Printable Dreams

Source code for the Printable Dreams website — a nonprofit that turns kids' drawings into real, 3D-printed
keepsakes. The site has two layers: a fully static public website, and a small authenticated member platform
(sign up, profile, groups) layered on top of it.

## Architecture

```
                              ┌─────────────────────────────┐
                              │        Cloudflare Worker      │
                              │      (@astrojs/cloudflare)     │
  Visitor ──── request ──────▶│                               │
                              │  Static route? ──▶ serve      │
                              │  prebuilt HTML from ASSETS      │
                              │  (Home, About, Projects, ...)    │
                              │                                    │
                              │  On-demand route? ──▶ run Astro     │
                              │  page/action, using the visitor's    │
                              │  own session cookie                   │
                              └──────────────┬────────────────────────┘
                                             │ createServerClient(request, cookies)
                                             ▼
                              ┌─────────────────────────────┐
                              │           Supabase             │
                              │  Postgres (profiles, groups,    │
                              │  group_memberships) + Auth        │
                              │  Row Level Security enforces       │
                              │  "who can see/change what" at        │
                              │  the database layer, per request      │
                              └─────────────────────────────────────┘
```

**Public pages stay static.** Astro's default `output: "static"` means every page is prerendered to plain HTML at
build time unless it explicitly opts out with `export const prerender = false`. Only the auth/member pages
(`/signin`, `/signup`, `/dashboard`, `/profile`, `/groups`, `/groups/[slug]`, `/auth/callback`, `/signout`,
`/api/session`) do that — everything else (Home, About, Projects, Get Involved, Support, Contact, Request a
Print, Partner) is still zero-JS static HTML, served directly from Cloudflare's asset store without touching the
Worker at all.

**The one deliberate exception to "no client JS on public pages":** the Header needs to show different nav links
depending on whether you're signed in, but it's included on every page — including the static ones, which have no
way to know the visitor's session at build time. Rather than making every page on-demand just for this, the
Header ships both nav states in the static HTML (signed-out visible by default) and a ~15-line inline script
calls `GET /api/session` and swaps to the signed-in state if one exists. This is the only client-side JavaScript
on any public page.

## Tech stack

- **[Astro](https://astro.build)** + **TypeScript** — static-by-default, with on-demand rendering only where
  needed.
- **Tailwind CSS v4** (via `@tailwindcss/vite`) — utility classes, CSS-based design tokens.
- **[Supabase](https://supabase.com)** — Postgres database + authentication. Chosen over Auth.js/Clerk/Firebase
  because it's the only option that gives a real relational database (needed for `group_memberships` with a
  unique constraint and Row Level Security) *and* auth in one vendor, with no password/session cryptography for
  us to implement (see "Authentication" below). The vendor-specific surface area is small and swappable: the
  database is plain Postgres (exportable via `pg_dump` to any Postgres host), and the auth integration is
  entirely contained in `src/lib/supabase.ts` + `src/lib/auth.ts`.
- **`@astrojs/cloudflare`** — the adapter that makes on-demand rendering possible when deployed to Cloudflare
  Pages/Workers.
- **`@tailwindcss/typography`** — styles the free-form Markdown body of a project's detail page.
- **[Vitest](https://vitest.dev)** — unit tests for authorization/group logic and CTA rendering (see "Testing").
- No client-side UI framework anywhere.

## Project structure

```
src/
├── actions/
│   ├── index.ts            # Server-side mutations: signUp, signIn, updateProfile, joinGroup, leaveGroup
│   └── schemas.ts            # Their Zod input schemas (kept separate so tests can inspect them)
├── components/              # Header, Footer, Button, SubmitButton, Section, ProjectCard, ...
├── layouts/
│   └── BaseLayout.astro       # <head> metadata, header, footer
├── lib/
│   ├── supabase.ts              # Per-request Supabase client factory (cookie-based, server-only)
│   ├── auth.ts                    # getAuth() — resolves the current user via getUser() (see "Security")
│   ├── authorization.ts            # resolveProtectedAccess() — the signed-out redirect decision, unit-tested
│   └── groups.ts                     # Group slugs + pure membership logic, unit-tested
├── pages/
│   ├── index.astro, about.astro, ...   # Public, static
│   ├── request-a-print.astro, partner.astro   # Public, static — the print-request and partnership CTAs
│   ├── signin.astro, signup.astro          # Auth, on-demand
│   ├── signout.astro                          # Auth, on-demand (see "Why sign-out is a GET page")
│   ├── auth/callback.astro                      # Email-confirmation landing page
│   ├── dashboard.astro, profile.astro             # Member platform, on-demand, protected
│   ├── groups/index.astro, groups/[slug].astro      # Member platform, on-demand, protected
│   └── api/session.ts                                 # Tiny endpoint the Header's script calls
├── content/projects/         # One Markdown file per project (unchanged from earlier phases)
└── config/site.ts             # Public configuration — see "Site configuration"
supabase/migrations/
└── 20260817000000_init_schema.sql   # profiles, groups, group_memberships, RLS policies, triggers
test/                                  # Vitest — see "Testing"
```

## Local development

1. Create a free [Supabase](https://supabase.com) project.
2. In the Supabase SQL editor, run `supabase/migrations/20260817000000_init_schema.sql` (or use the Supabase CLI:
   `supabase db push`, if you have it installed and linked).
3. Copy `.env.example` to `.env` and fill in your project's URL and publishable/anon key (Project Settings ->
   API). Both are safe to expose to the browser — see the comment in `.env.example`.
4. In Supabase's Auth settings, decide whether email confirmation is required for new sign-ups (it's on by
   default) — either is fine, `src/pages/signup.astro` handles both.

```bash
npm install
npm run dev        # http://localhost:4321
```

## Build & check commands

```bash
npm run check       # astro check — TypeScript + template diagnostics
npm run build        # Type-checks content, builds to ./dist/
npm run test           # vitest run — unit tests (see "Testing")
npm run preview          # Serve the production build locally
```

All four should report zero errors before committing.

## Authentication

**Provider: Supabase Auth**, via the current `@supabase/ssr` package (cookie-based sessions, not the older
`auth-helpers` packages some tutorials still show). Sign up / sign in / sign out use Supabase's own
`signUp`/`signInWithPassword`/`signOut` methods — no password hashing, token generation, or session cryptography
is implemented in this codebase. `src/lib/supabase.ts` is the only place the Supabase client is constructed.

Profile data collected at sign-up is deliberately minimal: **email and display name only** — see "Privacy"
below.

**A critical security detail:** every identity check in this codebase uses `supabase.auth.getUser()`, never
`getSession()`. `getSession()` only decodes the session cookie locally without asking Supabase's Auth server to
confirm it's still valid — trusting it would mean trusting client-writable storage for authorization decisions,
which this project's security model explicitly forbids. `getUser()` re-validates against Supabase on every call.
This is Supabase's own documented guidance, applied consistently in `src/lib/auth.ts`.

**Why sign-out is a GET page, not a POST action:** `src/pages/signout.astro` is linked from the Header, which
renders on every page — including the fully static public ones. A `<form>` posting to an Astro Action requires
the page it's on to be rendered on-demand (Actions run server-side), which would force every page with a Header
into on-demand rendering and destroy the static-site performance this project is built around. A GET-triggered
sign-out is a deliberate, low-severity trade-off: the worst a forged request could do is log the visitor out —
not read or change anything.

## Privacy (children)

Printable Dreams serves children. The account system is for **adults who want to volunteer, offer a 3D printer,
or partner with the org** — not for kids requesting a print. **Requesting a print never requires an account**:
`/request-a-print` is a fully public page with no sign-in gate, pointing at the separate Google Form. Form
responses are not automatically imported into this database.

Profile data is limited to email + display name. This codebase does **not** collect a child's (or anyone's) home
address, school, date of birth, or phone number. If a future feature genuinely needs more than that, it should
get its own deliberate design/review — not be added quietly to `profiles`.

Supabase Auth's own age-related terms: creating an account is subject to Supabase's terms of service, which (like
most identity providers) require the account holder to meet a minimum age — check Supabase's current terms before
directing anyone under that age to sign up. This is exactly why the account system is scoped to adults
(volunteers/printers/partners) and print requests go through the separate, no-account form instead.

## Database

**Postgres, via Supabase.** Schema lives in `supabase/migrations/20260817000000_init_schema.sql` — three tables:

- **`profiles`** — one row per user (`id` = the Supabase Auth user id), `display_name`, and `is_admin` (see
  "Admin architecture"). Created automatically by a trigger on sign-up; never created directly by client code.
- **`groups`** — the fixed set of things a member can request to join (`slug`, `name`, `description`). Seeded
  with the three initial groups (volunteers, printers, partners) by the migration itself.
- **`group_memberships`** — the relational join between users and groups. **Not** a `role` column on `users`.
  `unique (user_id, group_id)` is the real "no duplicate memberships" guarantee, enforced by Postgres itself.

Authentication-provider user IDs (`auth.users.id`, a UUID) are used as the stable identifier everywhere — there's
no separate application-level user id.

## Authorization

Authorization is enforced **twice, independently**, and neither layer trusts the other:

1. **Row Level Security (RLS) in Postgres** — enabled on every table. A user can only `select`/`update` their own
   `profiles` row, only `select` their own `group_memberships`, and can only `insert` a membership request for
   *themselves* with `status='pending'` and `role='member'` (never anything else — see the migration's "request
   to join" policy). This is the real enforcement: it holds even if application code has a bug.
2. **Application code** — every Astro Action in `src/actions/index.ts` derives the user being acted on from
   `supabase.auth.getUser()` (the verified session), never from a client-submitted id. None of the action input
   schemas (`src/actions/schemas.ts`) have a `userId`/`id` field at all — there's no field to smuggle another
   user's id through. This is asserted by a test (`test/authorization.test.ts`) specifically so a future "helpful"
   addition of such a field fails the build immediately.

**Nothing here is trusted from the client**: not a hidden form field, not a query parameter, not `localStorage`.
The only thing a request carries that authorization decisions rely on is the session cookie, and that's verified
server-side via `getUser()` on every request.

### Admin architecture

Three separate concepts, kept genuinely separate (not collapsed into one flag):

- **A user** (`auth.users` / `profiles`)
- **A group membership's `role`** (`member` / `coordinator` / `admin` — scoped to *one group*)
- **A global admin** (`profiles.is_admin` — sitewide, independent of any group)

Being a `coordinator` of Printers does not make you a sitewide admin, and vice versa. No UI currently sets either
`group_memberships.role` beyond the default `member`, or `profiles.is_admin` beyond the default `false` — a
Postgres trigger (`protect_profile_admin_flag`) silently discards any client-submitted change to `is_admin`
regardless of what an RLS policy might otherwise allow. There is deliberately no admin dashboard yet (see
"Group membership workflow"); this schema is what a future one would build on.

## Group membership workflow

1. A signed-in user visits `/groups`, then `/groups/<slug>` for one they're interested in, and submits "Request
   to Join." This inserts a `group_memberships` row with `status: 'pending'`.
2. **There is no approval UI yet.** A pending request just... waits, and the page says so honestly ("Your request
   has been received. Printable Dreams will follow up."). To approve one today: open the Supabase Table Editor
   (or run SQL) and update that row's `status` to `'active'` (or `'rejected'`). This requires direct database
   access — there's no in-app path to do it, by design (see "Admin architecture" above).
3. A user can leave a group at any time (any status), which deletes their membership row.

This is a deliberately minimal starting workflow — no moderation queue, no email notifications, no bulk actions.
A future admin panel could add all of that on top of the existing schema/RLS without a migration.

## Adding a new group

No schema change needed. In the Supabase SQL editor:

```sql
insert into public.groups (slug, name, description)
values ('your-slug', 'Display Name', 'What this group is for.');
```

Then add the slug to `GROUP_SLUGS` in `src/lib/groups.ts` (this is what validates join/leave requests
server-side — a slug not in this list is rejected before it ever reaches the database). That's the entire
change; `/groups`, `/groups/<slug>`, and the dashboard all pick it up automatically.

## Adding future group-specific functionality

The schema is intentionally generic today (a group is just a name + description + membership list). When a group
needs its own behavior later — e.g. Printers having available print jobs, printer capabilities, job claiming,
completed jobs — the natural extension is a **new table that references `groups.id` and/or `group_memberships`**
(e.g. `print_jobs` with a `claimed_by` referencing `auth.users.id`), with its own RLS policies, rather than adding
group-specific columns to the generic tables above. `group_memberships.role` (`coordinator`) is already there for
exactly this: a future policy could grant coordinators extra permissions on that new table without touching
`profiles` or the core membership model.

## Google Form configuration

Three external forms, all following the identical pattern — a `null` URL in `src/config/site.ts` until you
provide the real one, rendered as a disabled "Coming Soon" state by the shared `Button` component until then:

| Constant | Used on | Real link goes to |
|---|---|---|
| `SERVICE_REQUEST_FORM_URL` | `/request-a-print` (`RequestFormButton`) | The kids/parents print-request form |
| `PARTNERSHIP_FORM_URL` | `/partner` (`PartnershipButton`) | The partnership inquiry form |
| `DONATION_URL` | `/support` (`DonateButton`) | Your donation processor |

To go live, edit one line in `src/config/site.ts`:

```ts
export const SERVICE_REQUEST_FORM_URL: string | null = "https://forms.gle/your-real-form";
```

That single edit turns every CTA using it into a real, working external link — nothing else needs to change.
None of these forms are embedded on the site; they always open as external links.

## Site configuration

Everything in the table below lives in **`src/config/site.ts`** — public, non-secret values only. **Authentication
secrets never go here** — they're environment variables (see below), and the Supabase keys used client-side are
the public/publishable ones by design (real data access is enforced by RLS, not by keeping that key secret).

| Constant | What it controls |
|---|---|
| `SITE_TITLE`, `TAGLINE`, `SITE_DESCRIPTION` | Organization name, hero tagline, default meta description |
| `CONTACT_EMAIL` | The `mailto:` address in the header, footer, and Contact page |
| `NAV_LINKS`, `SOCIAL_LINKS` | Site navigation; social row (empty until real profiles exist) |
| `SERVICE_REQUEST_FORM_URL`, `PARTNERSHIP_FORM_URL`, `DONATION_URL` | See "Google Form configuration" |
| `PRODUCTION_URL` | See "Domain configuration" |

## Environment variables

```bash
cp .env.example .env
```

| Variable | Secret? | Where it's used |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | No — safe to expose | `src/lib/supabase.ts` |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No — safe to expose (RLS is the real protection) | `src/lib/supabase.ts` |

`.env` is gitignored. There is currently no Supabase **service role** key anywhere in this project — it bypasses
RLS entirely and must never be added to client-reachable code; if a future admin feature needs it, it belongs
only in a server-only environment variable, used only from a page/action that itself checks `profiles.is_admin`.

## Security

- **Sessions**: managed entirely by Supabase Auth via HTTP-only cookies (`@supabase/ssr`) — this project never
  reads or writes a raw JWT.
- **CSRF**: Astro's `security.checkOrigin` is on by default for on-demand pages and rejects any form-style POST
  (including Actions) whose `Origin` header doesn't match the site's own origin. This project doesn't use a custom
  "composable" server pipeline (the one configuration known to bypass this check) — the default pipeline applies
  it everywhere.
- **Authorization**: enforced twice, independently — see "Authorization" above.
- **Input validation**: every Action validates its input with Zod (`src/actions/schemas.ts`) before touching the
  database.
- **Row Level Security**: enabled on every table, with policies documented in the migration.
- **Fail-closed**: if Supabase is unreachable, `getUser()` returns no user rather than throwing — protected pages
  correctly redirect to `/signin` rather than crash or (worse) render as if signed in. Verified manually against
  an unreachable Supabase URL during development.
- **Secrets**: none are committed; `.env` is gitignored; `.env.example` lists variable names only.

## Cloudflare deployment

```bash
npx astro build
npx wrangler deploy
```

`wrangler.jsonc` configures the Worker (`nodejs_compat` compatibility flag, the `ASSETS` binding for static
files). You'll also need, in the Cloudflare dashboard (or via `wrangler secret put`), the same two environment
variables as local dev (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

Two Cloudflare features get auto-enabled by the adapter and don't need any setup from you: a `SESSION` KV
namespace (Astro's own session API — unused by this project, since Supabase manages sessions independently; Wrangler
auto-provisions it on deploy) and Cloudflare Images processing. Both are harmless if unused.

### Domain configuration

Once a domain is chosen, two edits turn on canonical URLs, absolute Open Graph URLs, and the sitemap:

1. In `src/config/site.ts`, set `PRODUCTION_URL` to the real domain (no trailing slash).
2. In `astro.config.mjs`, add the matching `site` option, then run `npx astro add sitemap`. Finally, add the
   `Sitemap:` line to `public/robots.txt`.

## Adding a project

(Unchanged from earlier phases.) Create a folder under `src/content/projects/`, e.g.
`src/content/projects/my-project/index.md`, with photos alongside it and frontmatter matching the schema in
`src/content.config.ts`. No page template needs editing — see the schema file's comments for the exact fields.
`src/content/projects/_example-project.md` is a reference example (`draft: true`, never appears on the live site).

## Testing

**Vitest**, covering the logic that's actually risky to get wrong — not full end-to-end coverage, since that
would require a live Supabase project and browser automation this environment doesn't have credentials for. What
*is* tested, and honestly represents what it tests:

- `test/authorization.test.ts` — the signed-out-redirect decision (`resolveProtectedAccess`), and that the
  profile/join/leave-group input schemas structurally cannot carry another user's id.
- `test/groups.test.ts` — the fixed group list, slug validation, and the duplicate-membership guard.
- `test/cta-buttons.test.ts` — using Astro's Container API to render real components: a `null` URL renders a
  disabled, non-link CTA; a real URL renders a working external link with `target="_blank" rel="noopener
  noreferrer"`; and the three actual configured buttons (`RequestFormButton`, `DonateButton`, `PartnershipButton`)
  currently render disabled, matching the real site (all three URLs are `null` today).

What this suite does **not** cover: a real HTTP round-trip against a live Supabase project (sign up, sign in,
session persistence, RLS behavior end-to-end). That requires real infrastructure this sandbox doesn't have
credentials for — verify that manually against your own Supabase project before relying on it in production, or
add Playwright + a test Supabase project later if this becomes a maintenance risk.

`npm run check` and `npm run build` remain the primary regression gate for the page-level/routing code (a broken
import, a bad route, or a schema error fails the build loudly).
