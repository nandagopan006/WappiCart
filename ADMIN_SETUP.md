# WappiCart Admin — Setup

Do these once, in order. Roughly ten minutes, most of it waiting for Supabase
to provision the database.

---

## 1. Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a
   new project.
2. **Write down the database password.** It is shown once. It is not any of
   the API keys, and you need it in step 3.
3. Pick the region closest to your shoppers — for an Indian shop that is
   `ap-south-1` (Mumbai).

Provisioning takes a minute or two.

---

## 2. Create the storage bucket

Supabase dashboard → **Storage** → **New bucket**.

| Setting | Value |
|---|---|
| Name | `product-images` |
| Public bucket | **on** |

It must be public. Product photographs are served to every shopper by
`next/image`, and a private bucket would mean signing a URL for every tile on
every page load.

Uploads still go through the admin's server actions, which are
authentication-checked — public means "readable by anyone with the URL", not
"writable by anyone".

---

## 3. Fill in `.env.local`

```bash
cp .env.example .env.local
```

Then fill in four values:

**`DATABASE_URL`** — Project Settings → Database → Connection string → URI.

Use the **connection pooler** string (port `6543`), not the direct one
(`5432`). Replace `[YOUR-PASSWORD]` with the password from step 1. If the
password contains a `#` or a `$`, wrap the whole value in single quotes.

**`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** —
Project Settings → API. The anon key is safe in the browser.

**`SUPABASE_SERVICE_ROLE_KEY`** — same page, the `service_role` key.

> This one bypasses every security policy in the project. It is read only by
> modules that start with `import "server-only"`, so importing it into a
> Client Component fails the build rather than shipping it. Never give it a
> `NEXT_PUBLIC_` prefix. Never commit it.

Also set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` while developing, so
the product links inside WhatsApp messages point at your machine and not at
production.

---

## 4. Create the tables

```bash
npm run db:migrate
```

This applies `drizzle/0000_init.sql`: 11 tables, 23 constraints. It is
idempotent — running it twice is safe.

To inspect what landed:

```bash
npm run db:studio
```

---

## 5. Migrate the catalogue

Validate first. This needs no database and writes nothing:

```bash
npm run db:seed -- --dry-run
```

Expected output:

```
Read 12 products from data/products.json

  12 products valid against the publish contract
  24 images
  56 size rows (= 56 orderable pairs)
  4 featured, 2 new
  4 categories, 9 home page sections
```

If any product fails, the run aborts and names the product and the field.
Nothing is written and nothing is discarded — fix `data/products.json` and
run again.

Then write it:

```bash
npm run db:seed
```

Every write is an upsert keyed on the slug, so re-running produces the same
database rather than a second copy of the catalogue.

**Do not delete `data/products.json`** until you have confirmed the storefront
renders from the database. It is the only backup of the original catalogue.

---

## 6. Create the first admin

Supabase dashboard → **Authentication** → **Users** → **Add user** →
**Create new user**.

- Enter your email and a password
- Turn **Auto Confirm User** on, or you will not be able to sign in

Then grant that user admin rights:

```bash
npm run admin:create -- you@example.com "Your Name"
```

Signing up in Supabase Auth grants nothing on its own. A row in
`admin_profiles` is what makes an authenticated user an admin, which is why an
open auth endpoint can never become an open admin panel.

---

## 7. Run it

```bash
npm run dev
```

- Storefront: <http://localhost:3000>
- Admin: <http://localhost:3000/admin>

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build. Needs a reachable database — the storefront queries it while prerendering |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Write a new migration after editing `lib/db/schema.ts`. Needs no database |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Browse the database |
| `npm run db:seed -- --dry-run` | Validate `products.json` against the publish contract, write nothing |
| `npm run db:seed` | Migrate the catalogue and the seed content |
| `npm run admin:create` | Grant an existing Supabase Auth user admin rights |

---

## Deploying to Vercel

Set all six environment variables in the Vercel project — the same values,
except `NEXT_PUBLIC_SITE_URL`, which becomes the real domain with no trailing
slash.

`SUPABASE_SERVICE_ROLE_KEY` must be added as a plain environment variable, not
one exposed to the browser. Vercel does not expose anything without a
`NEXT_PUBLIC_` prefix, so this is automatic as long as the name is left alone.

---

## Troubleshooting

**`DATABASE_URL is not set`** — `.env.local` does not exist, or the variable is
misspelt. `db:generate` is the one command that runs without it.

**`password authentication failed`** — the password in `DATABASE_URL` is the
*database* password from step 1, not an API key. Reset it under Project
Settings → Database if you did not write it down.

**`prepared statement already exists`** — you are using the direct connection
string (port 5432) instead of the pooler (6543).

**Images fail to load** — the bucket is not public, or
`NEXT_PUBLIC_SUPABASE_URL` is wrong. The storefront only accepts image URLs
from `/public`, `images.unsplash.com`, and that Supabase URL; anything else is
rejected by validation and blocked by `next.config.ts`.

**Signed in but redirected back to login** — the Supabase Auth user has no
`admin_profiles` row. Run `npm run admin:create`.
