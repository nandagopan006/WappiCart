import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * The database connection.
 *
 * `import "server-only"` on line 1 means importing this from a browser
 * component is a BUILD ERROR rather than a leaked password. Every file that
 * touches the database or a secret starts that way.
 *
 * The connection is stored on globalThis during development because Next
 * reloads files on every edit, and without it each reload would open another
 * connection until the database refused new ones.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in the Supabase connection string — see ADMIN_SETUP.md.",
  );
}

/* Supabase's pooler speaks the Postgres wire protocol but cannot prepare
   statements across pooled connections, so prepared statements have to be off.
   Leaving them on is the classic "works locally, fails on Vercel" failure. */
const client =
  globalThis.__wappicartSql ??
  postgres(connectionString, {
    prepare: false,

    /* Small, but not one. The dashboard issues several reads at once, and a
       single connection serialises them behind each other for no gain — the
       pooler is designed to hand out short-lived connections. Three is enough
       for the widest page here and nowhere near the instance's limit even
       with several serverless instances alive at once. */
    max: 3,

    /* The two settings whose absence cost an afternoon.

       Supabase's pooler closes a connection it considers idle. Without
       `idle_timeout`, postgres.js keeps that socket in the pool and hands it
       to the next query, which then waits on a peer that is never going to
       answer. It presents as a page that hangs for five minutes rather than
       an error: the first query after a quiet period succeeds, and every one
       after it stalls.

       Closing our side first means the pool only ever holds sockets we know
       are live. `connect_timeout` is the matching guarantee at the other end
       — a database that cannot be reached should fail in ten seconds with a
       message, not hang until something upstream gives up. */
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__wappicartSql = client;
}

export const db = drizzle(client, { schema });

export { schema };
export type Database = typeof db;

declare global {
  // eslint-disable-next-line no-var
  var __wappicartSql: ReturnType<typeof postgres> | undefined;
}
