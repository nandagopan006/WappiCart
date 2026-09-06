import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { ProductFilters } from "@/components/admin/products/product-filters";
import { ProductRowActions } from "@/components/admin/products/product-row-actions";
import { AdminLinkButton } from "@/components/admin/ui/button";
import {
  AdminBadge,
  AdminEmptyState,
  AdminPageHeader,
  AdminPagination,
  AdminTable,
} from "@/components/admin/ui/surface";
import { requireAdmin } from "@/lib/auth";
import { listShelvesForEditing } from "@/lib/repositories/categories";
import { formatPrice, isCategoryIn, SIZE_RUN } from "@/lib/catalogue";
import {
  ADMIN_PAGE_SIZE,
  listProducts,
  type ProductStatus,
} from "@/lib/repositories/products";

/**
 * The shelf, as a table.
 *
 * Everything the editor filtered by lives in the query string, so a view can
 * be linked to — the dashboard's "3 drafts" tile points straight at
 * `?status=draft`, and this page needs to know nothing about that.
 *
 * On a phone the table becomes a stack of cards rather than a horizontally
 * scrolling grid. A row of eleven columns is not readable at 360px however
 * much it scrolls.
 */

export const metadata = { title: "Products" };

const STATUS_LABEL: Record<ProductStatus, string> = {
  published: "Published",
  draft: "Draft",
  archived: "Archived",
};

