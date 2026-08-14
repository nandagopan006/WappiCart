---
name: wappichat-design-system
description: The design system, coding rules, and content voice for the WappiCart shoe storefront. Use this skill whenever writing, editing, or reviewing ANY file in the WappiCart project — components, pages, styles, copy, product data, or config. Consult it even for small changes like adding a button or adjusting spacing, because the rules below are what keep the site fast, dense, and readable. If a task touches WappiCart's UI, copy, colours, type, motion, or product data in any way, read this first.
---

# WappiCart Design System

A shoe storefront. Browsing on the web, ordering on WhatsApp.

The site is a plain white retail catalogue. Dense grids of product photographs,
tiny tracked captions, one hairline, no hero. The shoes are the only colour on
the page — everything around them gets out of the way.

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

Five values plus the green. They live in `app/globals.css` under `@theme`.
**Never write a hex code in a `.tsx` file.**

```
--color-paper     #FFFFFF   the page
--color-mist      #F2F2F0   image plates, quiet bands
--color-ink       #0B0B0B   headings, prices, buttons, the dark band
--color-grey      #757575   captions, secondary text
--color-line      #E8E8E6   hairlines and rules
--color-whatsapp  #1FA855   the 16px button glyph, nothing else
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

**WhatsApp green** appears once: the 16px glyph inside the order button. Never
a background, never a border, never a section. It works because it is rare.

Forbidden: any seventh colour, gradients, glassmorphism, coloured shadows,
drop shadows of any kind, neon, dark mode, rounded corners above 0px.

### The two hex codes that are allowed to exist

OG images are rasterised outside the browser and `viewport.themeColor` is read
by browser chrome — neither can resolve a CSS custom property. Those literals
live in **`lib/palette.ts`** and nowhere else. Import from there; never inline.

---

## Type

**One family: Jost.** Weights 300, 400, 500. There is no second face — a
display serif beside a dense photo grid competes with the photographs, which
is the one thing the layout cannot afford.

| Token | Size | Use |
|---|---|---|
| `text-display` | 48 → 144px, weight 300, tracking -0.045em, UPPERCASE | **home page only** |
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
- **Display type is weight 300, uppercase, tracked to -0.03em.**
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
- Captions under tiles are centred. Body paragraphs are never centred, never
  justified.

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
EASE_SETTLE   one curve, three forms (CSS / Motion points / GSAP)
DURATION      quick .26 · settle .5 · reveal .7 · long .9   — nothing longer
STAGGER       char .018 · line .06 · card .08
```

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
<ScrollReveal>    opacity + short lift, once on enter. The default entrance.
<ImageReveal>     clip-path mask opens, picture settles back from overscale
<SplitText>       char / word / line, each piece rising out of its own mask
<Parallax>        scrubbed drift against the scroll
<Magnetic>        cursor lean, desktop only
<Marquee>         horizontal, scroll-driven by default
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
/            The whole shop — New in grid, banner strip, Best selling grid
/shop        The same stock with filters attached
/p/[slug]    Stacked photographs left, sticky decision column right
/about       One portrait, four paragraphs, a table of facts
```

The homepage shows **everything**. It is a catalogue, not a shopfront window —
a shopper who lands on the home page should be able to buy without navigating.

The about page builds trust. It does not sell.

---

## Code rules

- **Tailwind v4** with CSS-first `@theme`. No colour values in a config file.
- Server Components by default. `'use client'` only for the catalogue filters,
  the size run, the order button, and the motion presets in `lib/motion.ts`'s
  orbit — things that hold state or touch the DOM.
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
2. Is every colour and size coming from a token? (`grep '#[0-9a-fA-F]' **/*.tsx`
   must return nothing.)
3. Is the grid still 2 / 3 / 4 columns, with square plates?
4. Is the product name still grey and the price still ink?
5. Can you tab to every interactive element and see where you are?
6. Does it still work with motion turned off, and with JavaScript disabled?
