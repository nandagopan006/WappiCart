import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import { AnnouncementBar } from "@/components/announcement-bar";
import { Atmosphere } from "@/components/atmosphere";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteLoader } from "@/components/site-loader";
import { SmoothScroll } from "@/components/SmoothScroll";
import { cx } from "@/lib/cx";
import { palette } from "@/lib/palette";
import { shop } from "@/lib/shop";

import "./globals.css";

/* Latin only. Fraunces carries the personality and is used sparingly;
   Manrope does the reading.

   Fraunces loads as a variable font with no `weight` set, which is what makes
   the WONK axis reachable at all — a static 400/600 pair would bake WONK off
   and .type-display could not turn it on. The weights the design uses are
   applied through .type-display and .type-heading in globals.css. */
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
  variable: "--font-fraunces",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-manrope",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  metadataBase: new URL(shop.url),
  title: {
    default: `${shop.name} — ${shop.tagline}`,
    template: `%s · ${shop.name}`,
  },
  description:
    "A small shoe shop. Browse the pairs here, order the one you want on WhatsApp. No cart, no checkout form, no account.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: shop.name,
    title: `${shop.name} — ${shop.tagline}`,
    description: "Browse the pairs here, order on WhatsApp.",
    url: shop.url,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  /* Browser chrome cannot read a CSS token, so this comes from the one module
     allowed to hold literals. Blush, because that is the top of the page. */
  themeColor: palette.blush,
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={cx(fraunces.variable, manrope.variable, jetBrainsMono.variable)}
      /* The inline script below adds `js` to this element before React
         hydrates, so the server HTML and the client tree disagree about
         className by design. Without this, that shows up as a hydration
         error in the dev overlay on every page. */
      suppressHydrationWarning
    >
      {/* Marks the document as scripted before first paint, so the scroll
          reveal can hide its rows without ever hiding them from a shopper
          whose bundle failed to load. */}
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add('js')` }}
        />
      </head>
      {/* No bg- utility here: the gradient is painted on <body> in globals.css
          so it stays fixed to the window rather than to the content. */}
      <body className="text-espresso font-body">
        <a
          href="#main"
          className="bg-espresso text-blush sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2"
        >
          Skip to the shoes
        </a>
        <SmoothScroll />
        {/* Both only ever mount on a real pointer with motion allowed. Each
            returns null otherwise, so a phone ships the markup for neither. */}
        <SiteLoader />
        <Atmosphere />
        <AnnouncementBar />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
