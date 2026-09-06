import { readFileSync } from "node:fs";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../lib/db/schema";

/**
 * A database connection for command-line scripts.
 *
 * ── Why this is not `lib/db` ─────────────────────────────────────────────
 * `lib/db/index.ts` begins with `import "server-only"`, which is what makes
 * importing it from a Client Component a build error rather than a leaked
 * connection string. That marker package resolves to a module that throws
 * unless the `react-server` export condition is set — true inside Next's
 * server build, false in a plain `tsx` process. So a script importing
 * `lib/db` crashes before it opens a connection.
 *
 * Duplicating six lines of connection setup is the cost of keeping that
 * guard. Removing `server-only` so scripts could share the module would trade
 * a compile-time security boundary for a little tidiness, which is a bad
 * trade. The schema — the part that actually matters to keep in step — is
 * still imported from the one place.
 *
 * A script also wants different connection behaviour: it runs once and must
 * release the socket so the process can exit, rather than serving requests.
 */

/** Scripts run outside Next, so nothing has loaded `.env.local` for them. */
export function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (!match) continue;

        const [, key, rawValue] = match;
        /* A real environment variable always wins over the file, so CI and
           Vercel do not need one. */
        if (process.env[key] !== undefined) continue;

        process.env[key] = rawValue.trim().replace(/^(['"])(.*)\1$/, "$2");
      }
    } catch {
      /* Optional. */
    }
  }
}

export function connect() {
  loadEnv();

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in the Supabase connection string — see ADMIN_SETUP.md.",
    );
  }

  /* Same settings as lib/db, and for the same reasons — see the note there
     about idle_timeout. A script is short-lived, so one connection is right
     here even though the app wants three. */
  const client = postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const db = drizzle(client, { schema });

  /** Call before exiting, or the process hangs on an open socket. */
  const close = async () => {
    await client.end({ timeout: 5 });
  };

  return { db, close };
}
