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
`/api/session`) do that — everything else (Home, About, Projects, Partners, Get Involved, Support, Contact,
Request a Print) is still zero-JS static HTML, served directly from Cloudflare's asset store without touching the
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
- **Visual identity** (Phase 7): design tokens live in `src/styles/global.css`'s `@theme` block — `brand-*`
  (deepened teal, the primary color), `sand-*` (warm off-white for alternating section backgrounds), `accent-*`
  (a restrained warm amber used sparingly), and `--font-display` (Fraunces, a warm serif for headings — body
  copy stays on the system sans stack). Change the org's look by editing values there, not by hunting through
  components.

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
│   ├── request-a-print.astro, partners.astro   # Public, static — the print-request and partnerships pages
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

## Content accuracy

The site's copy is held to one rule across every phase of this project: **only ship what's been explicitly
confirmed.** Concretely, that means never inventing statistics, testimonials, partnership activities/funding,
number of kids served, founding dates, awards, geographic reach, medical diagnoses/claims, or titles for named
individuals beyond what's been given. Where real content doesn't exist yet, `PlaceholderBlock` marks the gap
visibly rather than being filled with something plausible-sounding — see `src/components/PlaceholderBlock.astro`
and, for the current gap, About's "Future Goals" section. `PARTNERS` in `site.ts` is the one place partner facts
live; don't add context/activities to an entry beyond what's explicitly provided.

The founder story (About, Home) is drawn directly from a speech given by Printable Dreams' founder, Atharv
Kumaria — see git history for Phase 8 for the source text. Two distinctions worth preserving when editing that
copy:

- **Outreach vs. partners.** Seattle Children's Hospital and the American Heart Association have been *contacted*
  about potential partnerships — they are not partners, and must never be listed alongside `PARTNERS` or
  described as partnering with Printable Dreams.
- **Personal health information.** The founder has shared that he has a heart condition, to explain why the
  mission is personally meaningful. Don't add diagnosis detail, medical claims, or framing that suggests
  Printable Dreams provides medical treatment — the story is about creativity and emotional resilience, not
  medicine.

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

Three external forms/links, all following the identical pattern in `src/config/site.ts`: a `string` URL renders
the CTA as a real, working external link; `null` renders a disabled "Coming Soon" state instead (via the shared
`Button` component) rather than a fake or broken link.

| Constant | Used on | Status |
|---|---|---|
| `SERVICE_REQUEST_FORM_URL` | `/request-a-print` (`RequestFormButton`) | Live — real Google Form |
| `PARTNERSHIP_FORM_URL` | `/partners` (`PartnershipButton`) | Live — real Google Form |
| `DONATION_URL` | `/support` (`DonateButton`) | `null` — no donation processor chosen yet |

To go live with a donation processor, set `DONATION_URL` the same way the other two are set:

```ts
export const DONATION_URL: string | null = "https://your-processor.example/donate";
```

That single edit turns the Donate CTA into a real, working external link — nothing else needs to change. None of
these forms/links are embedded on the site; they always open as external links.

## Site configuration

Everything in the table below lives in **`src/config/site.ts`** — public, non-secret values only. **Authentication
secrets never go here** — they're environment variables (see below), and the Supabase keys used client-side are
the public/publishable ones by design (real data access is enforced by RLS, not by keeping that key secret).

| Constant | What it controls |
|---|---|
| `SITE_TITLE`, `TAGLINE`, `SITE_DESCRIPTION` | Organization name, hero tagline, default meta description |
| `CONTACT_EMAIL` | The `mailto:` address in the header, footer, and Contact page |
| `FOUNDER_NAME` | The founder's name, used in the About/Home founder story and Organization structured data |
| `NAV_LINKS`, `SOCIAL_LINKS` | Site navigation (6 items — Contact is deliberately not in this list, see Header/Footer comments); social row (empty until real profiles exist) |
| `PARTNERS` | Confirmed partner names/context, rendered by `/partners` and the Home preview via `PartnerMark` — never edit without explicit new facts (see "Content accuracy") |
| `SERVICE_REQUEST_FORM_URL`, `PARTNERSHIP_FORM_URL`, `DONATION_URL` | See "Google Form configuration" |
| `PRODUCTION_URL` | The live production domain — see "Domain configuration" |

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

