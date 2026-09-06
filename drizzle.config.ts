import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit reads this for `db:generate`, `db:migrate` and `db:studio`.
 *
 * It runs as a plain Node process outside Next.js, so nothing has loaded
 * `.env.local` for it — hence the small reader below rather than relying on
 * the ambient environment. Only the keys that are missing are filled in, so a
 * real environment variable always wins over the file.
 */

import { readFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;

      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;

      /* Strip one layer of matching quotes — a connection string with a `#`
         in the password has to be quoted in the file, and the quotes are not
         part of the value. */
      process.env[key] = rawValue.trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch {
    /* The file is optional: CI and Vercel set real environment variables. */
  }
}

/* `generate` only reads the schema file and diffs it against the migration
   folder — it never opens a connection. Requiring a live database to write a
   migration would mean nobody can prepare one without production credentials,
   so the check is scoped to the commands that actually connect. */
const needsConnection = !process.argv.includes("generate");
const url = process.env.DATABASE_URL;

if (!url && needsConnection) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in the Supabase connection string — see ADMIN_SETUP.md.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: url ?? "postgresql://generate-only" },
  /* Supabase ships its own `auth`, `storage` and `realtime` schemas into the
     same database. Without this, `db:generate` would treat every one of their
     tables as something this project had deleted and write a migration that
     drops them. */
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
