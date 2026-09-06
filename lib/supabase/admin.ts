import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * The service-role client. Read the warning before using it.
 *
 * This key bypasses every row-level security policy in the project. It exists
 * for two jobs and should not acquire a third:
 *
 *   1. writing and deleting objects in the `product-images` bucket, which the
 *      anon key is not permitted to do
 *   2. `scripts/admin-create.ts`, which looks up an auth user by email in
 *      order to grant them admin rights
 *
 * Every caller must already have established that the request comes from an
 * authenticated admin — `requireAdmin()` in lib/auth.ts. This client is the
 * thing that performs a privileged action, never the thing that decides
 * whether one is allowed.
 *
 * `server-only` on the first line means importing this from a Client
 * Component fails `next build` rather than shipping the key to a browser.
 * There is no session and no cookie handling here on purpose: this client is
 * not acting on behalf of a user, and giving it a session would blur exactly
 * the line that keeps it safe.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. It is required for image uploads — see ADMIN_SETUP.md.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      /* No session to persist and none to refresh: this client is not a user.
         Leaving these on makes it try to write auth state it does not have. */
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** The one bucket. Public for reads, service-role for writes. */
export const PRODUCT_IMAGE_BUCKET = "product-images";
