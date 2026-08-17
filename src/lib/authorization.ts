// Pure authorization-decision logic, kept separate from the Supabase I/O in
// auth.ts specifically so it's unit-testable without a network call (see
// test/authorization.test.ts) and so every protected page makes the same
// decision the same way instead of re-deriving redirect logic inline.
import type { User } from "@supabase/supabase-js";

export type ProtectedAccess = { allowed: true } | { allowed: false; redirectTo: string };

export function resolveProtectedAccess(user: User | null, _currentPath: string): ProtectedAccess {
  // `_currentPath` isn't used in the redirect target today — keeping
  // authentication minimal means skipping a post-login "return to where you
  // were" flow for now. It's kept as a parameter (not deleted) because
  // every call site already has it and will want it if that flow is added
  // later, without changing every call site again.
  if (user) {
    return { allowed: true };
  }
  return { allowed: false, redirectTo: "/signin" };
}
