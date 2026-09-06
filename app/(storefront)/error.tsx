"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * What a shopper sees when a page fails.
 *
 * Without this file, Next shows its own screen — in production a bare
 * "Application error: a server-side exception has occurred", which tells a
 * shopper nothing and makes the shop look abandoned.
 *
 * The realistic cause is the database being briefly unreachable. So this says
 * what happened in plain words, offers the two things that might still work
 * (try again, or message the shop), and does not pretend to be a shoe page.
 *
 * The real error goes to the server log via `console.error`. It is never put
 * on screen: an error message can carry a query, a table name, or a file path,
 * and none of that is a shopper's business.
 */
export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[storefront]", error);
  }, [error]);

  return (
    <section className="max-w-page mx-auto px-4 py-section text-center md:px-8">
      <h1 className="text-title text-ink uppercase">Something went wrong</h1>

      <p className="text-body text-grey mx-auto mt-4 max-w-prose">
        This page could not be loaded just now. It is usually temporary — try again in a moment.
      </p>

      <div className="text-caption mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 uppercase">
        <button type="button" onClick={reset} className="link-quiet text-ink">
          Try again
        </button>
        <Link href="/" className="link-quiet text-grey hover:text-ink">
          Back to the shop
        </Link>
      </div>

      {/* Next stamps a short id on production errors. Quoting it lets the shop
          find this exact failure in the logs, and it gives away nothing. */}
      {error.digest ? (
        <p className="text-caption text-grey mt-8">Reference {error.digest}</p>
      ) : null}
    </section>
  );
}
