"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * The Supabase client for the browser.
 *
 * Used by exactly one thing: the admin login form, which needs
 * `signInWithPassword` to run client-side so the session cookies land in the
 * browser that will carry them. Everything else the admin does — every read,
 * every mutation — goes through a Server Action and the server client, where
 * the authorisation check cannot be skipped by editing JavaScript.
 *
 * Only the anon key reaches here. It is designed to be public: it identifies
 * the project and nothing more, and it is the service-role key that must
 * never cross this line. `lib/supabase/admin.ts` holds that one and starts
 * with `import "server-only"` so the boundary is a build error, not a
 * convention.
 *
 * A browser client is safe to construct per call — unlike the server one it
 * reads `document.cookie`, so there is no request to bind it to.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  /* Both names accepted — see the note in lib/supabase/server.ts. Written as
     two literal reads so Next can inline them into the client bundle. */
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local — see ADMIN_SETUP.md.",
    );
  }

  return createBrowserClient(url, anonKey);
}
