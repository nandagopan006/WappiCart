# WappiCart — code review

A senior review of the whole project: what is solid, what is weak, and what
would break first. Written 5 September 2026, against 19,600 lines across
134 files.

Ratings are out of 10 and mean this: **7 is genuinely good for a shop this
size.** A 9 would mean a large team could take this over tomorrow.

---

## Scores

| | Score | One line |
|---|---|---|
| **Security** | **8.5** | Layered properly. The one weak spot is single-instance rate limiting. |
| **Readability** | **8** | Excellent for a reader; the comment density is a maintenance cost. |
| **User experience** | **8** | Careful, honest, accessible. Error recovery was the gap. |
| **Scalability** | **5.5** | Fine to ~100 products. Two designs break hard after that. |
| **Code quantity** | **6.5** | ~30% more code than the feature set needs. |
| **Testing** | **7.5** | 223 real assertions, no unit tests, no CI. |
| **Overall** | **7.5** | A well-built small shop, honestly documented, with known limits. |

---

## Security — 8.5 / 10

**What is right**

Authorisation is layered, and each layer is doing a different job:

```
middleware        is there a session cookie?     (cheap, no network)
requireAdmin()    verified token + admin row     (the real check)
each save action  checks again, independently    (actions are HTTP endpoints)
```

That last line matters more than it looks. A Server Action is its own
endpoint — anyone who knows its id can call it without ever loading the page.
Every one of the 15 mutations starts with `requireAdminForAction()`. I checked
all of them.

Verified rather than assumed:

- A forged cookie with a far-future expiry gets past the middleware and is
  **refused** by `requireAdmin`. Three attempts in a row, all refused — a
  failed verification is never cached.
- `?c=<script>alert(1)</script>` renders no script tag.
- `/p/../../etc/passwd` returns 404.
- Upload filename `../../etc/pa ss\0wd.php.png` is discarded entirely; the
  stored path is built from the product slug plus random bytes.
- No database driver, connection string or secret appears in any browser
  bundle. 14 modules carry `import "server-only"`, which makes that a build
  error rather than a code-review question.
- Deleting a category is guarded four ways — not found, in use, last shelf,
  and a database-level `restrict`.

**What is weak**

1. **No rate limiting on sign-in.** An attacker can try passwords as fast as
   the network allows. Supabase applies some limiting of its own, but the app
   adds none. For a single-admin shop the practical risk is low; it is still
   the most obvious thing missing.

2. **The identity cache is per server instance.** Revoking someone's admin row
   takes effect immediately (permission is never cached), but a *token*
   verification is remembered for 60 seconds per instance. That is the right
   trade — it was made deliberately after the alternative broke granting — but
   it is a trade.

3. **`data/products.json` is still in the repository.** Harmless (it holds no
   secrets and nothing imports it any more) but it is a stale copy of the
   catalogue that will drift and confuse.

**Not a finding, but worth stating:** the storefront takes no user input at
all — no cart, no forms, no accounts. Most of the attack surface a shop
usually has does not exist here.

---

## Readability — 8 / 10

**What is right**

Comments explain *why*, not *what*. This is the difference between a codebase
you can maintain and one you can only rewrite:

```ts
/* Sequential, not Promise.all. Supabase's transaction pooler resets a
   connection asked to pipeline concurrent queries. In development that
   surfaced as a page that took five minutes and then rendered. */
```

Someone reading that will not "optimise" it back into a bug. There are perhaps
thirty comments of that quality, each attached to a decision that cost real
debugging time.

`CODE-GUIDE.md` is the strongest single artefact here — it names the four
rules that must not be broken, each with the wrong code and the right code
side by side.

Naming is consistent and honest. `publishedProducts()` cannot return a draft.
`getAboutForEditing()` is uncached where `getAbout()` is cached, and the names
say so.

**What is weak**

