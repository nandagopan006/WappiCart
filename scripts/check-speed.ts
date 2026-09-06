import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { adminProfiles } from "../lib/db/schema";
import { connect } from "./db-connect";
import { purgeTestUsers } from "./test-users";

const BASE = process.env.CHECK_BASE_URL ?? "http://localhost:3000";
const EMAIL = `speed-${Date.now()}@wappicart.test`;
const PASSWORD = `Pw-${Date.now()}-x`;
const PATHS = ["/admin", "/admin/products", "/admin/categories", "/admin/media",
               "/admin/homepage", "/admin/settings", "/admin/activity", "/admin/account"];

async function main() {
  const { db, close } = connect();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await purgeTestUsers(db, true);
  const created = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true });
  if (created.error) throw new Error(created.error.message);
  const userId = created.data.user.id;
  await db.insert(adminProfiles).values({ authUserId: userId, email: EMAIL, name: "Speed", role: "admin" });

  try {
    const anonClient = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data, error } = await anonClient.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    if (error) throw new Error(error.message);
    const ref = new URL(url).hostname.split(".")[0];
    const cookie = `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(data.session)).toString("base64")}`;

    const hit = async (p: string) => {
      const t = Date.now();
      const r = await fetch(`${BASE}${p}`, { headers: { cookie }, redirect: "manual" });
      await r.text();
      return Date.now() - t;
    };

    console.log(`\n  ${BASE}\n`);
    console.log("  path                     best of 3");
    for (const p of PATHS) {
      await hit(p);
      const times = [await hit(p), await hit(p), await hit(p)];
      console.log(`  ${p.padEnd(22)} ${String(Math.min(...times)).padStart(6)}ms`);
    }
    console.log();
  } finally {
    await db.delete(adminProfiles).where(eq(adminProfiles.authUserId, userId));
    await admin.auth.admin.deleteUser(userId);
    await close();
  }
}
main().catch((e) => { console.error("Failed:", (e as Error).message); process.exit(1); });
