import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/nav";
import { requireAdmin } from "@/lib/auth";

/**
 * The signed-in shell.
 *
 * ── This is the real gate ────────────────────────────────────────────────
 * `requireAdmin()` verifies the token with Supabase and then looks for a row
 * in `admin_profiles`. Being authenticated is not being an admin — the
 * middleware only established that somebody is signed in, and it runs on the
 * Edge where it cannot reach Postgres to ask the second question.
 *
 * It is not the ONLY gate. A Server Action is its own HTTP endpoint and can
 * be invoked directly by anyone who knows its id, so every mutation re-checks
 * for itself. A layout protects what it renders, never what its children can
 * be asked to do.
 *
 * ── Why this layout is not cached ────────────────────────────────────────
 * `requireAdmin` reads cookies, which opts the whole subtree into dynamic
 * rendering automatically. That is correct and worth stating: no admin page
 * should ever be prerendered and handed to the next visitor.
 */
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="a-shell">
      <AdminNav name={admin.name} email={admin.email} />

      {/* min-w-0 so a wide table scrolls inside its own container instead of
          stretching the grid column and pushing the page sideways. */}
      <main id="admin-main" className="min-w-0 px-5 py-8 md:px-8">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
