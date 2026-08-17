import { describe, it, expect } from "vitest";
import type { User } from "@supabase/supabase-js";
import { resolveProtectedAccess } from "../src/lib/authorization";
import { updateProfileInput, joinGroupInput, leaveGroupInput } from "../src/actions/schemas";

const fakeUser = { id: "11111111-1111-1111-1111-111111111111", email: "kid@example.com" } as User;

describe("resolveProtectedAccess (route guard for dashboard/profile/groups)", () => {
  it("denies a signed-out user and points them at sign-in", () => {
    const result = resolveProtectedAccess(null, "/dashboard");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.redirectTo).toBe("/signin");
    }
  });

  it("allows a signed-in user through", () => {
    const result = resolveProtectedAccess(fakeUser, "/dashboard");
    expect(result).toEqual({ allowed: true });
  });
});

describe("mutation input schemas never accept a target user id", () => {
  // This is the structural guarantee behind "a user cannot modify another
  // user's profile/membership": the action handlers always derive the
  // target user from the verified session, never from client input — which
  // is only true if these schemas have no field that could carry one. If
  // someone later adds a `userId`/`id` field here to "make it more
  // flexible", this test fails immediately.
  const forbiddenKeys = ["id", "userId", "user_id", "profileId", "ownerId"];

  it("updateProfile input has no user-id field", () => {
    const keys = Object.keys(updateProfileInput.shape);
    expect(keys).toEqual(["displayName"]);
    for (const key of forbiddenKeys) {
      expect(keys).not.toContain(key);
    }
  });

  it("joinGroup input has no user-id field and no status/role field", () => {
    const keys = Object.keys(joinGroupInput.shape);
    expect(keys).toEqual(["groupSlug"]);
    for (const key of [...forbiddenKeys, "status", "role"]) {
      expect(keys).not.toContain(key);
    }
  });

  it("leaveGroup input has no user-id field", () => {
    const keys = Object.keys(leaveGroupInput.shape);
    expect(keys).toEqual(["groupSlug"]);
    for (const key of forbiddenKeys) {
      expect(keys).not.toContain(key);
    }
  });
});
