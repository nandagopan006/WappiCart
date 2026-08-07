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
  /** Gradient start, top of page. */
  blush: "#F5E4DB",
  /** Gradient end, bottom of page. */
  sand: "#D9C0AD",
  /** All text, and the hero panel. */
  espresso: "#2A1F1A",
  /** Glow only. Never a fill — see SKILL.md, "The ember rule". */
  ember: "#C2552F",
  /** Secondary text, hairlines. */
  muted: "#8C7565",
  /** The 16px glyph inside the order button. Nothing else. */
  whatsapp: "#1FA855",
} as const;
