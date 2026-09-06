/**
 * Checks the admin auth gate, end to end.
 *
 *   npm run check:admin
 *
 * The important assertion is the first one: having a Supabase account is NOT
 * having admin access. A signed-in visitor with no row in admin_profiles must
 * be refused. Everything else in the admin rests on that.
 */
import { eq } from "drizzle-orm";

import { adminProfiles } from "../lib/db/schema";
import { createReporter, withTestAdmin } from "./test-session";

async function main() {
  const { check, finish } = createReporter();

  /* Created WITHOUT admin rights, so the refusal can be tested first and the
     grant tested second — with the same session throughout, which is what
     catches a permission being cached when it should not be. */
  await withTestAdmin(
    async ({ get, db, email, authUserId }) => {
      const refused = await get("/admin");
      check(
        "authenticated but no admin_profiles row -> refused",
        refused.status === 307 || refused.status === 302,
        refused.status === 200 ? "was allowed in" : "",
      );

      /* Grant admin, same session. */
      await db.insert(adminProfiles).values({
        authUserId,
        email,
        name: "Check Runner",
        role: "admin",
      });

      const allowed = await get("/admin");
      check(
        "admin_profiles row present -> dashboard rendered",
        allowed.status === 200,
        allowed.status !== 200 ? `status ${allowed.status}` : "",
      );

      if (allowed.status === 200) {
        const page = allowed.body;
        check("dashboard heading", page.includes("Dashboard"));
        check("nav rendered", page.includes("Products") && page.includes("Homepage"));
        check("published count from DB", /Published/.test(page));
        check("no Orders nav item", !page.includes(">Orders<"));
        check("no Revenue anywhere", !/Revenue/i.test(page));
        check("signed-in email shown", page.includes(email));
      }

      const onLogin = await get("/admin/login");
      check(
        "signed-in visitor on /admin/login -> /admin",
        onLogin.status === 307 || onLogin.status === 302,
        onLogin.location ?? String(onLogin.status),
      );

      /* Revoking must take effect immediately — permission is never cached. */
      await db.delete(adminProfiles).where(eq(adminProfiles.authUserId, authUserId));

      const afterRevoke = await get("/admin");
      check(
        "access removed -> refused straight away",
        afterRevoke.status !== 200,
        afterRevoke.status === 200 ? "still allowed in" : "",
      );
    },
    { grantAdmin: false },
  );

  finish("Admin auth");
}

main().catch((error) => {
  console.error("Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
