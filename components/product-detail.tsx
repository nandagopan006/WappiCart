"use client";

import Image from "next/image";
import { useState } from "react";

import { OrderButton } from "@/components/order-button";
import { Price } from "@/components/price";
import { Wave } from "@/components/wave";
import { SizeRun } from "@/components/size-run";
import type { Product } from "@/lib/products";

/**
 * The product sheet body. Shared by the full route and the overlay, so the
 * shopper sees the same thing whether they tapped through or opened a
 * forwarded link.
 */
export function ProductDetail({
  product,
  headingLevel = "h1",
  imagePriority = false,
}: {
  product: Product;
  headingLevel?: "h1" | "h2";
  imagePriority?: boolean;
}) {
  const [size, setSize] = useState<number | null>(null);
  const Heading = headingLevel;

  return (
    <div>
      <div className="relative aspect-4/3 overflow-hidden">
        <Image
          src={product.image}
          alt={product.alt}
          fill
          priority={imagePriority}
          sizes="(min-width: 1024px) 520px, 100vw"
          className="object-cover"
        />
      </div>

      <Wave />

      <div className="pt-6">
        <p className="font-mono text-utility text-muted uppercase">{product.category}</p>
        <Heading className="type-heading text-h2 mt-2">{product.name}</Heading>
        <Price price={product.price} mrp={product.mrp} className="mt-3 block" />

        {/* What it is, what it is for, and one honest thing about wearing it. */}
        <p className="text-body mt-6">{product.description}</p>

        <div className="mt-8">
          <p className="font-mono text-utility text-muted mb-1 uppercase">Size</p>
          <SizeRun inStock={product.sizes} selected={size} onSelect={setSize} label={`Size for ${product.name}`} />
          {/* Sits with the size run, because that is the decision it affects. */}
          {product.fitNote ? <p className="text-body text-muted mt-2">{product.fitNote}</p> : null}
        </div>

        <OrderButton product={product} size={size} className="mt-6" />

        {/* The specifics sit below the button. Nothing here should delay the
            shopper who has already decided. */}
        <Wave className="mt-10" />

        <dl className="mt-6 space-y-4">
          <Spec label="Colour" value={product.colour} />
          <Spec label="Material" value={product.material} />
          <Spec label="Care" value={product.care} />
          <Spec label="SKU" value={product.sku} mono />
        </dl>
      </div>
    </div>
  );
}

/** Label in mono, value in body. The SKU is a number, so it stays mono too. */
function Spec({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-x-4">
      <dt className="font-mono text-utility text-muted pt-1 uppercase">{label}</dt>
      <dd className={mono ? "font-mono text-utility pt-1 uppercase" : "text-body"}>{value}</dd>
    </div>
  );
}
