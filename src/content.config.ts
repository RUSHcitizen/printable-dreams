// Content collection definitions (Astro Content Layer API).
//
// This is the current (Astro 5+) API: collections declare a `loader` and
// live in src/content.config.ts, replacing the older implicit
// src/content/config.ts + `type: 'content'` pattern from pre-5.0 tutorials.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    // Coerced from a plain "YYYY-MM-DD" string in frontmatter into a Date.
    date: z.coerce.date(),
    // The need/problem this project addressed.
    problem: z.string(),
    // How 3D printing specifically helped solve it.
    solution: z.string(),
    // Paths under src/assets/projects/<slug>/ — empty until real photos exist.
    images: z.array(z.string()).default([]),
    // Set true to keep a project out of the published site while it's
    // still being drafted.
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects };
