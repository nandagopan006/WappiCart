---
name: wappichat-design-system
description: The design system, coding rules, and content voice for the WappiCart shoe storefront. Use this skill whenever writing, editing, or reviewing ANY file in the WappiCart project — components, pages, styles, copy, product data, or config. Consult it even for small changes like adding a button or adjusting spacing, because the rules below are what keep the site from drifting into generic template territory. If a task touches WappiCart's UI, copy, colours, type, motion, or product data in any way, read this first.
---

# WappiCart Design System

A shoe storefront. Browsing on the web, ordering on WhatsApp.

The site is a warm blush-to-tan gradient. The hero is a dark panel floating
inside it. That contrast is the whole idea — a dark hero on a dark site is just
dark.

This file is the only design system in the repo. If you find a second one,
delete it.

---

## The one rule

**Every shoe rests on a wave.**

One continuous, gently bending 1px line. Not a zigzag, not a sine wave with
tall peaks — a drawn line that happens to curve. Amplitude never exceeds 8% of
its width.

It does four jobs and nothing else does them:

| Where | Variant |
|---|---|
| Flourish across the dark hero panel | `<Wave tone="light" />` |
| Divider between sections and category rows | `<Wave />` |
| Baseline under every product image | `<Wave />`, amplitude flattened |
| Spine down the left of `/about`, filling on scroll | `<Wave vertical />` |

Shoes never float in cards with drop shadows. They sit on the line.

This is the signature of the entire site. Do not remove it, do not soften it
into a straight border, and do not add a competing device beside it.

---

## Colour

Six values. They live in `app/globals.css` under `@theme`. **Never write a hex
code in a `.tsx` file.**

```
--color-blush     #F5E4DB   gradient start, top of page
--color-sand      #D9C0AD   gradient end, bottom of page
--color-espresso  #2A1F1A   all text, and the hero panel
--color-ember     #C2552F   glow only — see the rule below
--color-muted     #8C7565   secondary text, hairlines
--color-whatsapp  #1FA855   the 16px button glyph, nothing else
```

The page background is fixed, so it does not scroll with the content:

```css
background: linear-gradient(160deg, var(--color-blush) 0%, var(--color-sand) 100%);
background-attachment: fixed;
```

### The ember rule — this one matters

Ember is **light, not paint**. It appears in exactly two places, both of them
CSS classes inside `globals.css`:

- `.ember-glow` — the diffuse radial glow in the dark hero panel
- `.filter-underline` — the 1px underline on the active `/shop` filter

**No component ever names ember.** No `bg-ember`, no `fill-ember`, no
`text-ember`, no `border-ember`. If you reach for ember to fill a shape, use
espresso instead.

Why: cream background plus orange accent is currently the most common
AI-generated website palette in existence. Using the rust as light rather than
paint is the single rule that keeps this looking like a real brand.

**Buttons** are espresso with blush text, or blush with espresso text. That is
the complete list.

**Hairlines** are `--color-muted` at 30% opacity. Never pure black, never pure
white.

**WhatsApp green** appears once: the 16px glyph inside the order button. Never
a background, never a border, never a section. It works because it is rare.

Forbidden: any seventh colour, glassmorphism, coloured shadows, neon, dark mode.
The one gradient on the site is the page background.

### The two hex codes that are allowed to exist

OG images are rasterised outside the browser and `viewport.themeColor` is read
by browser chrome — neither can resolve a CSS custom property. Those literals
live in **`lib/palette.ts`** and nowhere else. Import from there; never inline.

---

## Type

```
Display   Fraunces        400 headlines · 600 section headings
Body      Manrope         400 / 500 / 600
Utility   JetBrains Mono  400 — sizes, prices, SKUs, counts
```

| Token | Mobile | Desktop | Notes |
|---|---|---|---|
| `text-display` | 40px | 88px | line-height 0.92, tracking -0.02em |
| `text-h2` | 28px | 44px | line-height 1.05 |
| `text-body` | 16px | 17px | line-height 1.6 |
| `text-utility` | 12px | 13px | tracking 0.08em, uppercase |

Fraunces is a variable font. Its WONK axis gives the quirky curved letterforms
that make the headline memorable, and below 32px the same forms read as a
mistake. So the axis is not set by hand — two component classes carry it:

```
.type-display   Fraunces 400, WONK on,  opsz 72   hero and page headlines
.type-heading   Fraunces 600, WONK off, opsz 24   section headings
```

Use `class="type-display text-display"` and `class="type-heading text-h2"`.
Never set `font-variation-settings` in a component.

