// Input schemas for src/actions/index.ts, pulled out into their own module
// so they're independently importable by tests (see
// test/authorization.test.ts) without importing "astro:actions" itself,
// which only resolves inside an Astro build/dev context.
import { z } from "astro/zod";
import { GROUP_SLUGS } from "../lib/groups";

export const signUpInput = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  displayName: z.string().trim().min(1, "Display name is required.").max(80),
});

export const signInInput = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required."),
});

// Deliberately just { displayName } — no id/userId field. The row updated
// is always derived server-side from the caller's verified session (see
// actions/index.ts), never from anything the client sends.
export const updateProfileInput = z.object({
  displayName: z.string().trim().min(1, "Display name is required.").max(80),
});

// Deliberately just { groupSlug } — no userId/id field, and no
// status/role. Same reasoning as updateProfileInput.
export const joinGroupInput = z.object({
  groupSlug: z.enum(GROUP_SLUGS),
});

export const leaveGroupInput = z.object({
  groupSlug: z.enum(GROUP_SLUGS),
});
