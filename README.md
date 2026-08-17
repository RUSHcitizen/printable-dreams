# Printable Dreams

Source code for the Printable Dreams website — a nonprofit using 3D printing to help kids.

## Stack

- [Astro](https://astro.build) + TypeScript (static site, minimal shipped JavaScript)
- [Tailwind CSS](https://tailwindcss.com) (v4, via `@tailwindcss/vite`)
- Deployed as a static build (hosting: Cloudflare Pages — see deployment docs once configured)

## Project structure

```
src/
├── components/       # Reusable UI (Header, Footer, RequestFormButton, ...)
├── layouts/           # BaseLayout.astro — shared <head>, header, footer
├── pages/              # File-based routes
├── content/
│   └── projects/       # One Markdown file per project — add here to grow the gallery
├── content.config.ts   # Schema for the "projects" content collection
├── config/
│   └── site.ts          # Central config: contact email, nav links, form URL
└── styles/
    └── global.css        # Tailwind entry + a few global rules (focus states, skip link)
```

## Adding a project

Add a new Markdown file to `src/content/projects/`, e.g. `src/content/projects/my-project.md`:

```md
---
title: "Project Name"
date: 2026-01-01
problem: "What need this addressed."
solution: "How 3D printing specifically helped."
images: []
---

Longer description as Markdown body text.
```

It will automatically appear on `/projects/` and get its own `/projects/<filename>/` page. No other code changes needed.

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start local dev server at `localhost:4321` |
| `npm run build` | Type-check content and build to `./dist/` |
| `npm run preview` | Preview the production build locally |
| `npx astro check` | Type-check the project |

## Configuration you'll actually need to touch

Almost everything content-editors need to change lives in `src/config/site.ts`:

- `CONTACT_EMAIL` — the address used for `mailto:` links site-wide
- `SERVICE_REQUEST_FORM_URL` — set this once the real kids/parents request form exists; until then the site shows a disabled "coming soon" button instead of a fake link
- `NAV_LINKS` — the site navigation
