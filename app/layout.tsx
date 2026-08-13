import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { palette } from "@/lib/palette";
import { shop } from "@/lib/shop";

import "./globals.css";

/* One family, three weights, latin only.
   A retail catalogue is led by its photographs — a second display face would
   only compete with them. */
const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-jost",
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
     allowed to hold literals. */
  themeColor: palette.paper,
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jost.variable}>
      <body className="bg-paper text-ink font-sans">
        <a
          href="#main"
          className="bg-ink text-paper sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2"
        >
          Skip to the shoes
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
