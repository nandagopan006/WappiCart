import type { Viewport } from "next";
import { Jost } from "next/font/google";
import type { ReactNode } from "react";

import { palette } from "@/lib/palette";

import "./globals.css";

/**
 * The document.
 *
 * ── Why this holds so little ─────────────────────────────────────────────
 * It used to hold the storefront's whole chrome — header, footer, mobile
 * dock, smooth scroll, the brand intro — because the storefront was the only
 * thing in the app. The admin panel is not a shop and must not be wrapped in
 * one: an editor does not need Lenis interpolating their scroll through a
 * table, and a sticky shop header over a product form is furniture in the way
 * of the work.
 *
 * So everything that makes a page feel like the shop moved down into
 * `app/(storefront)/layout.tsx`, and what is left here is what genuinely
 * belongs to the document: the html and body elements, the font, the
 * stylesheet, and the script that has to run before first paint.
 *
 * Both sides share the font on purpose. A second family loaded for the admin
 * would be a second download and a second thing to keep in step, and Jost is
 * a perfectly good interface face — the admin should feel like WappiCart even
 * while it looks nothing like the shop.
 */

/* Variable cut, 100–900. Naming a `weight` would ship fixed instances and
   break ProximityText, which interpolates weight under the cursor. */
const jost = Jost({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jost",
});

export const viewport: Viewport = {
  /* Browser chrome cannot read a CSS token, so this comes from the one module
     allowed to hold literals. */
  themeColor: palette.paper,
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={jost.variable}
      /* The inline script below adds `js` before React hydrates, so the
         server HTML and the client tree disagree about className by design.
         Without this, that shows up as a hydration error on every page. */
      suppressHydrationWarning
    >
      {/* Marks the document as scripted before first paint, so the motion
          components can hold their start states without ever hiding content
          from a visitor whose bundle failed to load. See globals.css. */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            /* Runs before first paint. The `intro-seen` stamp is what stops a
               returning visitor seeing a frame of the brand intro — decided
               in an effect it would paint first and vanish, which is a flash
               on every visit after the first. Wrapped, because storage throws
               outright in private mode and a broken head script would take
               the `js` class down with it. */
            __html:
              "document.documentElement.classList.add('js');" +
              /* Development replays the intro on every load, so the flag is
                 not consulted at all — reading it here would hide the curtain
                 before first paint and the component could only bring it back
                 with a visible pop. Production keeps first-visit-only. */
              (process.env.NODE_ENV === "development"
                ? ""
                : "try{if(localStorage.getItem('wappicart:intro:v1'))" +
                  "document.documentElement.classList.add('intro-seen')}catch(e){}"),
          }}
        />
      </head>
      <body className="bg-paper text-ink font-sans">{children}</body>
    </html>
  );
}
