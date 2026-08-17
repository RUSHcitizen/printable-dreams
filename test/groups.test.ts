import { describe, it, expect } from "vitest";
import { GROUP_SLUGS, isGroupSlug, canJoinGroup } from "../src/lib/groups";
import { joinGroupInput } from "../src/actions/schemas";

describe("group identity", () => {
  it("has exactly the three initial groups", () => {
    expect(GROUP_SLUGS).toEqual(["volunteers", "printers", "partners"]);
  });

  it("isGroupSlug accepts known slugs and rejects unknown ones", () => {
    expect(isGroupSlug("volunteers")).toBe(true);
    expect(isGroupSlug("printers")).toBe(true);
    expect(isGroupSlug("not-a-real-group")).toBe(false);
  });

  it("joinGroup's schema only accepts a known group slug (server-side enforced)", () => {
    expect(joinGroupInput.safeParse({ groupSlug: "volunteers" }).success).toBe(true);
    expect(joinGroupInput.safeParse({ groupSlug: "not-a-real-group" }).success).toBe(false);
  });
});

describe("canJoinGroup (duplicate-membership guard)", () => {
  it("allows joining a group with no existing membership", () => {
    expect(canJoinGroup([], "group-1")).toBe(true);
  });

  it("prevents joining a group already belonged to", () => {
    const existing = [{ groupId: "group-1" }];
    expect(canJoinGroup(existing, "group-1")).toBe(false);
  });

  it("still allows joining a different group", () => {
    const existing = [{ groupId: "group-1" }];
    expect(canJoinGroup(existing, "group-2")).toBe(true);
  });
});