type Search = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireAdmin();

  const params = await searchParams;

  /* Read before the products so the category filter can be checked against the
     shelves that actually exist. */
  const shelves = await listShelvesForEditing();

  const categoryParam = one(params.category);
  const statusParam = one(params.status);
  const sortParam = one(params.sort);
  const pageParam = Number(one(params.page) ?? "1");

  const result = await listProducts({
    search: one(params.search),
    /* Validated rather than trusted: `?status=nonsense` would otherwise
       silently return an empty table that reads as "no products". */
    category: isCategoryIn(categoryParam, shelves) ? categoryParam : null,
    status: (["draft", "published", "archived"] as const).includes(statusParam as ProductStatus)
      ? (statusParam as ProductStatus)
      : null,
    featured: one(params.featured) === "1" ? true : null,
    isNew: one(params.isNew) === "1" ? true : null,
    sort: (["updated", "name", "price-asc", "price-desc", "shelf"] as const).includes(
      sortParam as never,
    )
      ? (sortParam as never)
      : "updated",
    page: Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1,
  });

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const v = one(value);
    if (v && key !== "page") query.set(key, v);
  }
  const buildHref = (page: number) => {
    const next = new URLSearchParams(query);
    if (page > 1) next.set("page", String(page));
    const qs = next.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  };

  const filtered = query.toString().length > 0;

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Every pair, including drafts and archived ones."
        action={
          <AdminLinkButton href="/admin/products/new" variant="primary">
            New product
          </AdminLinkButton>
        }
      />

      {/* Suspense because ProductFilters reads the query string, which would
          otherwise opt this whole route out of the streaming boundary. */}
      <Suspense fallback={<div className="border-line mb-6 h-[132px] border-b" />}>
        <ProductFilters total={result.total} shelves={shelves} />
      </Suspense>

      {result.rows.length === 0 ? (
        <AdminEmptyState
          title={filtered ? "Nothing matches" : "No products yet"}
          description={
            filtered
              ? "No pair matches those filters. Widen them, or clear them to see the whole shelf."
              : "Add the first pair, or run npm run db:seed to migrate the starting twelve."
          }
          action={
            filtered ? (
              <AdminLinkButton href="/admin/products" variant="secondary">
                Clear filters
              </AdminLinkButton>
            ) : (
              <AdminLinkButton href="/admin/products/new" variant="primary">
                New product
              </AdminLinkButton>
            )
          }
        />
      ) : (
        <>
          {/* ── Table, from md up ─────────────────────────────────────── */}
          <div className="hidden md:block">
            <AdminTable
              headers={[
                { label: "", srLabel: "Photograph" },
                { label: "Product" },
                { label: "Shelf" },
                { label: "Price" },
                { label: "Sizes" },
                { label: "Status" },
                { label: "Updated" },
                { label: "", srLabel: "Actions", className: "text-right" },
              ]}
            >
              {result.rows.map((row) => (
                <tr key={row.id}>
                  <td className="w-[52px]">
                    <Thumb src={row.image} alt="" count={row.imageCount} />
                  </td>
                  <td>
                    <Link
                      href={`/admin/products/${row.slug}`}
                      className="text-ink hover:underline"
                    >
                      {row.name}
                    </Link>
                    <div className="text-grey mt-0.5 flex items-center gap-2 text-[11px]">
                      <span>{row.sku}</span>
                      {row.featured ? <span>· Featured</span> : null}
                      {row.isNew ? <span>· New</span> : null}
                    </div>
                  </td>
                  <td className="text-grey capitalize">{row.category}</td>
                  <td className="tabular-nums">
                    {formatPrice(row.price)}
                    {row.mrp ? (
                      <span className="text-grey ml-1 line-through">{formatPrice(row.mrp)}</span>
                    ) : null}
                  </td>
                  <td>
                    <SizeDots sizes={row.sizes} />
                  </td>
                  <td>
                    <AdminBadge tone={row.status}>{STATUS_LABEL[row.status]}</AdminBadge>
                  </td>
                  <td className="text-grey text-[12px] whitespace-nowrap">
                    {formatDate(row.updatedAt)}
                  </td>
                  <td>
                    <ProductRowActions slug={row.slug} name={row.name} status={row.status} />
                  </td>
                </tr>
              ))}
            </AdminTable>
          </div>

          {/* ── Cards, below md ───────────────────────────────────────── */}
          <ul className="md:hidden">
            {result.rows.map((row) => (
              <li key={row.id} className="border-line border-b py-4">
                <div className="flex gap-3">
                  <Thumb src={row.image} alt="" count={row.imageCount} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${row.slug}`} className="text-ink text-[14px]">
                      {row.name}
                    </Link>
                    <p className="text-grey mt-0.5 text-[11px]">
                      {row.sku} · <span className="capitalize">{row.category}</span>
                    </p>
                    <p className="text-ink mt-1 text-[13px] tabular-nums">
                      {formatPrice(row.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <AdminBadge tone={row.status}>{STATUS_LABEL[row.status]}</AdminBadge>
                      <SizeDots sizes={row.sizes} />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <ProductRowActions slug={row.slug} name={row.name} status={row.status} />
                </div>
              </li>
            ))}
          </ul>

          <AdminPagination
            page={result.page}
            pageSize={ADMIN_PAGE_SIZE}
            total={result.total}
            buildHref={buildHref}
          />
        </>
      )}
    </>
  );
}

function Thumb({ src, alt, count }: { src: string | null; alt: string; count: number }) {
  if (!src) {
    return (
      <div className="bg-mist border-line text-grey flex h-13 w-13 items-center justify-center border text-[10px]">
        none
      </div>
    );
  }

  return (
    <div className="bg-mist relative h-13 w-13 shrink-0 overflow-hidden">
      <Image src={src} alt={alt} fill sizes="52px" className="object-cover" />
      {/* A published pair needs two photographs. One is a problem the editor
          should see in the list, not discover when publishing fails. */}
      {count < 2 ? (
        <span className="bg-love text-paper absolute right-0 bottom-0 px-1 text-[9px]">
          {count}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The size run at a glance.
 *
 * Every size in the shop's run is drawn; the ones in stock are filled. That
 * makes "6 and 7 only" and "everything but 11" different shapes rather than
 * two lists to read, and it never hides that a size exists.
 */
function SizeDots({ sizes }: { sizes: number[] }) {
  const stocked = new Set(sizes);

  return (
    <span className="flex items-center gap-1" aria-label={`Sizes in stock: ${sizes.join(", ") || "none"}`}>
      {SIZE_RUN.map((size) => (
        <span
          key={size}
          aria-hidden="true"
          title={`Size ${size}`}
          className={
            stocked.has(size)
              ? "bg-ink text-paper flex h-4.5 w-4.5 items-center justify-center text-[9px] tabular-nums"
              : "border-line text-grey/60 flex h-4.5 w-4.5 items-center justify-center border text-[9px] tabular-nums"
          }
        >
          {size}
        </span>
      ))}
    </span>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date);
}
