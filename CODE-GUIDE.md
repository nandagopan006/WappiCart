# WappiCart — how the code is put together

A map of the project, written for someone who did not build it. Read the first
two sections, then use the rest as a lookup.

---

## The shop in one paragraph

People browse shoes on the website. When they want one, they pick a size and
tap **Order on WhatsApp** — which opens a chat already filled in with the shoe,
the size, the price and the code. There is no cart, no checkout and no
payment page. The shop owner finishes the sale in that chat.

There is also an **admin** at `/admin` where the owner adds products, uploads
photos, and edits the home page and settings.

---

## The two halves

```
app/(storefront)/    the public shop        anyone can see it
app/admin/           the control panel      login required
```

They share a database and nothing else. Different look, different rules,
different folders. The `(storefront)` brackets just group files — they do not
appear in the web address.

---

## Where to find things

```
app/
  (storefront)/        the public pages
    page.tsx             home page
    shop/page.tsx        all products, with filters
    p/[slug]/page.tsx    one product
    about/page.tsx       about page
    wishlist/page.tsx    saved products
  admin/
    login/               sign in
    (protected)/         everything behind the login
      page.tsx             dashboard
      products/            product list and editor
      media/               uploaded photos
      homepage/            arrange the home page
      settings/ seo/ about/ categories/

components/
  <name>.tsx           shop components (product card, header, footer...)
  admin/               admin-only components

lib/
  catalogue.ts         what a product is, categories, sizes, prices
  products.ts          reads products (published only) for the shop
  shop.ts              shop name, phone, delivery info
  whatsapp.ts          builds the order links
  auth.ts              who is allowed into the admin
  db/schema.ts         every database table
  validation/          the rules a product/setting must follow
    limits.ts            every max length and number range, in one place
  repositories/        database reads and writes for the admin
  actions/             the functions admin forms call to save

scripts/               command-line tools (see "Commands" below)
drizzle/               database migration files
```

---

## The rules that must not be broken

These four have each already caused a real bug. They are worth knowing before
you change anything.

**`npm run check:rules` now enforces them.** A comment cannot fail a build —
one of these rules was written down carefully and still broken in five places
months later. The checker reads the source and reports the file, the line, and
what to do instead. It runs in CI on every push, needs no database, and takes
about a second.

### 1. Browser files must not import the database

`lib/products.ts`, `lib/shop.ts`, `lib/db/*` and `lib/auth.ts` all start with
`import "server-only"`. If a file that runs in the browser imports one of
them, **the build fails**.

A file runs in the browser if it starts with `"use client"` — **or if any
client file imports it.** That second half is the trap: `price.tsx` had no
`"use client"` of its own, but a client component imported it, which was
enough to break the build.

**So:** components take their data as props. Only page files read the database.
If a component needs `formatPrice` or `CATEGORIES`, import from
`@/lib/catalogue` (safe everywhere), never from `@/lib/products`.

### 2. Never run database queries in parallel

```ts
// WRONG — the connection gets reset, the page hangs for 5 minutes
const [a, b] = await Promise.all([getThis(), getThat()]);

// RIGHT
const a = await getThis();
const b = await getThat();
```

Supabase's connection pooler cannot handle several queries sent down one
connection at once. It fails as `ECONNRESET`, or in development as a page that
hangs and then loads with nothing in the logs. Each query here takes under
200ms, so running them in order costs almost nothing.

### 3. Drafts must never reach the shop

`lib/products.ts` only ever returns published products — the filter is in the
query, not left to the caller. The admin uses `lib/repositories/products.ts`,
which sees drafts and archived pairs too.

Never mix them up. If the shop imported the admin's version, one forgotten
filter would put an unfinished product on the live site.

### 4. Every save must check the login again

An admin form calls a function in `lib/actions/`. Those functions are web
endpoints — anyone can call one directly without ever loading the page. So
every single one starts with:

```ts
const auth = await requireAdminForAction();
if (!auth.ok) return { ok: false, error: "..." };
```

The check on the page is not enough.

---

## How saving works

Every admin form follows the same six steps:

```
1. check the person is an admin       lib/auth.ts
2. check the data is valid            lib/validation/
3. write to the database              lib/repositories/
4. record what changed                lib/activity.ts
5. clear the cached pages             revalidateTag / revalidatePath
6. return { ok: true } or { ok: false, error: "..." }
```

