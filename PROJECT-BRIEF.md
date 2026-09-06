# WappiCart — Project Brief for Admin Panel Planning

A complete description of the existing storefront: what it is, how it is built,
what is editable today, and what an admin panel would actually have to change.
Written to be handed to a planner with no access to the repo.

---

## 1. What the product is

A single-brand shoe shop for the Indian market. The website is a **catalogue
only** — it browses, it does not transact. Every purchase happens by the
shopper tapping "Order on WhatsApp", which opens a pre-filled chat containing
the product name, size, price, SKU and product URL. The shop owner completes
the sale in that conversation.

There is **no cart, no checkout, no payment gateway, no user accounts, no
login, and no `<form>` element anywhere on the site**. This is a deliberate
product decision, not a missing feature. Currency is INR, sizes are 6–11,
delivery is Kerala-focused (Kochi, Thrissur, Kozhikode) with rest-of-India
shipping.

Brand voice is plain and anti-marketing: "46 pairs in stock", not "Wide
Selection Available". The site says what a shoe is bad at in order to be
believed about what it is good at.

---

## 2. Tech stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router | ^15.5.4 |
| React | React (Server Components by default) | ^19.1.1 |
| Language | TypeScript, strict | ^5.9.3 |
| Styling | Tailwind CSS v4, CSS-first `@theme` | ^4.1.14 |
| Animation | GSAP + ScrollTrigger | ^3.15.0 |
| Animation | Motion (framer-motion successor) | ^13.1.0 |
| Smooth scroll | Lenis (one instance, root layout) | ^1.3.26 |
| Font | Jost, variable 100–900, via `next/font` | latin subset |
| Hosting | Vercel (implied by the default site URL) | — |

Scripts: `dev`, `build`, `start`, `typecheck`. **There is no test suite, no
ESLint config, and no CI.** `npx tsc --noEmit` is the only automated check.

Deliberate non-dependencies, documented as rules: no UI kit, no carousel
library, no state manager (Redux/Zustand), no analytics SDK, no fifth animation
library, nothing over 15kb for one feature.

---

## 3. Architecture and rendering model — the most important section

**The site is fully static and file-based. There is no database, no API layer,
no server-side mutation, and no runtime data source.**

```
data/products.json   <- the entire catalogue, 12 products, hand-edited
        |  imported at module load
lib/products.ts      <- validates, derives, exports typed helpers
        |  imported by Server Components
app/**/page.tsx      <- prerendered to static HTML at build time
```

Consequences that dictate how an admin panel must be designed:

1. **`lib/products.ts` runs `validate()` at module load time.** A malformed
   product throws during `next build` — a bad product breaks the *build*, it
   never reaches a request. Safe today; it means an admin panel must duplicate
   that validation at write time, or one bad save takes the whole site down on
   the next deploy.
2. **`generateStaticParams()` prerenders one page per product slug.** Adding a
   product requires a rebuild, or on-demand revalidation, before its page
   exists.
3. **`app/sitemap.ts` is generated from `products`** — same rebuild dependency.
4. **The whole catalogue ships in the page payload.** `/shop` sends all 12
   products to the browser and filters, sorts and paginates client-side with no
   network round trip. The code documents the seam for when this stops scaling
   (`shown` becomes a cursor and `Catalog` fetches). Somewhere around 50–100
   products this must become server-side.
5. **Images are remote URLs, currently Unsplash placeholders.**
   `next.config.ts` `remotePatterns` allows exactly two shapes:
   `https://images.unsplash.com/photo-**`, or a local path under `/public`.
   Anything else is rejected by the validator *and* blocked by next/image.
   **Admin image upload requires a blob store and a new remotePattern.**
6. **Server Components are the default.** `"use client"` appears only in the
   catalogue filters, size run, order button, product sheet, wishlist
   components, confirm dialog, recommendation rail, brand intro, and the motion
   presets. `ProductCard` is deliberately a Server Component — its hover image
   swap is pure CSS, so a grid of twelve ships zero JS for the effect.

---

## 4. Data model

### `data/products.json` — an array of product objects

