/** List Supabase Auth users and which of them are admins. Emails only. */
import { createClient } from "@supabase/supabase-js";

import { adminProfiles } from "../lib/db/schema";
import { connect } from "./db-connect";

async function main() {
  const { db, close } = connect();
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) throw new Error(error.message);

    const admins = await db.select().from(adminProfiles);
    const adminIds = new Set(admins.map((a) => a.authUserId));

    console.log(`\nSupabase Auth users: ${data.users.length}`);
    for (const u of data.users) {
      const confirmed = u.email_confirmed_at ? "confirmed" : "NOT CONFIRMED";
      const isAdmin = adminIds.has(u.id) ? "admin" : "no admin profile";
      console.log(`  ${u.email}  [${confirmed}] [${isAdmin}]`);
    }
    console.log(`\nadmin_profiles rows: ${admins.length}\n`);
  } finally {
    await close();
  }
}

main().catch((e) => {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