Step 6 matters: these functions **return** errors, they never throw. The form
shows the message next to the field it belongs to.

---

## Common changes

**Change a colour, font or spacing**
`app/globals.css`. There are five colours and no more. Do not add hex codes to
component files.

**Add a field to a product**
1. `lib/db/schema.ts` — add the column
2. `npm run db:generate && npm run db:migrate`
3. `lib/validation/product.ts` — add the rule
4. `lib/catalogue.ts` — add it to the `Product` type
5. `lib/products.ts` and `lib/repositories/product-write.ts` — read/write it
6. `components/admin/products/product-form.tsx` — add the input

**Change a length limit or a price cap**
`lib/validation/limits.ts`. Every maximum is named there — product name, SKU,
description, price ceiling, and so on. Change the number once and the form,
the server and the tests all follow.

**Change what the home page shows**
Use the admin at `/admin/homepage`. No code change needed.

**Change the shop's phone number or delivery text**
Use the admin at `/admin/settings`. Editing `.env.local` will *not* work — the
database is the source of truth once the shop has been seeded.

**Add a new admin page**
Create `app/admin/(protected)/yourpage/page.tsx`, start it with
`await requireAdmin()`, and add a link in `components/admin/nav.tsx`.
Then **restart the dev server** — new route files are not picked up otherwise.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the site at localhost:3000 |
| `npm run build` | Production build. Needs the database running |
| `npm run typecheck` | Check for TypeScript errors |
| `npm run db:generate` | Write a migration after editing `schema.ts` |
| `npm run db:migrate` | Apply migrations to the database |
| `npm run db:seed -- --dry-run` | Check `products.json` without writing |
| `npm run db:verify` | Confirm the database has what it should |
| `npm run admin:create` | Give a Supabase user admin access |
| `npm run admin:list` | Show who has admin access |
| `npm run check:pages` | Confirm every admin page loads |
| `npm run check:lifecycle` | Test creating, publishing and archiving a product |
| `npm run check:whatsapp` | Test the order link |
| `npm run check:images` | Confirm every product photo actually loads |
| `npm run check:edges` | Try 36 bad inputs (huge prices, emoji, empty fields) |
| `npm run check:speed` | Time every admin page |
| `npm run check:rules` | Check the four rules below are actually followed |

Run `npm run typecheck` and the `check:` commands after any change. They
take about a minute together and have caught every bug in this project so far.

---

## Things that will confuse you once

**A folder starting with `_` is invisible to the router.** `app/admin/_test/`
will 404. Rename it without the underscore.

**New route files need a dev server restart.** Editing an existing page
hot-reloads fine; adding a new one often does not register until you restart.

**Two dev servers corrupt each other.** They both write to `.next/`. If you see
`__webpack_modules__ is not a function`, stop every server, delete `.next`, and
start one.

**A `"use server"` file can only export functions.** Exporting a number or an
array from one is a build error — Next turns every export into a web endpoint.
Put constants somewhere else (see `lib/media-limits.ts`).

**`.env.local` changes need a restart**, and for shop settings they do nothing
at all — those live in the database now.

---

## Before you go live

Four things, in order. Skipping the first one means the shop takes no orders.

1. **Set the real WhatsApp number** at `/admin/settings`. It ships as
   `919000000000`, which reaches nobody. The settings page warns you in red
   until you change it.

2. **Set the Site URL** at `/admin/settings` to your real domain, with no
   trailing slash. It is used for canonical tags, the sitemap, the share
   images and the product link inside every WhatsApp order message. Changing
   `.env.local` is **not** enough — the database is the source of truth.

3. **Set the environment variables on your host** (Vercel or wherever):
   `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_SITE_URL`. The service-role key must **not** have a
   `NEXT_PUBLIC_` prefix — that prefix is what sends a value to the browser.

4. **Replace the photography.** All twelve products currently use Unsplash
   placeholders. Upload real photos from each product's editor; they go to
   Supabase Storage and appear in `/admin/media`.

Then run `npm run build` locally once. It talks to the real database, so it
catches anything the shop cannot render before your visitors do.

---

## If something breaks

1. `npm run typecheck` — catches most mistakes
2. Look at the terminal running `npm run dev` — the real error is there
3. `npm run db:verify` — confirms the database is intact
4. If a page hangs rather than erroring, look for a `Promise.all` around
   database calls (rule 2 above)