| Field | Type | Required | Validation enforced in `lib/products.ts` |
|---|---|---|---|
| `slug` | string | yes | `^[a-z0-9-]+$`, globally unique. Becomes `/p/<slug>` |
| `name` | string | yes | — |
| `category` | enum | yes | one of `sneakers`, `formals`, `loafers`, `sandals` |
| `price` | number | yes | positive whole number of rupees, no decimals |
| `mrp` | number | no | must be strictly greater than `price`; renders struck through |
| `images` | string[] | yes | **2 to 4 entries**. `images[0]` is the canonical side profile. Each must be a `/public` path or an `images.unsplash.com` photo URL |
| `image` | string | derived | never written to JSON — computed as `images[0]` so the two cannot drift |
| `alt` | string | yes | **minimum 20 characters**, must describe the shoe |
| `sizes` | number[] | yes | non-empty; every value must be in `SIZE_RUN` = `[6,7,8,9,10,11]` |
| `colour` | string | yes | one or two words, e.g. "Off-white", "Oxblood" |
| `material` | string | yes | e.g. "Full-grain leather upper, rubber cup sole" |
| `fitNote` | string | no | e.g. "Runs half a size small" |
| `description` | string | yes | two or three short sentences |
| `care` | string | yes | one or two plain sentences |
| `sku` | string | yes | globally unique — it goes into the WhatsApp message |
| `featured` | boolean | no | surfaces on the home page. Documented cap: keep to three |
| `isNew` | boolean | no | renders a small "new" label; drives the "New in" section and the "new in" sort |

There are **no timestamps, no stock quantities, no variants, no cost price, no
supplier, and no order records**. "In stock" is expressed purely as membership
in the `sizes` array. `pairsInStock()` sums `sizes.length` across all products.

### Helpers exported by `lib/products.ts`

`products`, `featuredProducts()`, `newProducts(limit=4)`, `countByCategory()`,
`previewByCategory(limit=3)`, `relatedProducts(product, limit=3)`,
`getProduct(slug)`, `pairsInStock()`, `sizesInStock()`, `categoriesInStock()`,
`inPriceBand(product, bandId)`, `formatPrice(rupees)` (en-IN, with the rupee
sign), `formatPriceForImage(rupees)` (spells "Rs" — the OG renderer has no
rupee glyph and would draw an empty box).

Constants: `CATEGORIES`, `SIZE_RUN`, `PRICE_BANDS` (`under-2000`, `2000-3500`,
`over-3500` — boundaries chosen to sit in the gaps of the current shelf so no
band is a sliver).

### `lib/shop.ts` — everything about the shop that is not a product

`name`, `tagline`, `phone` (env), `instagram`, `instagramHandle`,
`deliveryAreas`, `returnWindow`, `replyTime`, `url` (env).

A hardcoded `as const` object. Every field is a plausible admin-editable
setting.

### Environment variables

- `NEXT_PUBLIC_WHATSAPP_PHONE` — country code plus digits only, no plus sign,
  spaces or dashes; wa.me rejects anything else
- `NEXT_PUBLIC_SITE_URL` — canonical URLs, sitemap, OG tags
- `BUILD_DIR` — optional; redirects build output so a production build taken
  while `next dev` is running does not corrupt `.next`

---

## 5. Routes

| Route | Rendering | What it is |
|---|---|---|
| `/` | static | Eight numbered sections: full-bleed hero banner, New in (4), sneakers category story, inverted product story, loafers category story, collection spread (3), category tiles, brand statement, order block |
| `/shop` | static, `Suspense` around the `?c=` reader | The whole shelf. Category / size / price-band filters, four sorts, load-more 6 at a time |
| `/p/[slug]` | `generateStaticParams` per product | Stacked photographs left, sticky decision column right (size picker then order button), related pairs below |
| `/about` | static | Trust page: portrait, prose, a table of delivery / returns / hours facts |
| `/wishlist` | static shell, client grid | Saved pairs from localStorage, clear-all, recommendation rail. `robots: index:false` |
| `/opengraph-image` | generated | Site OG card |
| `/p/[slug]/opengraph-image` | generated per product | Product OG card, so a forwarded WhatsApp link previews the shoe and price |
| `/robots.txt`, `/sitemap.xml` | generated | Sitemap built from `products` |
| not-found | static | 404 |

