/**
 * The only place in the repo where a colour is written as a hex literal.
 *
 * Two consumers cannot resolve a CSS custom property:
 *   · OG images — rasterised by satori, outside any browser
 *   · viewport.themeColor — read by browser chrome before CSS exists
 *
 * Everything else reads the tokens in app/globals.css. If you find a hex code
 * in a .tsx file, it belongs here instead.
 *
 * These values are the source that @theme mirrors. Change both together.
 */
export const palette = {
  /** The page. Plain white — the shoes supply the colour. */
  paper: "#FFFFFF",
  /** Banner bands and image plates. */
  mist: "#F4F4F4",
  /** Headings, prices, the order button. */
  ink: "#1A1A1A",
  /** Product names, captions, secondary text. */
  grey: "#8A8A8A",
  /** Hairlines and rules. */
  line: "#E4E4E4",
  /** The 16px glyph inside the order button. Nothing else. */
  whatsapp: "#1FA855",
} as const;
