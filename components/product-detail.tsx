"use client";

import Image from "next/image";
import { useState } from "react";

import { OrderButton } from "@/components/order-button";
import { Price } from "@/components/price";
import { SizeRun } from "@/components/size-run";
import type { Product } from "@/lib/catalogue";
import type { ShopContact } from "@/lib/whatsapp";

/**
 * The product sheet. Photographs on the left, the decision on the right.
 *
 * Two columns from lg up and one below it, which is the layout every shop on
 * the internet uses for a reason: the shopper scrolls the photographs with
 * their thumb and the size run stays where they left it.
 */
export function ProductDetail({
  product,
  categoryLabel,
  shop,
  headingLevel = "h1",
  imagePriority = false,
}: {
  product: Product;
  /* The shelf's name. Passed in rather than taken from `product.category`,
     which is the slug — shelves are rows the admin names now, and a slug reads
     as "running-shoes" above the product's own name. */
  categoryLabel: string;
  /* Only here to reach OrderButton — see the note there. */
  shop: ShopContact;
  headingLevel?: "h1" | "h2";
  imagePriority?: boolean;
}) {
  const [size, setSize] = useState<number | null>(null);
  const Heading = headingLevel;

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      {/* Every view of the pair, stacked. No thumbnails and no carousel — with
          two to four photographs, scrolling is faster than any control we
          could put under them. */}
      <div className="flex flex-col gap-3">
        {product.images.map((src, i) => (
          <div key={src} className="bg-mist relative aspect-square overflow-hidden">
            <Image
              src={src}
              alt={i === 0 ? product.alt : ""}
              fill
              priority={imagePriority && i === 0}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Sticks beside the photographs on a wide screen, so the size run and
          the order button stay reachable however far the images run. */}
      <div className="lg:sticky lg:top-32 lg:self-start">
        <p className="text-caption text-grey uppercase">{categoryLabel}</p>
        <Heading className="text-title text-ink mt-2 font-medium">{product.name}</Heading>
        <Price price={product.price} mrp={product.mrp} className="mt-3 block" />

        {/* What it is, what it is for, and one honest thing about wearing it. */}
        <p className="text-body text-grey mt-6">{product.description}</p>

        <div className="mt-8">
          <p className="text-caption text-grey mb-2 uppercase">Size</p>
          <SizeRun
            inStock={product.sizes}
            selected={size}
            onSelect={setSize}
            label={`Size for ${product.name}`}
          />
          {/* Sits with the size run, because that is the decision it affects. */}
          {product.fitNote ? <p className="text-body text-grey mt-3">{product.fitNote}</p> : null}
        </div>

        <OrderButton product={product} size={size} shop={shop} className="mt-6" />

        {/* The specifics sit below the button. Nothing here should delay the
            shopper who has already decided. */}
        <dl className="border-line mt-10 border-t">
          <Spec label="Colour" value={product.colour} />
          <Spec label="Material" value={product.material} />
          <Spec label="Care" value={product.care} />
          <Spec label="SKU" value={product.sku} />
        </dl>
      </div>
    </div>
  );
}

/** One row per fact, hairline between. */
function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line grid grid-cols-[6.5rem_1fr] gap-x-4 border-b py-3">
      <dt className="text-caption text-grey pt-0.5 uppercase">{label}</dt>
      <dd className="text-body">{value}</dd>
    </div>
  );
}