---

## 6. Component inventory (45 files)

**Product surface** — `product-card` (the single card used by the grid, the
rail and the wishlist), `product-grid`, `product-detail`, `product-story`,
`price`, `size-run`, `order-button`, `whatsapp-glyph`.

**Catalogue** — `catalog` (filters, sorts, pagination; the largest client
component), `section-heading`.

**Home page editorial** — `home-hero`, `category-story`, `collection-spread`,
`audience-grid`, `brand-statement`, `banner-strip`, `marquee`.

**Chrome** — `site-header`, `site-footer`, `mobile-nav`, `wordmark`,
`brand-intro` (first-visit brand animation), `smooth-scroll`.

**Wishlist** — `wishlist-button` (the heart), `wishlist-grid`, `wishlist-link`
(header chip with count), `confirm-dialog` (the only modal on the site).

**Motion presets** — `scroll-reveal`, `image-reveal`, `split-text`,
`proximity-text`, `parallax`, `magnetic`, `recommendation-rail`.

**Libraries** — `lib/products`, `lib/shop`, `lib/whatsapp`, `lib/wishlist`,
`lib/motion`, `lib/palette`, `lib/cx`.

---

## 7. The conversion path — `lib/whatsapp.ts`

Three link builders, all `encodeURIComponent`-wrapped (an unencoded ampersand
silently truncates a wa.me message):

- `buildOrderLink({ product, size })` — the only conversion path. Message body:
  greeting, product name, `Size N`, formatted price, SKU, product URL.
  **The order button is disabled until a size is picked**, so a message never
  arrives incomplete.
- `buildStockEnquiryLink({ sizes, category })` — used by the empty filter state,
  so a shopper who filtered down to nothing can ask instead of bouncing.
- `buildChatLink()` — plain "I have a question", used in the footer and About.

---

## 8. The wishlist

`lib/wishlist.ts` — `useSyncExternalStore` over `localStorage`, key
`wappicart:wishlist:v1`. **Slugs only, never product objects**, so a saved pair
always shows current price and stock and a discontinued slug simply drops out.
`getServerSnapshot` returns a frozen empty array for hydration safety.
`useIsWishlisted` subscribes to a boolean, so a card re-renders only when its
own pair flips.

**This is per-browser and invisible to the shop.** There is no server record of
what anyone saved, so an admin panel cannot report on wishlists without adding
a backend specifically for it.

---

## 9. Design system constraints an admin panel must not break

The repo carries a 486-line design constitution at
`.claude/skills/wappichat-design-system/SKILL.md`. The load-bearing rules:

- **The page is a grid of product photographs.** Two columns on a phone, three
  from `sm` up, **never four**. Square plates on `bg-mist`, flush: no border, no
  card, no shadow, no rounded corners.
- **Colour is five neutrals plus two functional accents**, all in `@theme`:
  paper `#FFFFFF`, mist `#F2F2F0`, ink `#0B0B0B`, grey `#757575`,
  line `#E8E8E6`, plus WhatsApp green `#1FA855` (the 16px order glyph, nothing
  else) and love red `#A32C23` (the saved heart, nothing else). **No hex codes
  in `.tsx`** — the two literals that cannot read a CSS variable live in
  `lib/palette.ts`. No gradients, no dark mode, no glassmorphism.
- **Exactly one inverted (`bg-ink`) section on the home page.** A second makes
  it a stripe pattern rather than a landmark.
- **One font family, one variable file.** `text-display` is home-page-only.
- **Captions: name left, price right, both ink, one baseline; colour below in
  grey. Never centred.**
- **Never animate the product grid's tiles in.** A filter is an instant swap.
- Shadows are permitted in exactly three places: the mobile dock, the wishlist
  chip, and the confirm dialog.
