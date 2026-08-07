import Link from "next/link";

import { Wave } from "@/components/wave";
import { buildChatLink } from "@/lib/whatsapp";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-[48ch] px-5 pt-16 pb-24">
      <h1 className="type-heading text-h2">That pair is not here.</h1>
      <Wave className="mt-8" />
      <p className="text-body mt-8">
        The link may be old, or the pair may have sold out and come off the shelf.
      </p>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/shop" className="text-body decoration-muted/30 hover:decoration-espresso underline underline-offset-4">
          See what is in stock
        </Link>
        <a
          href={buildChatLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-body decoration-muted/30 hover:decoration-espresso underline underline-offset-4"
        >
          Ask us on WhatsApp
        </a>
      </div>
    </section>
  );
}
