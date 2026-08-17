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
  // The schema function receives `image`, which validates a relative image
  // path and hands back metadata astro:assets can optimize (resize,
  // convert format, prevent layout shift) — see README "Adding a project".
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        // Coerced from a plain "YYYY-MM-DD" string in frontmatter into a Date.
        date: z.coerce.date(),
        // The need/problem this project addressed.
        problem: z.string(),
        // How 3D printing specifically helped solve it.
        solution: z.string(),
        // Optional cover photo, relative to this project's Markdown file
        // (e.g. "./cover.jpg"). coverAlt is required whenever cover is set.
        cover: image().optional(),
        coverAlt: z.string().optional(),
        // Optional extra photos, each with its own required alt text.
        gallery: z
          .array(
            z.object({
              src: image(),
              alt: z.string(),
            }),
          )
          .default([]),
        // Set true to keep a project out of the published site while it's
        // still being drafted (or, for the bundled example file, always).
        draft: z.boolean().default(false),
      })
      .refine((data) => !data.cover || Boolean(data.coverAlt?.trim()), {
        message: "coverAlt is required whenever cover is set (for accessible alt text).",
        path: ["coverAlt"],
      }),
});

export const collections = { projects };
