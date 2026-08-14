import Link from "next/link";

import { buildChatLink } from "@/lib/whatsapp";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-[48ch] px-4 py-24 text-center">
      <h1 className="text-title text-ink font-medium">That pair is not here.</h1>
      <p className="text-body text-grey mt-4">
        The link may be old, or the pair may have sold out and come off the shelf.
      </p>
      <div className="text-caption mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 uppercase">
        <Link href="/shop" className="link-quiet text-ink">
          See what is in stock
        </Link>
        <a
          href={buildChatLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="link-quiet text-grey hover:text-ink"
        >
          Ask us on WhatsApp
        </a>
      </div>
    </section>
  );
}
