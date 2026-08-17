// Group identity and pure membership logic.
//
// GROUP_SLUGS is the single place a group's slug is declared for
// application-level validation — the groups table (Supabase) is the real
// source of truth for name/description, but request bodies are validated
// against this fixed list before ever touching the database. Adding a
// fourth group means: add a row via the groups table (see the migration's
// "Adding a new group" note) and add its slug here.
export const GROUP_SLUGS = ["volunteers", "printers", "partners"] as const;
export type GroupSlug = (typeof GROUP_SLUGS)[number];

export function isGroupSlug(value: string): value is GroupSlug {
  return (GROUP_SLUGS as readonly string[]).includes(value);
}

export interface MembershipRecord {
  groupId: string;
}

// Defense-in-depth, not the real enforcement — the database's `unique
// (user_id, group_id)` constraint plus RLS is what actually prevents a
// duplicate membership even if this check were bypassed or buggy. This
// exists so the action can return a friendly error before hitting the
// database, and so that decision is independently testable.
export function canJoinGroup(existingMemberships: MembershipRecord[], groupId: string): boolean {
  return !existingMemberships.some((membership) => membership.groupId === groupId);
}
