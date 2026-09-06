/**
 * Grant an existing Supabase Auth user admin rights.
 *
 *   npm run admin:create -- you@example.com "Your Name"
 *
 * ── Why this is a separate, deliberate step ──────────────────────────────
 * Supabase Auth answers "who is this?". A row in `admin_profiles` answers
 * "may they edit the shop?". Nothing creates that row automatically, which is
 * the point: signing up — or an OAuth provider enabled later, or a leaked
 * public sign-up endpoint — grants no access to anything. Somebody with the
 * service-role key has to run this.
 *
 * It does not create the auth user. Do that in the Supabase dashboard, where
 * the password never passes through a terminal or a shell history file.
 */

import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";

import { adminProfiles } from "../lib/db/schema";
import { connect } from "./db-connect";

async function main() {
  const [email, name] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));

  if (!email) {
    console.error('\nUsage: npm run admin:create -- you@example.com "Your Name"\n');
    process.exit(1);
  }

  const { db, close } = connect();

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set — see ADMIN_SETUP.md.",
      );
    }

    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    /* There is no getUserByEmail in the admin API, so the user list is paged
       through. A shop's admin list is a handful of people, and stopping at
       ten pages keeps a misconfigured project from looping forever. */
    let authUser: { id: string; email?: string } | undefined;

    for (let page = 1; page <= 10 && !authUser; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(`Could not list Supabase users: ${error.message}`);
      if (data.users.length === 0) break;

      authUser = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    }

    if (!authUser) {
      console.error(`\nNo Supabase Auth user with the email "${email}".`);
      console.error("Create one first: Supabase dashboard → Authentication → Users → Add user.");
      console.error("Turn on 'Auto Confirm User', or the account cannot sign in.\n");
      process.exit(1);
    }

    const [existing] = await db
      .select()
      .from(adminProfiles)
      .where(eq(adminProfiles.authUserId, authUser.id))
      .limit(1);

    if (existing) {
      /* Re-running with a new name is a rename, not an error — that is the
         only thing this script could usefully do for a user who is already
         an admin. */
      if (name && name !== existing.name) {
        await db
          .update(adminProfiles)
          .set({ name, updatedAt: new Date() })
          .where(eq(adminProfiles.id, existing.id));
        console.log(`\nRenamed "${existing.name}" to "${name}".\n`);
      } else {
        console.log(`\n${email} is already an admin.\n`);
      }
      return;
    }

    await db.insert(adminProfiles).values({
      authUserId: authUser.id,
      email,
      name: name || email.split("@")[0],
      role: "admin",
    });

    console.log(`\n${email} can now sign in at /admin\n`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("\nFailed:", error instanceof Error ? error.message : error, "\n");
  process.exit(1);
});
