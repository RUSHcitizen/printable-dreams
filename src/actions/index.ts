// Server-side mutations for the member platform.
//
// Security invariant that applies to every action below: none of them
// accept a user id / target-user field from client input. The user being
// acted on is always the caller's own verified session (from
// supabase.auth.getUser()), never a value read out of form data. That's
// what makes "a user can't modify another user's profile/membership"
// structurally true rather than something to remember to check — schemas
// live in ./schemas.ts specifically so test/authorization.test.ts can
// assert they contain no such field, independent of this file.
//
// Sign-out has no action here — it's a plain page (src/pages/signout.astro)
// so it can be linked from the fully static public Header without forcing
// every page that includes Header to become on-demand-rendered. See README
// "Architecture" for why.
import { defineAction, ActionError } from "astro:actions";
import { createClient } from "../lib/supabase";
import { signUpInput, signInInput, updateProfileInput, joinGroupInput, leaveGroupInput } from "./schemas";

export const server = {
  signUp: defineAction({
    accept: "form",
    input: signUpInput,
    handler: async (input, context) => {
      const supabase = createClient({ request: context.request, cookies: context.cookies });
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          // Read by the handle_new_user() Postgres trigger to seed
          // profiles.display_name — see the migration.
          data: { display_name: input.displayName },
          emailRedirectTo: new URL("/auth/callback", context.url).toString(),
        },
      });
      if (error) {
        throw new ActionError({ code: "BAD_REQUEST", message: error.message });
      }
      // If email confirmation is required, Supabase returns no session yet.
      return { confirmEmail: !data.session };
    },
  }),

  signIn: defineAction({
    accept: "form",
    input: signInInput,
    handler: async (input, context) => {
      const supabase = createClient({ request: context.request, cookies: context.cookies });
      const { error } = await supabase.auth.signInWithPassword(input);
      if (error) {
        throw new ActionError({ code: "UNAUTHORIZED", message: "Incorrect email or password." });
      }
      return { success: true };
    },
  }),

  updateProfile: defineAction({
    accept: "form",
    input: updateProfileInput,
    handler: async (input, context) => {
      const supabase = createClient({ request: context.request, cookies: context.cookies });
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new ActionError({ code: "UNAUTHORIZED", message: "You must be signed in." });
      }
      // .eq("id", userData.user.id) targets only the caller's own row — the
      // id comes from the verified session, never from `input`. RLS
      // enforces the same restriction independently at the database layer.
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: input.displayName })
        .eq("id", userData.user.id);
      if (error) {
        throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: "Could not update profile." });
      }
      return { success: true };
    },
  }),

  joinGroup: defineAction({
    accept: "form",
    input: joinGroupInput,
    handler: async (input, context) => {
      const supabase = createClient({ request: context.request, cookies: context.cookies });
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new ActionError({ code: "UNAUTHORIZED", message: "You must be signed in to join a group." });
      }

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("id")
        .eq("slug", input.groupSlug)
        .single();
      if (groupError || !group) {
        throw new ActionError({ code: "NOT_FOUND", message: "That group doesn't exist." });
      }

      // status/role are never taken from input — they're set here, and the
      // "request to join" RLS policy independently rejects any insert that
      // doesn't have status='pending', role='member'.
      const { error } = await supabase.from("group_memberships").insert({
        user_id: userData.user.id,
        group_id: group.id,
      });
      if (error) {
        if (error.code === "23505") {
          throw new ActionError({ code: "CONFLICT", message: "You've already requested to join this group." });
        }
        throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: "Could not join group." });
      }
      return { success: true };
    },
  }),

  leaveGroup: defineAction({
    accept: "form",
    input: leaveGroupInput,
    handler: async (input, context) => {
      const supabase = createClient({ request: context.request, cookies: context.cookies });
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new ActionError({ code: "UNAUTHORIZED", message: "You must be signed in." });
      }

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("id")
        .eq("slug", input.groupSlug)
        .single();
      if (groupError || !group) {
        throw new ActionError({ code: "NOT_FOUND", message: "That group doesn't exist." });
      }

      const { error } = await supabase
        .from("group_memberships")
        .delete()
        .eq("user_id", userData.user.id)
        .eq("group_id", group.id);
      if (error) {
        throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: "Could not leave group." });
      }
      return { success: true };
    },
  }),
};
