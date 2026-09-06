import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * The Supabase client for Server Components, Server Actions and Route
 * Handlers.
 *
 * ── Why a new client per call rather than a module singleton ─────────────
 * It is bound to the current request's cookies. A shared instance would carry
 * one visitor's session into another visitor's request — on a server that
 * handles more than one at a time, that is an account-mixing bug, and it is
 * silent. `cookies()` is request-scoped, so the client has to be too.
 *
 * ── The empty catch ─────────────────────────────────────────────────────
 * Server Components are not allowed to write cookies; only Actions and Route
 * Handlers are. Supabase refreshes an expiring token during a read, which
 * makes it try to write from a place it cannot, and that throw would take
 * down a page whose data had already loaded fine. The middleware refreshes
 * sessions on every request, so the write that fails here has already
 * happened there — swallowing it is safe, and it is what Supabase's own SSR
 * guidance prescribes.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    requireEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* Called from a Server Component — see the note above. */
          }
        },
      },
    },
  );
}

/* Supabase renamed this key: older projects issue an `anon` key, newer ones a
   `publishable` key, and their dashboard now shows the second name. They are
   the same thing in the same slot, so both variable names are accepted rather
   than making the docs and the code disagree.

   Referenced as two literal `process.env.X` reads rather than a lookup by
   string: Next inlines NEXT_PUBLIC_ values into the client bundle at build
   time only when it can see the literal, and a dynamic key would come back
   undefined in the browser. */
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env.local — see ADMIN_SETUP.md.`);
  }

  return value;
}
