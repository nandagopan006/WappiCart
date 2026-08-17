---
name: wappichat-design-system
description: The design system, coding rules, and content voice for the WappiCart shoe storefront. Use this skill whenever writing, editing, or reviewing ANY file in the WappiCart project — components, pages, styles, copy, product data, or config. Consult it even for small changes like adding a button or adjusting spacing, because the rules below are what keep the site fast, dense, and readable. If a task touches WappiCart's UI, copy, colours, type, motion, or product data in any way, read this first.
---

# WappiCart Design System

A shoe storefront. Browsing on the web, ordering on WhatsApp.

The site is a plain white retail catalogue. Dense grids of product photographs,
tiny tracked captions, one hairline. The shoes are the only colour on the page —
everything around them gets out of the way.

The one exception is the home page's opening banner, which runs full-bleed at
the height of the viewport. Every other page opens on stock.

This file is the only design system in the repo. If you find a second one,
delete it.

---

## The one rule

**The page is a grid of product photographs. Everything else is scaffolding.**

Every screen is a run of square tiles — **two across on a phone, three from
`sm` up, never four** — broken into chapters by a numbered index heading. The
tiles are the content; the header, the filters and the footer exist to get the
shopper to them and out of the way.

Three columns rather than four because these are lifestyle crops, not cut-outs
on white. At four, a shoe on a busy background is hard to read at a glance;
three gives each pair roughly 40% more area for the same page height.

| Where | What |
|---|---|
| Every product listing | `<ProductGrid products={...} />` |
| Every chapter break | `<SectionHeading index={n} meta="12 styles">` |
| The home page's editorial sections | `CategoryStory`, `ProductStory`, `CollectionSpread`, `AudienceGrid`, `BrandStatement` |

Section headings are **numbered and pinned left**, never centred with rules
running out to both sides. The home page is a sequence; saying which part you
are in is what stops a long scroll feeling shapeless.

Shoes sit on a pale square plate (`bg-mist`), flush, no border, no card, no
drop shadow, no rounded corners.

This density is the signature of the site. Do not add whitespace between tiles
to make it feel "premium", and do not invent a second tile shape.

### Pagination

`/shop` shows **6 at a time** — two complete rows of the three-up grid, so a
page never ends on an orphan tile. Under it: a hairline filled to the
proportion seen, `Showing 6 of 12`, and a `Load more (6)` button.

- **Never infinite-scroll.** It takes the footer away from anyone trying to
  reach it, it removes the moment where a shopper decides whether to keep
  looking, and it does not work with a keyboard.
- **No spinner.** The whole catalogue already ships with the page, so
  "loading more" is slicing an array the client holds — an indicator for work
  that takes no time is a lie about the interface.
- Any filter or sort change **resets to page one**. Otherwise widening a
  filter silently reveals everything at once and the boundary the shopper was
  clicking through disappears.
- If the shelf outgrows shipping in one payload, `shown` becomes a cursor and
  `Catalog` fetches the next page. Nothing above it has to change.

---

## Colour

Five neutrals plus two functional accents. They live in `app/globals.css`
under `@theme`. **Never write a hex code in a `.tsx` file.**

```
--color-paper     #FFFFFF   the page
--color-mist      #F2F2F0   image plates, quiet bands
--color-ink       #0B0B0B   headings, prices, buttons, the dark band
--color-grey      #757575   captions, secondary text
--color-line      #E8E8E6   hairlines and rules

--color-whatsapp  #1FA855   the 16px order-button glyph, nothing else
--color-love      #A32C23   the saved heart, its burst and its glow
```

The page background is flat `--color-paper`. There is no gradient anywhere on
the site.

### The one inverted section

**Exactly one section on the home page is `bg-ink text-paper`** — the product
story. A page of nothing but photographs on white is legible and completely
flat: the eye gets no landmark, so a long scroll reads as one undifferentiated
sheet however the grids are arranged. One band of ink halfway down splits the
page into a before and an after, and it costs no new colour and no decoration.

A second inverted section makes it a stripe pattern rather than a landmark.
Do not add one.

