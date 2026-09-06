import type { NextConfig } from "next";

/**
 * The Supabase project's hostname, for the image allow-list below.
 *
 * Derived from the environment rather than hardcoded, so a different Supabase
 * project — a staging one, or a rebuild after a reset — needs no code change.
 * If it is unset the entry is simply omitted: uploads would not work anyway,
 * and a `remotePatterns` entry with an empty hostname matches everything,
 * which is the opposite of what an allow-list is for.
 */
const supabaseHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  /* Keep the Postgres driver out of the bundler.
     `postgres` opens raw sockets through node:net and node:tls. Webpack can
     bundle it without complaining, and the result *looks* fine — the module
     loads, a client is constructed, `select 1` is issued — and then the query
     never resolves. It surfaced as a five-minute admin page: auth returned in
     77ms and the very next database call hung forever.
     The storefront hid it, because its reads go through `unstable_cache` and
     in development were being served without touching Postgres at all.
     Listing the driver here makes Next `require` it natively instead. */
  serverExternalPackages: ["postgres"],

  /* `next dev` and `next build` both write here, so a production build taken
     while the dev server is running corrupts it — the dev server then serves a
     stale manifest and 500s. Set BUILD_DIR to send a build somewhere else:
       BUILD_DIR=.next-prod npm run build
     Unset, everything behaves exactly as before. */
  distDir: process.env.BUILD_DIR || ".next",

  images: {
    // Shoes are the content. AVIF first, WebP fallback.
    formats: ["image/avif", "image/webp"],
    // Grid thumbs (2-up mobile, 3-up desktop) and the sheet's single large image.
    imageSizes: [160, 240, 320, 420, 640],
    deviceSizes: [360, 480, 640, 828, 1080, 1240],

    /* Where a product photograph is allowed to come from.

       next/image will not fetch a host that is not named here, and the
       failure happens at render time on a page that has already been
       prerendered — the worst possible place to find out. `isAllowedImageUrl`
       in lib/validation/product.ts enforces the same list at write time, so a
       URL that would fail here is refused before it can be saved. Keep the
       two in step.

       Both entries name a path prefix rather than a wildcard: the bucket is
       public for reads, and there is no reason to let the shop's own image
       optimiser proxy arbitrary files out of the project. */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-**",
      },
      /* Admin uploads. Omitted entirely when Supabase is not configured — an
         entry with an empty hostname would match every host on the internet. */
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