1. **22% of the codebase is comments** — around 3,500 lines. Some files still
   open with fifteen lines of prose before the first import. Every one of those
   is a line that can go stale, and stale comments are worse than none.

2. **Two files are too large.** `components/catalog.tsx` (610 lines) and
   `lib/db/schema.ts` (396) both do several jobs. Catalog holds filtering,
   sorting, pagination and four sub-components.

3. **Test scripts duplicate their setup.** Five `check-*.ts` files each repeat
   ~30 lines of create-user, sign-in, build-cookie. That is roughly 150 lines
   that should be one shared helper.

---

## User experience — 8 / 10

**What is right**

The product decisions are unusually honest, and the code holds the line:

- The dashboard shows **no revenue, no orders, no conversion rate** — because
  the shop has no datastore for any of them. Inventing those numbers is the
  normal thing to do and it teaches an owner to distrust the real ones.
- Every error message names the field and says what to do:
  *"Another product already uses that SKU. It goes into the WhatsApp message,
  so it must be unique."*
- Destructive actions get a real dialog, never `confirm()`. Focus lands on
  Cancel, Escape closes, focus returns. Cancel is the filled button; Archive
  is the plain one.
- Products are archived, never deleted, because the URL may be in someone's
  WhatsApp chat.
- The Shop Settings page warns in red while the WhatsApp number is still the
  placeholder — the one setting that silently loses every order.

Accessibility is real rather than decorative: 31 `aria-label`/`sr-only` uses,
`role="alert"` on 11 error regions, focus rings throughout, every `<Image>`
has alt text, and blank table columns announce themselves to screen readers.

**What is weak**

1. **No undo.** Archive is reversible; a save over good copy is not. There is
   no draft history and no "restore previous version".
2. **No bulk actions.** Publishing twenty products means twenty clicks.
3. **No image cropping.** Uploads are used as-is, so an off-centre photograph
   stays off-centre.
4. **Admin is not usable on a phone in practice.** It is responsive and does
   not break, but editing a product on a 390px screen is unpleasant.

---

## Scalability — 5.5 / 10

This is the weakest dimension, and the number is honest rather than harsh.

**Two designs break at a predictable point:**

1. **The whole catalogue is loaded on every storefront page.**
   `publishedProducts()` reads every published product, then the page filters
   in memory. At 12 products that is faster than several queries. At 500 it is
   several megabytes per render.

2. **`/shop` sends every product to the browser.** Filtering, sorting and
   "load more" are all client-side over an array the page already holds. At 12
   products this is instant and needs no server. At 500 it is a multi-megabyte
   page on a phone.

**Where the ceiling is:** comfortable to ~100 products, uncomfortable at ~250,
broken by ~500.

**The good news** is that the seams are already marked. `lib/products.ts` has
one function, `loadCatalogue`, that everything else derives from; and
`Catalog`'s `shown` counter is documented as the place a cursor would go. Both
say so in comments. This is a known limit, not an accident.

**Other limits**

- The admin table paginates properly (20 a page, server-side) — this one
  scales.
- The activity log grows forever with no pruning. Fine for years at this
  volume, but nothing deletes old rows.
- One admin role, no permissions model. Adding a "can edit products but not
  settings" role means a schema change.
- Every database round trip costs ~70ms from here to Mumbai. Pages are tuned
  to make few of them, but that is the floor.

---

## Code quantity — 6.5 / 10

**19,612 lines** for a 12-product shop with an admin panel. Roughly 30% more
than the feature set needs.

| Area | Lines | Verdict |
|---|---|---|
| lib (data + logic) | 5,294 | Reasonable |
| storefront components | 4,869 | Heavy — the motion work is elaborate |
| admin components | 3,732 | Reasonable |
| admin pages | 2,442 | Reasonable |
| scripts/tests | 1,898 | Duplicated setup |
| storefront pages | 879 | Good |

Where the excess is:

- **~3,500 lines of comments.** Valuable, but a real maintenance surface.
- **Test setup duplicated five times** — ~150 lines.
- **Two probe routes** (`lifecycle-probe`, `edge-probe`) ship in the codebase.
  Both are disabled in production and both earn their place as integration
  tests, but they are unusual and a new developer will not expect them.
- The storefront's motion system (GSAP + Motion + Lenis, ~1,500 lines) is
  substantial for a shop this size. That is a deliberate design choice, not a
  defect.

---

## Testing — 7.5 / 10

**223 assertions, all passing**, and they test the real thing: actual HTTP
requests against a running server, hitting the real database, driving the real
Server Actions.

```
check:admin       9    the auth gate
check:pages      68    every admin screen renders with real data
check:lifecycle 102    create → publish → archive → restore, categories, homepage
check:edges      36    bad input: huge prices, emoji, empty fields
check:whatsapp    8    the order link
check:images      -    every photo loads, every alt text long enough
```

These have caught **every bug in this project**, including four that I
introduced myself while fixing other things.

**What is missing**

1. **No unit tests.** Every test needs a server and a database. There is no
   way to test a validation rule in isolation, in milliseconds.
2. **No CI.** Nothing runs on push. The tests only run when someone remembers.
3. **Tests mutate the real database.** They clean up after themselves and purge
   leftovers on the way in, but there is no separate test database.
4. **No browser testing.** Click behaviour, focus traps and the mobile drawer
   are verified by reading code, not by driving a browser.

---

## Fixed during this review

1. **SQL built by string concatenation.** `sql.raw` with interpolated ids in
   `listProducts`. Not exploitable today — they are database UUIDs — but it is
   the pattern that becomes an injection later. Now parameterised.

2. **`/shop` served an empty page to search engines.** The shelf rendered only
   after JavaScript ran, so the server HTML had zero products. It also broke
   the design system's own "works with JavaScript disabled" rule. Now rendered
   server-side, filter and all.

3. **Five places used `Promise.all` for database calls** — the exact pattern
   documented as forbidden, including two inside `lib/products.ts` and
   `lib/shop.ts` firing genuinely different queries in parallel. All now
   sequential. A codebase that breaks its own documented rule is worse than one
   with no rule.

4. **No error boundaries.** A database blip showed Next's bare "Application
   error" page. Both the storefront and the admin now have real ones that
   explain what happened and offer a way forward, without leaking the error.

5. **Two React key bugs** — duplicate keys on blank table columns, and index
   keys on the reorderable photo list (moving a photo attached the alt text to
   the wrong picture).

6. **Unbounded text fields everywhere.** A pasted document would reach the
   database. Every field now has a named limit in `lib/validation/limits.ts`.

---

## What I would do next, in order

1. **Rate-limit the sign-in form.** The clearest security gap.
2. **Add CI** — `typecheck` plus the check suite on every push. The tests
   already exist; nothing runs them automatically.
3. **Extract the test setup helper.** ~150 duplicated lines, one afternoon.
4. **Delete `data/products.json`.** The migration is verified; it is now a
   stale copy waiting to mislead someone.
5. **Split `components/catalog.tsx`.** 610 lines doing four jobs.
6. **Move `/shop` filtering to the server** — only when the catalogue passes
   ~100 products. Not before; it would be work with no benefit today.

---

## The honest summary

This is a **well-built small shop**, not a platform. It is secure where it
matters, unusually honest in what it shows an owner, and carefully documented
in the places that cost real debugging time.

Its ceiling is real and known: around 100 products before the storefront's
load-everything design starts to hurt. That is a deliberate trade — twelve
products loaded at once genuinely is faster than nine queries — and the code
marks exactly where to change it.

The strongest thing about the project is that its constraints are written
down. The riskiest thing is that a lot of correctness lives in comments rather
than in tests: the "no parallel queries" rule was documented, and still broken
in five places, until this review.
