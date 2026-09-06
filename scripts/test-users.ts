import { createClient } from "@supabase/supabase-js";
import { like } from "drizzle-orm";

import { adminProfiles } from "../lib/db/schema";

/**
 * Throwaway accounts used by the check scripts, and how they are reaped.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * Each check creates a real Supabase user, grants it admin, drives the app as
 * that user, and deletes it again. A `finally` block covers a failed
 * assertion — it does not cover the process being killed, and a killed run
 * leaves a confirmed account with admin rights behind.
 *
 * So cleanup runs at the START of every check as well as the end. An
 * interrupted run is tidied by the next one rather than accumulating, and the
 * shop never quietly collects admin accounts nobody created on purpose.
 *
 * Every test account ends in this domain, which is reserved and cannot
 * receive mail. A real address could never match it by accident.
 */
export const TEST_DOMAIN = "@wappicart.test";


export function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Remove every leftover test account. Returns how many were reaped. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function purgeTestUsers(db: any, quiet = false): Promise<number> {
  const supabase = serviceClient();
  let removed = 0;

  /* Profiles first: the row is what grants access, so dropping it closes the
     door even if deleting the auth user then fails. */
  await db.delete(adminProfiles).where(like(adminProfiles.email, `%${TEST_DOMAIN}`));

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    if (data.users.length === 0) break;

    const stale = data.users.filter((u) => u.email?.endsWith(TEST_DOMAIN));
    for (const user of stale) {
      await supabase.auth.admin.deleteUser(user.id);
      removed += 1;
    }

    if (data.users.length < 200) break;
  }

  if (removed > 0 && !quiet) console.log(`  reaped ${removed} leftover test account(s)`);
  return removed;
}

