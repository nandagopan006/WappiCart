# WappiCart

A shoe storefront. Browsing happens on the web, ordering happens on WhatsApp.
No cart, no payment gateway, no checkout form — one button per product.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
```

`.claude/skills/wappichat-design-system/SKILL.md` is the design system and the
coding rules. Read it before changing anything that renders.

---

## Before this goes live

Four things are placeholders. The site builds and runs without touching them,
but it is not a real shop until they are done.

**1. The WhatsApp number.** Copy `.env.example` to `.env.local` and set
`NEXT_PUBLIC_WHATSAPP_PHONE`. The fallback (`919000000000`) reaches nobody.
Then open a product on an actual phone and tap the button — the whole business
runs through that one link.

**2. The product photographs.** Every image in `data/products.json` is an
Unsplash URL. See "Product images" below.

**3. The shop's details.** `lib/shop.ts` carries an invented Instagram handle,
delivery areas and return window. `app/about/page.tsx` describes a two-person
shop in Kerala. All of it is written to show the voice — replace it with what
is true.

**4. The domain.** Set `NEXT_PUBLIC_SITE_URL`. It feeds canonical URLs, the
sitemap, OG tags, and the product link inside every WhatsApp message.

---

## Adding a product

Add an object to `data/products.json` and redeploy. That is the whole workflow.

```jsonc
{
  "slug": "runner-low-white",        // becomes /p/runner-low-white
  "name": "Runner Low",
  "category": "sneakers",            // sneakers | formals | loafers | sandals
  "price": 2499,                     // rupees, whole numbers
  "mrp": 2999,                       // optional strike-through price
  "images": [                        // 2 to 4 views; [0] is the one the grid uses
    "https://images.unsplash.com/photo-…",
    "https://images.unsplash.com/photo-…"
  ],
  "alt": "Runner Low in off-white leather, a pair seen from above on grey concrete",
  "sizes": [6, 7, 8, 9, 10],         // only sizes actually in stock
  "colour": "Off-white",             // one or two words, matching the photo
  "material": "Full-grain leather upper, rubber cup sole",
  "fitNote": "Runs half a size small",         // optional
  "featured": true,                            // optional, leads a home section
  "isNew": true,                               // optional, small "new" label
  "description": "Off-white leather on a thick rubber cup sole. It wipes clean, which is most of why we stock it in this colour. The sole is stiff for the first few wears.",
  "care": "Wipe with a damp cloth. Keep it out of the washing machine.",
  "sku": "WPC-RL-WHT"                // goes into the WhatsApp message
}
```

There is no `image` key in the JSON. `lib/products.ts` derives it from
`images[0]`, so the grid photograph and the first view can never disagree.

**Writing the description.** Two or three short sentences: what it is made of,
what it is for, and one honest thing about wearing it. Every description in the
catalogue names a downside — the tan suede marks in rain, the leather sole is
slippery on wet tile, the trail shoe is heavy. That is deliberate. A shop that
tells you what a shoe is bad at gets believed about what it is good at. See the
Voice section of `SKILL.md` for the banned words.

`lib/products.ts` validates every entry when the module loads, which happens
during `next build`. A duplicate slug or SKU, an unknown category, an `mrp`
below the price, fewer than two images, an image on an unapproved host, a size
outside the shop's run, or a missing `alt` fails the build with a message
naming the product — rather than shipping a broken page.

To take a size off sale, remove it from `sizes`. It still renders in the size
run at 30% opacity and cannot be tapped. Showing a gap where a size used to be
reads as an oversight; showing it greyed reads as a shop that knows its stock.

---

## Product images

All twelve products currently point at **Unsplash URLs**. `next.config.ts`
allowlists exactly one host and one path prefix (`images.unsplash.com`,
`/photo-**`) — `lib/products.ts` rejects any other source at build time, so a
pasted URL from somewhere else fails the build rather than 500ing at render.

`public/shoes/*.svg` holds 36 generated silhouettes from
`scripts/generate-placeholder-shoes.mjs`. **Nothing references them.** They are
left in place as a fallback if you would rather ship silhouettes than stock
photography; regenerate with:

```bash
node scripts/generate-placeholder-shoes.mjs
```

Real photographs replace the Unsplash URLs one product at a time. Drop the
files in `public/shoes/`, change the `images` array to `/shoes/name.webp`, and
delete the `remotePatterns` block from `next.config.ts` once no Unsplash URL
remains. `products.json` is the only file that knows where an image lives.

The rules that matter:

- **Square, or close to it.** Every photograph renders inside an
  `aspect-square` plate on the grid and `aspect-4/3` on the editorial
  sections. A wildly different source ratio gets cropped hard.
- **The same camera angle on every pair.** A consistent angle is most of what
  separates a shop from a marketplace listing.
- **A clean, quiet ground.** The grid caption sits directly under the image with
  no card around it, so a busy background bleeds into the type.
- WebP.

---

## How it is put together

```
app/
  layout.tsx              font, metadata, header/footer, smooth scroll
  page.tsx                the home page — nine numbered sections
  shop/page.tsx           the same stock with filters and load-more
  p/[slug]/page.tsx       product page — prerendered, JSON-LD, OG image
  about/  not-found.tsx  sitemap.ts  robots.ts  opengraph-image.tsx
  globals.css             every colour, size and easing — the only place they live
components/
  home-*, category-story, product-story, collection-spread,
  audience-grid, brand-statement          the home page's sections
  catalog, product-grid, product-card,
  product-detail, size-run, order-button  the shop
  scroll-reveal, image-reveal, split-text,
  parallax, magnetic, marquee, smooth-scroll   the motion presets
lib/
  products.ts             typed and validated at module load
  whatsapp.ts             the only conversion path on the site
  motion.ts               every easing, duration and stagger value
  shop.ts  palette.ts  cx.ts
data/products.json        the catalogue
```

**Client components** are only `Catalog` (filters and pagination),
`ProductDetail` (size selection), `SizeRun`, `OrderButton` and the motion
presets. Everything else renders on the server.

**Motion.** One global Lenis instance wired to GSAP ScrollTrigger, with six
reusable presets. All timing comes from `lib/motion.ts`. Entrance start states
live in CSS behind `html.js` with a 3s failsafe, so a shopper whose bundle
never arrives still sees every pair. Every preset checks
`prefers-reduced-motion`; cursor effects are desktop-only.

**JavaScript.** 158 kB first load on the home page, 120 kB on `/shop`, 103 kB
shared. GSAP and Lenis account for roughly 29 kB gzipped of that.

---

## Two things worth knowing

**`/shop` paginates six at a time.** Two complete rows of the three-up grid, so
a page never ends on an orphan tile. It is a load-more button rather than
infinite scroll: infinite scroll takes the footer away from anyone trying to
reach it and does not work with a keyboard. The whole catalogue already ships
with the page, so "loading more" is slicing an array — which is why there is no
spinner. If the shelf outgrows one payload, `shown` in `catalog.tsx` becomes a
cursor and nothing above it changes.

**OG cards spell the currency** — `Rs 2,499`, not `₹2,499`. The OG renderer has
no font covering U+20B9 and draws an empty box instead, in the one place a
shopper cannot zoom in to check. `formatPrice` still uses ₹ everywhere on the
site itself.

---

## Deploy

Push to a Vercel project. Set `NEXT_PUBLIC_WHATSAPP_PHONE` and
`NEXT_PUBLIC_SITE_URL` in the project's environment variables. Every page is
statically prerendered; there is no backend, no database and nothing to run.