- Accessibility is non-negotiable: real `alt` on every image, a visible
  `:focus-visible` ring on every control, works at 360px, works with motion off,
  works with JavaScript off.

**Implication for "home page UI settings":** most of this visual system is
intentionally *not* meant to be user-configurable. If the admin panel exposes
colour pickers, column counts, corner radii or font choices, it dismantles the
thing that stops this site looking like a template. Scope home page settings to
**content and composition** (which pairs appear where, section order, on/off,
headline and blurb copy), not to **style**.

---

## 10. What is hardcoded today — the actual admin scope

Everything below currently requires a developer editing a `.tsx` file.

**Home page composition (`app/page.tsx`)**
- Section order and numbering (`index={1..8}`) is literal JSX.
- Category blurbs live in a `BLURB` constant in the page file.
- The product story pair is chosen **by hardcoded slug**:
  `getProduct("brogue-wing-chestnut")`.
- Which sections exist at all: hero, New in, two category stories, product
  story, collection spread, category tiles, brand statement, order block.
- The collection spread's eyebrow and headline strings.
- The hero pair is `featuredProducts()[0]`.

**About page (`app/about/page.tsx`)** — the prose, the facts table, and the
plate photographs chosen by slug with a positional fallback.

**Shop settings (`lib/shop.ts`)** — name, tagline, phone, Instagram, delivery
areas, return window, reply time, canonical URL.

**Catalogue rules (`lib/products.ts`)** — the four categories, the 6–11 size
run, the three price bands, the page size of 6.

**SEO** — titles, descriptions and OG copy are literals in each route file.

---

## 11. Decisions to make before phase one

1. **Where does product data live once an admin panel exists?**
   - (a) Keep `products.json`; the admin commits through the GitHub API and
     Vercel rebuilds. No new infrastructure, keeps build-time validation, but
     every save costs a deploy and there is no draft state.
   - (b) A database (Postgres / Supabase / Turso) behind Next route handlers,
     with `revalidatePath` or `revalidateTag` on write. Instant saves and real
     drafts, but `validate()` must move to write time and the fully-static
     guarantee weakens.
   - (c) A headless CMS (Sanity, Payload, Contentful). Fastest route to a usable
     editor, at the cost of another vendor and another content model to keep in
     step with `lib/products.ts`.
2. **Image pipeline.** Unsplash placeholders must be replaced by real uploads.
   This needs a blob store (Vercel Blob, S3, Cloudinary, UploadThing), a new
   `remotePatterns` entry in `next.config.ts`, and the 2–4 image rule enforced
   in the uploader. The 20-character `alt` minimum should be a form field rule,
   not a build failure.
3. **Auth.** There is none today, and the storefront deliberately has no
   `<form>`. The admin will be the first authenticated, mutating surface in the
   codebase. Decide the provider, and whether admin lives at `/admin` in this
   app or as a separate deployment.
4. **Does the admin get its own UI language?** The storefront design system is
   restrictive by design and unsuited to dense tables and forms. The cleanest
   answer is a separate route group with its own styles, so admin CSS can never
   leak into the shop.
5. **Validation has to exist twice** — in the admin (friendly, field-level,
   before save) and at build or load (the existing hard throw). Extract the
   rules out of `validate()` into one shared schema so the two cannot diverge.
6. **What does "home page UI settings" mean concretely?** Recommended scope:
   pick the hero pair, pick the product-story pair, reorder and toggle sections,
   edit section headlines and category blurbs, set how many pairs each section
   shows. Out of scope: colours, fonts, spacing, column counts.
7. **Orders.** WhatsApp is the order system, and no sale is recorded anywhere in
   this codebase. If the admin should show orders, that is a genuinely new
   product surface (WhatsApp Business API and a datastore), not an extension of
   this one.

---

## 12. Current state

Branch `main`, clean. Recent work: the wishlist feature, a first-visit brand
intro, and a redesign to the plain white catalogue. The home page's "On the
shelf" six-pair grid was just removed, taking the page from nine numbered
sections to eight.

Catalogue size: **12 products**, 4 categories, sizes 6–11. All photography is
still Unsplash placeholders.
