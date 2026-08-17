# Printable Dreams

Source code for the Printable Dreams website — a nonprofit that turns kids' drawings into real, 3D-printed
keepsakes.

## Tech stack

- **[Astro](https://astro.build)** + **TypeScript** — static site, zero client-side JavaScript by default.
- **Tailwind CSS v4** (via `@tailwindcss/vite`) — utility classes, CSS-based design tokens (see `src/styles/global.css`).
- **`@tailwindcss/typography`** — the one styling dependency beyond Tailwind itself, used only to style the
  free-form Markdown body of a project's detail page (headings, lists, links) without hand-rolling that CSS.
- No client-side framework, no test framework (see "Why no test framework?" below), no CMS — content is Markdown
  files in Git.

## Project structure

```
src/
├── components/          # Reusable UI — Header, Footer, Button, Section, ProjectCard, PlaceholderBlock, ...
├── layouts/
│   └── BaseLayout.astro   # <head> metadata (SEO/OG/structured data), header, footer
├── pages/                 # File-based routes
│   ├── index.astro, about.astro, get-involved.astro, support.astro, contact.astro
│   └── projects/
│       ├── index.astro       # Gallery listing
│       └── [id].astro         # Project detail page (auto-generated per project)
├── content/
│   └── projects/            # One Markdown file (or folder) per project — see "Adding a project" below
├── content.config.ts       # Typed schema for the "projects" collection
├── config/
│   └── site.ts               # Central config — see "Site configuration" below
├── lib/
│   └── formatDate.ts          # Shared date formatting
└── styles/
    └── global.css               # Tailwind entry, design tokens (`@theme`), a few global rules
```

## Local development

```bash
npm install
npm run dev        # http://localhost:4321
```

## Build & check commands

```bash
npm run build      # Type-checks content, builds to ./dist/
npm run check       # astro check — TypeScript + template diagnostics
npm run preview      # Serve the production build locally
```

Both `npm run check` and `npm run build` should report zero errors before committing. There's no separate lint
command — `astro check` covers type errors and template mistakes (unknown props, invalid HTML nesting, etc.),
which is where most real bugs in an Astro site actually show up.

### Why no test framework?

The site is static: no client-side state, no forms wired to logic yet, no data transformations beyond rendering
Markdown frontmatter. `astro check` (TypeScript across every `.astro` file) and `astro build` (fails loudly on a
broken content schema, a bad route, or bad frontmatter) already catch the realistic failure modes here. Adding
Vitest/Playwright now would mean tests that assert "this heading renders" — busywork, not safety. Revisit this if
the site gains real logic (a working contact form, client-side interactivity, etc.).

## Adding a project

1. Create a folder under `src/content/projects/`, e.g. `src/content/projects/my-project/index.md`.
2. Add any photos into that same folder (e.g. `cover.jpg`, `photo-2.jpg`).
3. Fill in the frontmatter:

   ```md
   ---
   title: "Project Name"
   date: 2026-03-01
   problem: "The need this project addressed, in a sentence or two."
   solution: "How 3D printing specifically helped, in a sentence or two."
   cover: ./cover.jpg
   coverAlt: "Describe what's actually in the photo, for screen readers."
   gallery:
     - src: ./photo-2.jpg
       alt: "Describe this photo too."
   ---

   The longer write-up goes here as Markdown — this is the body of the project's detail page.
   ```

4. Run `npm run build` (or just `npm run dev` to preview).

That's it — no page template needs editing. The project automatically appears on `/projects/`, on the homepage's
"Projects" preview (most recent 3), and gets its own page at `/projects/<folder-name>/`.

Notes:
- `cover`/`coverAlt`/`gallery` are all optional — a project with no photos yet still works, and just shows a
  placeholder image slot instead of a broken image.
- `coverAlt` is **required** if you set `cover` — `npm run build` will fail with a clear error otherwise. This is
  intentional: it's the schema enforcing the site's accessibility requirement that every real image has real alt
  text, not decoration you can skip.
- Set `draft: true` on any project to keep it out of every listing while you're still working on it.
- `src/content/projects/_example-project.md` is a reference example, not a real project — it's marked
  `draft: true` so it never appears on the live site. Delete it once you've added a real project, or leave it;
  it's harmless.

## Site configuration

Nearly everything you'd want to change lives in **`src/config/site.ts`**, so you never have to hunt through
components:

| Constant | What it controls |
|---|---|
| `SITE_TITLE` | Organization name, used in the header, footer, and `<title>` tags |
| `TAGLINE` | Short line used in the Home/About hero |
| `SITE_DESCRIPTION` | Default meta description / Open Graph description |
| `CONTACT_EMAIL` | The `mailto:` address used in the header, footer, and Contact page |
| `NAV_LINKS` | The site navigation (header + footer) |
| `SOCIAL_LINKS` | Empty until real social profiles exist — the footer only renders a social row once this has entries |
| `SERVICE_REQUEST_FORM_URL` | See below |
| `DONATION_URL` | See below |
| `PRODUCTION_URL` | See "Domain configuration" below |

### Adding the request form URL

`SERVICE_REQUEST_FORM_URL` in `src/config/site.ts` is `null`. Every "Request Services" button on the site (header,
homepage, contact page) reads this one value through the shared `RequestFormButton` component — when it's `null`
they render as a disabled "Coming Soon" state instead of a broken or fake link. To go live:

```ts
export const SERVICE_REQUEST_FORM_URL: string | null = "https://forms.gle/your-real-form";
```

That single edit turns every one of those buttons into a real, working link — nothing else needs to change.

### Adding the donation URL

Same pattern, for the Support page's donate button:

```ts
export const DONATION_URL: string | null = "https://your-real-donation-link";
```

## Adding images

- **Project photos** go alongside that project's Markdown file (see "Adding a project" above) and are referenced
  by relative path (`./cover.jpg`). Astro optimizes these automatically at build time (resizing, format
  conversion, no layout shift).
- **Site-wide images** (a real logo, a hero photo not tied to a specific project) belong in `src/assets/`, e.g.
  `src/assets/brand/logo.svg`. There's no such image yet — pages currently show a dashed placeholder box saying
  what image belongs there and its recommended size, instead of stock photography.
- Never place images directly in `public/` unless they genuinely need a fixed, unprocessed URL (favicons,
  `robots.txt`) — anything in `src/assets/` gets Astro's image optimization; anything in `public/` doesn't.

## Deployment

Not yet deployed. Planned target: a static host with Git-based deploys (e.g. Cloudflare Pages) — build command
`npm run build`, output directory `dist`. No environment variables or backend are required for the current site.

### Domain configuration

The production domain isn't chosen yet. Once it is, two edits turn on every domain-dependent feature (canonical
URLs, absolute Open Graph URLs, and the sitemap):

1. In `src/config/site.ts`, set `PRODUCTION_URL` to the real domain (no trailing slash), e.g.
   `"https://printabledreams.org"`.
2. In `astro.config.mjs`, add the matching `site` option, then run `npx astro add sitemap` to generate
   `sitemap.xml` automatically:

   ```js
   export default defineConfig({
     site: "https://printabledreams.org",
     // ...
   });
   ```

   Finally, uncomment/add the `Sitemap:` line in `public/robots.txt` pointing at
   `https://printabledreams.org/sitemap-index.xml`.

No other files need to change.