Rules:
- **Never use Fraunces below 24px.** Manrope handles all reading.
- Headlines in sentence case. Only the wordmark and mono labels are uppercase.
- Every number — size, price, count, SKU — is mono. A price in a serif looks
  like a magazine; a price in mono looks like stock.
- Never centre a paragraph. Never justify. Never more than three sizes in one
  section.

---

## Spacing

Everything is a multiple of **4px**. Section vertical padding: 80px mobile,
140px desktop.

When a layout feels wrong the fix is almost always *more space*, not a new
element. If a section feels empty, add space — not an animation.

---

## Motion

There are **five moves on this site**. Nothing outside this list is animated.

```
1  WAVE DRAW     stroke-dashoffset → 0, 900ms
2  RISE          opacity 0→1, y 12px→0, 500ms
3  MASK REVEAL   curved image mask expands from 92% scale via clip-path, 700ms
                 — hero and product images only
4  TIGHTEN       hover: card lifts 4px, contact shadow tightens
5  AMBIENT       one slow wave undulation (see below)
```

Easing for all five: `cubic-bezier(0.16, 1, 0.3, 1)`, the `--ease-settle`
token. Nothing runs longer than 900ms. There is no sixth move.

**The ambient wave is the one exception to the no-looping rule.** The path `d`
shifts by no more than 4px over 8 seconds, alternating, infinite. It earns the
exception because it *is* the brand mark. All four conditions are required:

- desktop only
- paused by `IntersectionObserver` when off screen
- completely off under reduced motion
- no other looping animation exists anywhere on the site

**Every animated component calls `useReducedMotion()` and returns static values
when it is true.** The `globals.css` media query is a safety net, not the
implementation.

```tsx
const shouldReduceMotion = useReducedMotion();
const y = shouldReduceMotion ? 0 : 12;
```

With motion off: all waves fully drawn and visible, the About spine complete,
every page usable, nothing moving.

### Page transitions

`next.config.ts` sets `experimental: { viewTransition: true }`. Every product
image carries `viewTransitionName: shoe-${slug}` on **both** the `/shop` card
and the `/p/[slug]` image, so the shoe physically travels between them instead
of the page blinking. Route-change default is a 200ms cross-fade. Nothing
slides.

### Smooth scroll

Lenis: duration 1.1, exponential ease-out, `smoothWheel: true`. Three hard
rules — **off on touch devices** (`matchMedia('(pointer: coarse)')`), **off
under reduced motion**, and never used for parallax, pinning or scroll-jacking.
Almost every shopper here is on a phone, and hijacking scroll on a phone reads
as lag, not polish.

### Never build

Popping, bouncing, springing or scaling in · anything flying in from the side ·
fade-ins on body paragraphs, the trust strip or the footer · parallax ·
scroll-jacking · pinned sections · horizontal scroll · counters that count up ·
typewriter text · marquees · tickers · any loop except the ambient wave · hover
effects that scale, rotate or glow · gradient sweeps · shimmer · spotlight
cursors · blur reveals · scattered sparkles (one may sit in the wordmark,
nowhere else) · carousels · sliders · autoplay video · preloaders · splash
screens.

Scattered animation is the fastest way to make a site look AI-generated.

---

## Pages

```
/            Home — dark hero panel, 3 featured pairs, 4 category rows, trust, footer
/shop        Split header, sticky filter bar, asymmetric grid
/p/[slug]    Image column + details, sticky order button on mobile
/about       Six sections under 60 words each, vertical wave spine
```

The homepage never shows more than three products. Its only job is to make
someone tap "Shop the collection".

The about page builds trust. It does not sell.

---

## Code rules

- **Tailwind v4** with CSS-first `@theme`. No colour values in a config file.
- Server Components by default. `'use client'` only for filters, motion, and
  anything holding state.
- `next/image` always, with explicit `width`/`height`. Never a bare `<img>`.
- No `<form>` elements — nothing on this site submits anywhere.
- Product data flows from `data/products.json` only, through `lib/products.ts`.
  Never hardcode a product in a component.
- Every interactive element needs a visible `:focus-visible` ring in espresso.
- Every image needs real `alt` text describing the shoe, not `"product image"`.
- `generateStaticParams` and `generateMetadata` with `openGraph` on every
  product route. A forwarded WhatsApp link must preview the shoe and the price.

**Never install:** a UI kit, a carousel library, a state manager, an analytics
SDK, or anything that ships more than 15kb for one feature. Total JS stays
under 150kb.

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

Write from the shopper's side of the screen. Plain words, sentence case, no
filler.

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
3. Does the wave still run unbroken?
4. Can you tab to every interactive element and see where you are?
5. Does it still work with motion turned off?
6. Chanel's rule — remove one thing. Is it better?