### The caption rule

Under a product photograph: **name left, price right, both ink, one baseline.**
The colour goes underneath in grey.

Captions are never centred. A centred stack floating under a photograph is what
every retail template does, and it is the single detail that made this grid
read as generic. Aligning the caption to the photograph's own edges is what
makes it read as a catalogue entry.

**Buttons** are ink with paper text, or paper with ink text, square-cornered.
That is the complete list. No pills, no rounded corners, no fills in any other
colour.

**Hairlines** are `--color-line`. Never pure black, never an opacity trick on
grey.

### The two accents, and the rule that governs both

Green and red are **functional, not decorative**. Each marks exactly one
state, each appears at roughly 16px, and neither is ever a background, a
border, a heading, a price or a section. They work because they are rare — the
moment either one is used to make something "pop", both stop meaning anything.

**WhatsApp green** appears once: the glyph inside the order button.

**Love red** appears on the saved heart, and on the burst and glow that fire
when a pair is saved. It is a deep warm red rather than a signal red: on a
page of neutrals a bright `#f00` reads as an error, and this has to read as
affection.

An eighth colour needs a state that neither of these covers. There is not one.

Forbidden: gradients (except the two documented glows), glassmorphism as a
surface treatment, coloured shadows, neon, dark mode, rounded corners above 0px
on anything that is not a control.

### Where shadows are allowed

Three places, and nowhere else: the mobile dock, the wishlist chip, and the
confirmation dialog. All three genuinely float over content, and without any
separation they read as pasted onto whatever is behind them. Every one is
tinted with ink at low opacity, never black.

**Product tiles never get a shadow.** They sit flush on the page.

### The two hex codes that are allowed to exist

OG images are rasterised outside the browser and `viewport.themeColor` is read
by browser chrome — neither can resolve a CSS custom property. Those literals
live in **`lib/palette.ts`** and nowhere else. Import from there; never inline.

---

## Type

**One family: Jost, loaded as a variable font** with its full 100–900 axis.
There is no second face — a display serif beside a dense photo grid competes
with the photographs, which is the one thing the layout cannot afford.

The variable cut is not a preference. `ProximityText` interpolates weight
under the cursor, and with static 300/400/500 faces the browser can only snap
between three values — the animation reads as three hard steps. Naming any
`weight` in `next/font` breaks that. One variable file is also less to
download than three static ones.

| Token | Size | Use |
|---|---|---|
| `.wordmark` | 20 → 26px, weight 600, tracking -0.01em, UPPERCASE | the shop's mark, header only |
| `text-display` | 36 → 72px, weight 300, tracking -0.03em, UPPERCASE | **home page only** |
| `text-lead` | 17 → 20px | the one paragraph allowed under a display line |
| `text-title` | 20 → 24px | page and section titles, product name on the sheet |
| `text-section` | 13px, tracking 0.18em, uppercase | the rule-heading band |
| `text-body` | 15px | all reading |
| `text-caption` | 11px, tracking 0.1em, uppercase | product names, labels, nav, buttons |
| `text-price` | 12px, untracked | every price |

Rules:
- **`text-display` is the home page's voice and nothing else's.** /shop, /p and
  /about top out at `text-title` — a shopper who has started shopping does not
  need to be sold to again. A display size used twice reads as a campaign;
  used ten times it reads as a template.
- **Display type is weight 300, uppercase, tracked to -0.03em.** It caps at
  72px on purpose: it was 144px and had to be positioned on top of the
  photographs to fit, which is the rule below.
- **Type never sits on top of a photograph.** No absolute positioning over an
  image, no blend modes, no negative margins pulling one block over another.
  A headline that has to be positioned on top of a picture to fit is too big
  for the column it is in — shrink the type, do not move it. These are
  catalogue images with the shoe in the middle of the frame; they were not
  shot to carry text.
- Product names, nav links, labels and buttons are **uppercase and tracked**.
  Body copy is sentence case and never tracked.
- **The price is never tracked.** A tracked number is hard to read at a glance
  and the price is the one thing that has to be.
