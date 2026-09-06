"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { ImageUploader } from "@/components/admin/products/image-uploader";
import { AdminButton, AdminSubmitButton } from "@/components/admin/ui/button";
import { AdminCheckbox, AdminInput, AdminSelect, AdminTextarea } from "@/components/admin/ui/fields";
import { AdminBadge, AdminCard } from "@/components/admin/ui/surface";
import { saveProductAction, type ActionResult } from "@/lib/actions/products";
import { formatPrice, SIZE_RUN, type Category, type Shelf } from "@/lib/catalogue";
import type { FieldErrors } from "@/lib/validation/product";

/**
 * The product editor.
 *
 * ── One form, two buttons ────────────────────────────────────────────────
 * "Save" writes whatever is there, however incomplete — a half-written pair
 * is a draft, not a mistake. "Publish" runs the full contract first: two to
 * four photographs, at least one size, every descriptive field filled in.
 * That split is what lets an editor start a product on Monday and finish it
 * on Thursday without fighting a validator.
 *
 * ── Errors are field-level and come from the server ──────────────────────
 * The action returns a map of field name to message, and each control renders
 * its own. A form that reports "something went wrong" for a duplicate SKU
 * makes the editor hunt; this one puts the sentence under the SKU box.
 *
 * ── Why the whole draft is one state object ──────────────────────────────
 * It is submitted as a single value and validated as a single value, so
 * holding it as one keeps the form and the schema the same shape. Twenty
 * `useState` calls would be twenty chances for the payload to drift from what
 * `productDraftSchema` expects.
 */

export type ProductFormValue = {
  slug: string;
  name: string;
  categorySlug: Category;
  price: number | "";
  mrp: number | "" | null;
  colour: string;
  material: string;
  fitNote: string | null;
  description: string;
  care: string;
  sku: string;
  featured: boolean;
  isNew: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageUrl: string | null;
  images: { id?: string; url: string; alt: string; storagePath?: string | null }[];
  sizes: number[];
};

/**
 * A blank pair.
 *
 * `categorySlug` is empty rather than a shelf name: shelves are rows now, and
 * this file cannot know which ones exist. The form fills it from the shelves
 * it is given — see the `useState` initialiser below.
 *
 * Never spread this in a Server Component. It is exported from a "use client"
 * module, so the server sees a client reference rather than the object, and
 * `{ ...EMPTY_PRODUCT }` there yields a value whose fields are all undefined.
 * Pass it through as a prop and let the client read it.
 */
export const EMPTY_PRODUCT: ProductFormValue = {
  slug: "",
  name: "",
  categorySlug: "",
  price: "",
  mrp: "",
  colour: "",
  material: "",
  fitNote: "",
  description: "",
  care: "",
  sku: "",
  featured: false,
  isNew: false,
  seoTitle: "",
  seoDescription: "",
  seoImageUrl: "",
  images: [],
  sizes: [],
};

