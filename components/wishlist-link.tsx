"use client";

import Link from "next/link";

import { useWishlistCount } from "@/lib/wishlist";

/**
 * The way into the saved pairs, in the header's right cluster.
 *
 * Its own client component so `SiteHeader` can stay a Server Component — the
 * count is the only thing on that bar that needs the browser, and converting
 * the whole header to hold one number would ship the wordmark, the nav and
 * the order link to the client for nothing.
 *
 * The count renders only once there is something to count. A permanent `(0)`
 * beside every other label is a badge advertising an empty room.
 *
 * `useWishlistCount` returns 0 on the server, so first paint is the bare word
 * and the number appears on hydration — no markup mismatch.
 */
export function WishlistLink() {
  const count = useWishlistCount();

  return (
    <Link href="/wishlist" className="link-quiet text-grey hover:text-ink">
      Saved
      {count > 0 ? (
        <>
          {" "}
          <span className="text-ink tabular-nums">{count}</span>
          <span className="sr-only"> pairs saved</span>
        </>
      ) : null}
    </Link>
  );
}
