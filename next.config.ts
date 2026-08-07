import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

    /* Stand-in photography. Every product image is an Unsplash CDN URL, which
       next/image will not fetch unless the host is named here. One host, one
       path prefix — not a wildcard.

       These are placeholders. When the shop photographs its own stock, the
       files go in /public/shoes, this block comes out, and nothing else
       changes: products.json is the only file that knows where an image
       lives. */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-**",
      },
    ],
  },
};

export default nextConfig;