- **Nothing under a tile is centred** — see the caption rule above. Body
  paragraphs are never centred and never justified either. The only centred
  text on the site is an empty state and the closing line of a section, both
  of which are single short blocks with nothing to align to.

### Splitting text

`SplitText` and `ProximityText` cut a string into spans. Both cut in three
tiers — **lines → words → glyphs** — and the word tier is load-bearing: every
glyph is its own `inline-block`, and without a `whitespace-nowrap` box around
each word the browser will break a line mid-word (`BROGU / E WING`). The
breakable space belongs **between** those boxes, never as the first child of
one, where the inline formatting context trims it and the words run together.

`\n` in the string forces a line. Use it rather than relying on the container's
width to break a two-line statement.

---

## Spacing and alignment

Everything is a multiple of 4px. Section vertical padding: `py-section`
(56px mobile, 80px desktop).

**One grid, twelve columns, one container.** Every section is
`max-w-page mx-auto px-4 md:px-8`, and every block inside it starts on a
column boundary. Nothing is nudged off the grid with a negative margin and
nothing is absolutely positioned over anything else. If two things need to
relate, they share a row — they do not overlap.

Editorial layouts get their rhythm from **which columns** a block occupies and
from alternating sides between sections, never from knocking elements out of
alignment.

Grid gaps are deliberately **tight** — `gap-x-4 gap-y-10`, a little wider on
desktop. If a grid feels cramped the fix is a better crop, not more gap. A
retail grid is scanned, and space between tiles slows scanning without making
any single shoe easier to see.

---

## Motion

All timing and easing lives in **`lib/motion.ts`**. Never write a raw duration
or an easing string in a component.

```
EASE_SETTLE   things that MOVE. One curve, three forms (CSS / Motion / GSAP)
--ease-fade   things that only change OPACITY. CSS token, photography only
DURATION      quick .26 · settle .5 · reveal .7 · long .9   — nothing longer
STAGGER       char .018 · line .06 · card .08
```

**Two curves, and the split is not cosmetic.** `--ease-settle` reaches ~70% in
the first fifth of its duration — right for something arriving in place, wrong
for a fade, where it reads as a pop rather than a dissolve. `--ease-fade` is
symmetric, so a cross-fade takes as long to leave as to arrive. Anything that
travels uses settle; there is no third curve.

### Cross-fading two images

**Only the top layer animates.** Fading one image out while fading another in
is the obvious way to write it and it is wrong: halfway through, both sit at
50% over a pale plate and the composite goes washed-out — a visible flash.
Hold the lower image fully opaque and dissolve the upper one over it, so the
stack is never less than opaque and there is nothing to dip.

### The four tools, and what each is for

| Tool | Use it for |
|---|---|
| GSAP | cinematic timelines — hero sequences, section choreography |
| ScrollTrigger | anything driven by scroll — scrub, pin, parallax, reveals |
| Lenis | smooth scroll. **One instance**, in the root layout, never a second |
| Motion | React state — filtering, sorting, layout, presence |
| CSS | hover and simple micro-interaction |

Do not use one of them for another's job. A scroll timeline written in Motion
and a filter transition written in GSAP are both signs the system has drifted.

### The presets

Compose from these. Do not hand-roll a reveal beside them.

```
<ScrollReveal>     opacity + short lift, once on enter. The default entrance.
<ImageReveal>      clip-path mask opens, picture settles back from overscale
<SplitText>        char / word / line, each piece rising out of its own mask
<ProximityText>    glyphs lift and gain weight toward the cursor, desktop only
<Parallax>         scrubbed drift against the scroll
<Magnetic>         cursor lean, desktop only
<Marquee>          horizontal, scroll-driven by default
<ConfirmDialog>    the only modal. Never `confirm()`.
```

### Rules

- **`ScrollReveal` is the only one used more than once a page.** Split type on
  every heading and a mask on every image is noise. Two or three deliberate
  moments per page.
- **Never animate the product grid's tiles in.** The grid renders up to twelve
  photographs; a staggered entrance makes the shopper wait to read the result
  of their own tap. A filter is an instant swap.
