import type { Metadata } from "next";
import type { ReactNode } from "react";

import { BrandIntro } from "@/components/brand-intro";
import { MobileNav } from "@/components/mobile-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SmoothScroll } from "@/components/smooth-scroll";
import { getShopSettings } from "@/lib/shop";

/**
 * The shop.
 *
 * Everything that makes a page feel like WappiCart lives here rather than in
 * the root layout, so that `/admin` — which shares the document but not the
 * shop — is not wrapped in a storefront it has no use for. The header, the
 * footer, the mobile dock, Lenis and the first-visit brand intro all stop at
 * this boundary.
 *
 * ── Metadata reads the database now ─────────────────────────────────────
 * `generateMetadata` rather than a static `metadata` export, because the shop
 * name, tagline and description are editable in the admin. Everything it
 * needs is one cached read, shared with every other caller in the same
 * render.
 */

export async function generateMetadata(): Promise<Metadata> {
  const { shop, seo } = await getShopSettings();

  return {
    metadataBase: new URL(shop.url),
    title: {
      default: seo.siteTitle || `${shop.name} — ${shop.tagline}`,
      template: `%s · ${shop.name}`,
    },
    description: seo.metaDescription,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: shop.name,
      title: seo.ogTitle || seo.siteTitle,
      description: seo.ogDescription || seo.metaDescription,
      url: shop.url,
      ...(seo.ogImageUrl ? { images: [seo.ogImageUrl] } : {}),
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const { shop } = await getShopSettings();

  return (
    <>
      <a
        href="#main"
        className="bg-ink text-paper sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2"
      >
        Skip to the shoes
      </a>
      {/* First visit only. Lives in the layout so it cannot replay when the
          shopper moves between routes — the layout never remounts. */}
      <BrandIntro name={shop.name} />
      <SmoothScroll />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      {/* Last in the document so its spacer lands below the footer, and so
          the fixed bar sits above everything without a z-index race. */}
      <MobileNav shop={shop} />
    </>
  );
}