This project deploys as a **Cloudflare Worker with static assets** (`@astrojs/cloudflare`'s default mode) —
**not** Cloudflare Pages. Cloudflare has been consolidating Pages functionality into Workers, and the adapter
here targets Workers directly, so all dashboard steps (custom domains, variables) happen under **Workers &
Pages → printable-dreams**, using the Worker's **Custom Domains** tab — not the separate Pages product.

```bash
npx astro build
npx wrangler deploy
```

The first time, `npx wrangler login` opens a browser to authorize the CLI against a Cloudflare account — this
has to be run by whoever has (or is setting up) the Cloudflare account for Printable Dreams. `wrangler.jsonc`
configures the Worker itself (`nodejs_compat` compatibility flag, the `ASSETS` binding for static files); no
project needs to be manually created in the dashboard first — `wrangler deploy` creates it.

**Environment variables — important nuance:** `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` are
read via `import.meta.env` (`src/lib/supabase.ts`), which Vite/Astro inlines **at `astro build` time**, not at
Worker runtime. That means:

- If you build locally (as the two commands above do) with a real `.env` present, the values are already baked
  into `dist/` before `wrangler deploy` ever runs — **no dashboard configuration is needed for these two
  variables** in that flow. Setting them as Cloudflare dashboard "Variables and Secrets" would have **no effect**
  on `import.meta.env` reads and shouldn't be relied on here.
- The dashboard/`wrangler secret put` path only matters if a *future* server-only secret is read via
  `context.locals.runtime.env` instead (e.g. a Supabase service-role key, if one is ever added) — not for the
  current two `PUBLIC_` variables.
- If deployment ever moves to Cloudflare's own Git-connected build pipeline (push-to-deploy) instead of running
  `astro build` locally, then `PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_PUBLISHABLE_KEY` **do** need to be set as
  that pipeline's build-time variables, since that's where `astro build` would actually run.

Two Cloudflare features get auto-enabled by the adapter and don't need any setup from you: a `SESSION` KV
namespace (Astro's own session API — unused by this project, since Supabase manages sessions independently; Wrangler
auto-provisions it on deploy) and Cloudflare Images processing. Both are harmless if unused.

### Domain configuration

`PRODUCTION_URL` in `src/config/site.ts` and `site` in `astro.config.mjs` are both set to
`https://printabledreams.org`, `@astrojs/sitemap` is installed and registered (with a `filter` excluding the
signed-in-only routes — dashboard/profile/groups/signout/auth-callback — from the sitemap), and
`public/robots.txt` points at `https://printabledreams.org/sitemap-index.xml`. Together these drive canonical
`<link>` tags, absolute Open Graph URLs, and the generated sitemap. If the domain ever changes, update all three
in the same commit. A redirect from the old development-time route name `/partner` to `/partners` is configured
in `astro.config.mjs` (`redirects`) and ships as a real 301 via the generated `_redirects` file.

**This repo-side configuration is necessary but not sufficient** — pointing the live `printabledreams.org`
domain at this Worker also requires DNS/registrar changes outside this repository. See "Migrating
printabledreams.org from Wix to Cloudflare" below for the exact steps and what to preserve.

## Migrating printabledreams.org from Wix to Cloudflare

The domain currently resolves to the old Wix site. Moving it to this Worker requires changes at the domain's
DNS/registrar level that **cannot be made from this repository** — they have to be performed by whoever
controls the domain (registrar login) and the Cloudflare account.

**Before touching anything:** log into the current DNS provider (wherever the domain's nameservers currently
point — this may be the registrar itself, or Wix DNS if the domain was fully delegated to Wix) and export or
screenshot every existing DNS record. This is the safety net for email and any other service using the domain.
Pay special attention to:

- **MX records** — these route incoming email. Do not delete.
- **TXT records** — SPF (`v=spf1 ...`), DKIM (often named like `selector._domainkey`), DMARC (`_dmarc`), and any
  domain-ownership verification TXT records for other services (Google Workspace/Search Console, Microsoft 365,
  Facebook, etc.). Do not delete.
- **Any other CNAME/A records** for subdomains not related to the website (e.g. `mail.`, `autodiscover.`,
  `autoconfig.`, a blog, etc.). Do not delete.

**What actually needs to change** is only the record(s) that make `printabledreams.org` (and optionally `www`)
resolve to the Wix site — typically an `A`/`ALIAS` record on the root domain and a `CNAME` on `www` pointing at
Wix's servers. Everything else on the domain should be preserved.

### The steps (in order)

1. **Deploy the Worker first**, so there's something real to point the domain at before any DNS changes:
   `npx astro build && npx wrangler deploy`. Confirm it works at the `*.workers.dev` URL Wrangler prints.
2. **Add `printabledreams.org` as a site/zone in the Cloudflare dashboard**, if it isn't already. Cloudflare will
   scan the domain's current DNS records and propose an import — review that list against the export from the
   step above before continuing, and add anything Cloudflare's scan missed.
3. **Change the domain's nameservers at the registrar** to the two nameservers Cloudflare assigns for this zone
   (shown in the dashboard after step 2, under DNS → "Cloudflare nameservers" — e.g. names like
   `xxxx.ns.cloudflare.com`; the exact values are assigned per-zone and can only be read from the Cloudflare
   dashboard once the zone exists, never guessed). **Yes, nameservers need to change** — Workers Custom Domains
   require the zone to be active on Cloudflare, which requires full nameserver delegation, not just a CNAME
   pointed at Cloudflare. This is also exactly why step 2's DNS import matters: once nameservers switch,
   Cloudflare's copy of the DNS records is what the internet sees, including MX/TXT/email records.
4. **After the zone shows "Active" in Cloudflare** (can take anywhere from minutes to ~24 hours for nameserver
   changes to propagate), go to **Workers & Pages → printable-dreams → Settings → Domains & Routes → Custom
   Domains → Add**, and enter `printabledreams.org` (add `www.printabledreams.org` as a second Custom Domain the
   same way, if both should work). Cloudflare creates and manages the necessary DNS record for the Custom Domain
   automatically — this is not a record you create by hand in the DNS tab.
   - This project does **not** use Cloudflare Pages, so there's no separate "add domain to Pages" step, and no
     manual TXT/CNAME domain-ownership verification record is needed for this path — nameserver delegation in
     step 3 is itself the ownership proof Cloudflare requires.
5. **Verify the new site** at `https://printabledreams.org` — check every route (see "Testing"/manual QA list),
   and specifically confirm canonical/Open Graph tags and the sitemap show `printabledreams.org` (they will,
   automatically, since `PRODUCTION_URL`/`site` are already set — see "Domain configuration" above).
6. **Verify email still works** — send and receive a real test email through whatever address(es) use this
   domain, now that Cloudflare is authoritative for DNS. This is the point of preserving the MX/TXT records in
   step 2.
7. **Only after both 5 and 6 are confirmed working**, the Wix site can safely be taken down/cancelled. Keep the
   original nameserver values noted from before step 3 for a few days as a rollback path in case anything
   unexpected comes up — reverting nameservers to Wix's is the fastest way to undo the cutover if needed.

### What Cloudflare will tell you that isn't written here

The exact Cloudflare nameservers, the exact imported DNS record list, and the exact Custom Domain verification
status are all specific to this Cloudflare account and only appear once the zone is actually added in step 2 —
they're not invented or guessed here. Whoever performs step 2 should record those exact values (e.g. by
screenshotting the DNS → Records page before and after) as part of doing the migration.

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
  noreferrer"`; and the three actual configured buttons match the real site as configured today
  (`RequestFormButton`/`PartnershipButton` live, `DonateButton` disabled since `DONATION_URL` is still `null`).

What this suite does **not** cover: a real HTTP round-trip against a live Supabase project (sign up, sign in,
session persistence, RLS behavior end-to-end). That requires real infrastructure this sandbox doesn't have
credentials for — verify that manually against your own Supabase project before relying on it in production, or
add Playwright + a test Supabase project later if this becomes a maintenance risk.

`npm run check` and `npm run build` remain the primary regression gate for the page-level/routing code (a broken
import, a bad route, or a schema error fails the build loudly).