- Transform and opacity only. `clip-path` is allowed; `filter: blur` is
  allowed on **one** element per page and nowhere near the grid.
- **`font-weight` is the exception, and it is expensive.** Every distinct
  value re-shapes and re-rasters the glyph, so `ProximityText` quantises it to
  steps of 8 and writes only when the rounded value changes. It also pins each
  glyph in a slot measured at rest — a heavier glyph is a wider glyph, and
  animating weight in normal flow makes the whole line jitter. Never centre a
  glyph in that slot: centring drags its left edge as it thickens, which is a
  wobble on top of the lift.
- Measure after `document.fonts.ready`. Measuring before the face arrives
  locks every slot to the fallback's metrics.
- Every preset checks `prefersReducedMotion()` and returns static. The
  `globals.css` media query is the safety net, not the implementation.
- Start states live in CSS behind `html.js` with a 3s failsafe, so a failed
  bundle can never leave the page blank. Never hide content from GSAP.
- Cursor effects (`Magnetic`, pointer parallax) are `hasFinePointer()` only.
- Travel scales down below 768px via `travelScale()`. Never ship a 60px drift
  to a 390px screen.

**Never install** another animation library. These four cover everything;
a fifth means the system has drifted.

---

## Pages

```
/            Nine numbered sections — full-bleed banner, New in, two category
             stories, the inverted product story, a collection spread, the
             shelf tiles, the brand statement, six pairs, the order block
/shop        The whole shelf with filters, sorting and load-more
/p/[slug]    Stacked photographs left, sticky decision column right
/about       One portrait, four paragraphs, a table of facts
/wishlist    Saved pairs, clear-all, and a recommendation rail
```

The home page is a **sequence**, and its sections are numbered `01`–`09`
because saying which part you are in is what stops a long scroll feeling
shapeless. It shows six pairs near the end, not the whole catalogue: /shop has
the filters and the pagination to handle a longer list properly, and a home
page that reprints the shelf gives the shopper no reason to go there.

The about page builds trust. It does not sell.

`/wishlist` is `robots: { index: false }` — the list lives in one browser's
storage, so no two visitors would see the same page and there is nothing for a
crawler to index.

---

## The wishlist

State lives in **`lib/wishlist.ts`** — `useSyncExternalStore` over
`localStorage`. There is no Context, no Zustand, no Redux and no server user.
Do not add one: this holds a list of strings.

- **Slugs only, never product objects.** `data/products.json` is the source of
  truth for price, stock and photography. Copying a product into storage means
  a shopper seeing last month's price on a pair they saved. A slug that no
  longer resolves simply drops out of the map.
- **`getServerSnapshot` returns empty.** The server cannot know what is in a
  browser's storage, so the first paint is the empty state and the real list
  arrives on hydration. Reading `localStorage` during render is how this
  feature ships a hydration error.
- **`useIsWishlisted` subscribes to a boolean**, not the array — a card
  re-renders only when its own pair flips, and nothing is keyed to position,
  so filtering and sorting can never desync the hearts.
- Parse defensively. localStorage can hold a half-written value, another app's
  key, or a shape from a future version, and it throws outright in Safari
  private mode.

**The heart** sits at the photograph's top-right on a translucent paper chip.
The chip is not decoration: a bare outline heart over a dark crop is invisible.
It is a **sibling of the card's `<Link>`, never a child** — a `<button>` inside
an `<a>` is invalid HTML and behaves inconsistently with a keyboard.

Saving is celebrated — press, swell, one warm glow, an eight-particle burst on
a compact radius. **Removing is not**: a small shrink and the fill drains away.
Undoing something should never feel like an achievement. Burst offsets derive
from the particle index, never `Math.random`, so server and client agree.

**Destructive actions get a dialog, never `confirm()`.** Focus moves to Cancel
— the safe choice — and returns to the opener on close; Escape and the backdrop
both close it; body scroll is locked and restored to its previous value. Cancel
is the filled button and the destructive one is plain: it should not be the
most attractive thing on screen.