/** "Oxford Cap-Toe Black" → "oxford-cap-toe-black" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({
  initial,
  shelves,
  productId,
  status,
}: {
  initial: ProductFormValue;
  /* The shelves this pair can sit on, sent from the server. Hidden shelves are
     included: a draft can be written against a shelf that is not live yet, and
     dropping one from the list would silently re-shelve the pair on save. */
  shelves: Shelf[];
  productId?: string;
  status?: "draft" | "published" | "archived";
}) {
  const router = useRouter();

  /* The shelf is resolved here rather than by the caller, because `initial`
     may be EMPTY_PRODUCT — which carries no shelf — and because a pair whose
     shelf has since been deleted should land on a real one rather than on a
     select showing nothing. */
  const [value, setValue] = useState<ProductFormValue>(() => ({
    ...initial,
    categorySlug: shelves.some((s) => s.slug === initial.categorySlug)
      ? initial.categorySlug
      : (shelves[0]?.slug ?? ""),
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  /* A new product's slug follows its name until the editor touches the slug
     themselves. Editing an existing one never does: the slug is a live URL
     and renaming a shoe must not silently move its page. */
  const [slugLocked, setSlugLocked] = useState(Boolean(productId));

  const set = useCallback(<K extends keyof ProductFormValue>(key: K, v: ProductFormValue[K]) => {
    setValue((prev) => ({ ...prev, [key]: v }));
  }, []);

  const submit = (publish: boolean) => {
    setBanner(null);
    setErrors({});

    const payload = {
      ...value,
      price: value.price === "" ? Number.NaN : Number(value.price),
      mrp: value.mrp === "" || value.mrp === null ? null : Number(value.mrp),
      fitNote: value.fitNote || null,
      seoTitle: value.seoTitle || null,
      seoDescription: value.seoDescription || null,
      seoImageUrl: value.seoImageUrl || null,
    };

    startTransition(async () => {
      const result: ActionResult = await saveProductAction(payload, { id: productId, publish });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setBanner({ tone: "bad", text: result.error });
        /* Bring the first problem into view — on a form this long the message
           is often below the fold. */
        requestAnimationFrame(() => {
          document.querySelector('[aria-invalid="true"]')?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });
        return;
      }

      setBanner({ tone: "ok", text: result.message });

      if (!productId) {
        router.replace(`/admin/products/${result.slug}`);
        return;
      }
      if (result.slug !== value.slug) router.replace(`/admin/products/${result.slug}`);
      router.refresh();
    });
  };

  const toggleSize = (size: number) =>
    set(
      "sizes",
      value.sizes.includes(size) ? value.sizes.filter((s) => s !== size) : [...value.sizes, size].sort((a, b) => a - b),
    );

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= value.images.length) return;
    const next = [...value.images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    set("images", next);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      noValidate
    >
      {banner ? (
        <p
          role="status"
          className={
            banner.tone === "ok"
              ? "border-line bg-mist text-ink mb-6 border px-4 py-3 text-[13px]"
              : "border-love/40 text-love mb-6 border px-4 py-3 text-[13px]"
          }
        >
          {banner.text}
        </p>
      ) : null}

      {errors._form ? (
        <p role="alert" className="border-love/40 text-love mb-6 border px-4 py-3 text-[13px]">
          {errors._form}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminCard title="Basic information">
            <AdminInput
              label="Name"
              name="name"
              required
              value={value.name}
              error={errors.name}
              onChange={(e) => {
                const name = e.target.value;
                setValue((prev) => ({
                  ...prev,
                  name,
                  slug: slugLocked ? prev.slug : slugify(name),
                }));
              }}
            />

            <AdminInput
              label="Slug"
              name="slug"
              required
              value={value.slug}
              error={errors.slug}
              hint={
                productId
                  ? "This is the product's live web address. Changing it breaks links already shared."
                  : "Lowercase letters, numbers and dashes. Becomes /p/your-slug"
              }
              onChange={(e) => {
                setSlugLocked(true);
                set("slug", e.target.value);
              }}
            />

            <div className="grid gap-x-4 sm:grid-cols-2">
              <AdminInput
                label="SKU"
                name="sku"
                required
                value={value.sku}
                error={errors.sku}
                hint="Goes into the WhatsApp order message."
                onChange={(e) => set("sku", e.target.value)}
              />

              <AdminSelect
                label="Shelf"
                name="categorySlug"
                required
                value={value.categorySlug}
                error={errors.categorySlug}
                onChange={(e) => set("categorySlug", e.target.value as Category)}
                options={shelves.map((shelf) => ({ value: shelf.slug, label: shelf.name }))}
              />
            </div>
          </AdminCard>

          <AdminCard title="Pricing" className="mt-6">
            <div className="grid gap-x-4 sm:grid-cols-2">
              <AdminInput
                label="Price (₹)"
                name="price"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                value={value.price}
                error={errors.price}
                hint="Whole rupees. The shop does not show paise."
                onChange={(e) => set("price", e.target.value === "" ? "" : Number(e.target.value))}
              />

              <AdminInput
                label="MRP (₹)"
                name="mrp"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={value.mrp ?? ""}
                error={errors.mrp}
                hint="Optional. Shown struck through, so it must be higher than the price."
                onChange={(e) => set("mrp", e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>

            {typeof value.price === "number" && value.price > 0 ? (
              <p className="text-grey text-[12px]">
                Shoppers see {formatPrice(value.price)}
                {typeof value.mrp === "number" && value.mrp > value.price
                  ? ` with ${formatPrice(value.mrp)} struck through.`
                  : "."}
              </p>
            ) : null}
          </AdminCard>

          <ImagesCard
            images={value.images}
            error={errors.images}
            fieldErrors={errors}
            productRef={value.slug || "unassigned"}
            onChange={(images) => set("images", images)}
            onMove={moveImage}
          />

          <AdminCard title="Product details" className="mt-6">
            <div className="grid gap-x-4 sm:grid-cols-2">
              <AdminInput
                label="Colour"
                name="colour"
                value={value.colour}
                error={errors.colour}
                hint="One or two words, matching the photograph."
                onChange={(e) => set("colour", e.target.value)}
              />
              <AdminInput
                label="Fit note"
                name="fitNote"
                value={value.fitNote ?? ""}
                error={errors.fitNote}
                hint="Optional. e.g. Runs half a size small."
                onChange={(e) => set("fitNote", e.target.value)}
              />
            </div>

            <AdminInput
              label="Material"
              name="material"
              value={value.material}
              error={errors.material}
              hint="What the shopper asks about first."
              onChange={(e) => set("material", e.target.value)}
            />

            <AdminTextarea
              label="Description"
              name="description"
              rows={4}
              value={value.description}
              error={errors.description}
              hint="Two or three short sentences: what it is made of, what it is for, and one honest thing about wearing it."
              onChange={(e) => set("description", e.target.value)}
            />

            <AdminTextarea
              label="Care"
              name="care"
              rows={2}
              value={value.care}
              error={errors.care}
              hint="One or two plain sentences. Practical only."
              onChange={(e) => set("care", e.target.value)}
            />
          </AdminCard>

          <AdminCard title="Search and sharing" description="Optional. Leave blank to use the product's own name and description." className="mt-6">
            <AdminInput
              label="SEO title"
              name="seoTitle"
              value={value.seoTitle ?? ""}
              error={errors.seoTitle}
              onChange={(e) => set("seoTitle", e.target.value)}
            />
            <AdminTextarea
              label="SEO description"
              name="seoDescription"
              rows={2}
              value={value.seoDescription ?? ""}
              error={errors.seoDescription}
              onChange={(e) => set("seoDescription", e.target.value)}
            />
          </AdminCard>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <AdminCard title="Publishing">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-grey text-[12px]">Status</span>
              <AdminBadge tone={status ?? "draft"}>
                {status ? status[0].toUpperCase() + status.slice(1) : "Not saved"}
              </AdminBadge>
            </div>

            <div className="flex flex-col gap-2">
              <AdminSubmitButton pending={isPending} variant="secondary">
                {productId ? "Save changes" : "Save draft"}
              </AdminSubmitButton>

              {status !== "published" ? (
                <AdminButton
                  type="button"
                  variant="primary"
                  disabled={isPending}
                  onClick={() => submit(true)}
                >
                  {isPending ? "Publishing…" : "Publish"}
                </AdminButton>
              ) : null}

              {productId && status === "published" ? (
                <Link
                  href={`/p/${value.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="a-btn"
                  data-variant="secondary"
                >
                  View on the shop ↗
                </Link>
              ) : null}
            </div>

            <p className="text-grey mt-4 text-[12px] leading-relaxed">
              Publishing needs 2–4 photographs, at least one size in stock, and every detail filled
              in. Saving does not.
            </p>
          </AdminCard>

          <AdminCard title="Availability" className="mt-6">
            <p className="a-label mb-3">Sizes in stock</p>
            <div className="flex flex-wrap gap-2">
              {SIZE_RUN.map((size) => {
                const on = value.sizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleSize(size)}
                    className="a-btn"
                    data-variant={on ? "primary" : "secondary"}
                    style={{ width: 44, padding: 0 }}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
            {errors.sizes ? (
              <span className="a-error" role="alert">
                {errors.sizes}
              </span>
            ) : (
              <span className="a-hint">
                {value.sizes.length === 0
                  ? "No sizes selected — nothing a shopper could order."
                  : `${value.sizes.length} of ${SIZE_RUN.length} sizes available.`}
              </span>
            )}
          </AdminCard>

          <AdminCard title="Merchandising" className="mt-6">
            <AdminCheckbox
              label="Featured"
              name="featured"
              checked={value.featured}
              onChange={(e) => set("featured", e.target.checked)}
              hint="Surfaces on the home page. Three is the intended maximum."
            />
            <AdminCheckbox
              label="New arrival"
              name="isNew"
              checked={value.isNew}
              onChange={(e) => set("isNew", e.target.checked)}
              hint="Renders a small 'new' label and leads the New in section."
            />
          </AdminCard>
        </div>
      </div>
    </form>
  );
}

/**
 * The photographs.
 *
 * Order is the array's order and position 0 is the primary — the strict side
 * profile the grid, the hero and the OG card all use. There is no separate
 * "primary" toggle, because two sources of truth for which photograph is the
 * main one is exactly how `images[0]` and a stored `image` field drift apart.
 *
 * Uploading is not here yet — this edits the URLs and alt text a product
 * already has, and reorders them. The upload button arrives with the media
 * library.
 */
function ImagesCard({
  images,
  error,
  fieldErrors,
  productRef,
  onChange,
  onMove,
}: {
  images: ProductFormValue["images"];
  error?: string;
  fieldErrors: FieldErrors;
  productRef: string;
  onChange: (images: ProductFormValue["images"]) => void;
  onMove: (from: number, to: number) => void;
}) {
  const update = (index: number, patch: Partial<ProductFormValue["images"][number]>) => {
    onChange(images.map((image, i) => (i === index ? { ...image, ...patch } : image)));
  };

  return (
    <AdminCard
      title="Photographs"
      description="Two to four views. The first is the side profile used everywhere else."
      className="mt-6"
    >
      {error ? (
        <p role="alert" className="a-error mb-4">
          {error}
        </p>
      ) : null}

      {images.length < 4 ? (
        <div className="mb-4">
          <ImageUploader
            productRef={productRef}
            onUploaded={({ url, storagePath }) =>
              /* Alt starts empty on purpose. It is required to publish, and a
                 placeholder like "Product image" would satisfy the length
                 check while telling a screen reader nothing. */
              onChange([...images, { url, alt: "", storagePath }])
            }
          />
        </div>
      ) : (
        <p className="text-grey mb-4 text-[12px]">
          Four views is the maximum. Remove one to add another.
        </p>
      )}

      {images.length === 0 ? (
        <p className="text-grey text-[13px]">
          No photographs yet. A published pair needs at least two.
        </p>
      ) : (
        <ul>
          {/* Keyed by the image itself, never by position. This list
              reorders: with an index key, moving a photograph up would leave
              React reusing the same inputs in place, so the alt text you
              typed would stay behind while the picture above it moved. The
              stored path is unique per upload; `url` covers the placeholders,
              which have no path of their own. */}
          {images.map((image, index) => (
            <li
              key={image.storagePath ?? image.id ?? image.url ?? index}
              className="border-line border-b py-4 last:border-0 first:pt-0"
            >
              <div className="flex gap-4">
                <div className="bg-mist relative h-20 w-20 shrink-0 overflow-hidden">
                  {image.url ? (
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                  {index === 0 ? (
                    <span className="bg-ink text-paper absolute bottom-0 left-0 px-1 text-[9px] tracking-[0.08em] uppercase">
                      Main
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="a-label mb-2">
                    View {index + 1}
                    {index === 0 ? " — the side profile used everywhere else" : ""}
                  </p>
                  {/* The URL is shown, not edited. It is either an upload this
                      shop owns or a placeholder it does not, and letting an
                      editor paste an arbitrary host would produce an image
                      that fails at render time on an already-prerendered
                      page. Replace a photograph by removing it and uploading
                      another. */}
                  <p className="text-grey mb-4 truncate text-[11px]" title={image.url}>
                    {image.storagePath ? "Uploaded" : "Placeholder"} · {image.url}
                  </p>
                  {fieldErrors[`images.${index}.url`] ? (
                    <p role="alert" className="a-error mb-2">
                      {fieldErrors[`images.${index}.url`]}
                    </p>
                  ) : null}
                  <AdminInput
                    label="Alt text"
                    name={`images.${index}.alt`}
                    value={image.alt}
                    error={fieldErrors[`images.${index}.alt`]}
                    hint="Describe the shoe — colour, material, angle. At least 20 characters."
                    onChange={(e) => update(index, { alt: e.target.value })}
                  />

                  <div className="flex gap-1">
                    <AdminButton
                      type="button"
                      variant="quiet"
                      disabled={index === 0}
                      onClick={() => onMove(index, index - 1)}
                    >
                      ↑ Up
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="quiet"
                      disabled={index === images.length - 1}
                      onClick={() => onMove(index, index + 1)}
                    >
                      ↓ Down
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="quiet"
                      onClick={() => onChange(images.filter((_, i) => i !== index))}
                    >
                      Remove
                    </AdminButton>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}