---

## Code rules

- **Tailwind v4** with CSS-first `@theme`. No colour values in a config file.
- Server Components by default. `'use client'` only where something holds
  state or touches the DOM: the catalogue filters, the size run, the order
  button, the product sheet, the wishlist components, the confirmation dialog,
  the recommendation rail, and the motion presets. `ProductCard` is **not**
  one of them — its
  hover image swap is pure CSS, and keeping it on the server is why a grid of
  twelve ships no JavaScript for the effect.
- **One `ProductCard`, everywhere.** The grid, the rail and the wishlist all
  render it. It takes an optional `sizes` so a narrow slot does not fetch a
  grid-width image. A second card implementation is a second design system.
- Horizontal rails are plain `overflow-x-auto` with scroll snapping — native
  swipe, native keyboard, nothing intercepted, so vertical scrolling over the
  row still moves the page. **Never autoplay one.**
- `next/image` always, `fill` inside an `aspect-square` plate. Never a bare
  `<img>`.
- No `<form>` elements — nothing on this site submits anywhere.
- Product data flows from `data/products.json` only, through `lib/products.ts`.
  Never hardcode a product in a component.
- Every interactive element needs a visible `:focus-visible` ring in ink.
- Every image needs real `alt` text describing the shoe, not `"product image"`.
  Decorative shoes (the banner strip) take `alt=""` and `aria-hidden`.
- `generateStaticParams` and `generateMetadata` with `openGraph` on every
  product route. A forwarded WhatsApp link must preview the shoe and the price.

**Never install:** a UI kit, a carousel library, a fifth animation library, a
state manager, an analytics SDK, or anything that ships more than 15kb for one
feature.

---

## The WhatsApp link

This is the only conversion path on the site. It must never break.

```ts
buildOrderLink({ product, size })
// → https://wa.me/91XXXXXXXXXX?text=<encoded message>
```

Rules:
- Always `encodeURIComponent` the message. An unencoded `&` silently truncates it.
- Phone number: country code, digits only, no `+`, no spaces, no dashes.
- The message always includes name, size, price and SKU. The shop owner must
  not have to ask "which one?"
- The button is disabled until a size is picked. A message without a size
  creates a back-and-forth that loses the sale.
- Test on a real phone after any change to `lib/whatsapp.ts`.

---

## Voice

Write from the shopper's side of the screen. Plain words, sentence case in
prose, uppercase only in labels and buttons. No filler.

| Write | Not |
|---|---|
| Order on WhatsApp | Submit / Buy Now / Get Started |
| 46 pairs in stock | Wide Selection Available |
| Runs half a size small | True to size ✓ |
| No pairs in size 11 right now — message us and we'll check the back | No products found |

The button says "Order on WhatsApp", so the chat that opens says "I want to
order". Same words all the way through.

**Never write:** "elevate", "unleash", "seamless", "curated", "revolutionise",
"game-changing", "premium quality", or an em-dash-heavy sales paragraph. Say
what the shoe is made of and what it costs.

Empty states point at the next action. Errors say what happened and how to fix
it. Nothing apologises.

---

## Before finishing any UI work

1. Does it render at 360px with no horizontal scroll?
2. Is every colour and size coming from a token?
   `grep -rE '#[0-9a-fA-F]{3,6}' components app --include=*.tsx` must return
   nothing outside `lib/palette.ts`.
3. Is the grid still **2 columns on a phone, 3 from `sm`**, with square plates?
4. Is the caption still **name left in ink, price right in ink, colour below in
   grey** — and not centred?
5. Can you tab to every interactive element and see where you are?
6. Does it still work with motion turned off, and with JavaScript disabled?
7. Did you add a shadow, an accent colour, or a second inverted section? All
   three are capped — check the rules above before assuming yours is the
   exception.

### Known debt

The three permitted shadows write `rgba(11, 11, 11, …)` inline rather than
`color-mix(in srgb, var(--color-ink) …)`. It is ink at low opacity either way,
but they are the only colour literals left in a component. Worth folding into
tokens next time one of those three files is opened.
