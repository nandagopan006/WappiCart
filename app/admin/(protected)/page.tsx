import Link from "next/link";

import { AdminLinkButton } from "@/components/admin/ui/button";
import { AdminBadge, AdminCard, AdminEmptyState, AdminPageHeader } from "@/components/admin/ui/surface";
import { requireAdmin } from "@/lib/auth";
import { listShelvesForEditing } from "@/lib/repositories/categories";
import { formatPrice } from "@/lib/catalogue";
import {
  countsByCategory,
  listProducts,
  productCounts,
  productsNeedingAttention,
} from "@/lib/repositories/products";

/**
 * The dashboard.
 *
 * ── Every number here is a fact ──────────────────────────────────────────
 * Counted from the database at request time. There is no revenue, no order
 * count, no conversion rate and no customer total, because this shop has no
 * datastore behind any of them — WhatsApp is the order system and no sale is
 * recorded in this codebase. A dashboard that invents those numbers teaches
 * the owner to distrust the ones that are real.
 *
 * What it shows instead is the state of the catalogue and the specific work
 * waiting: drafts to finish, and published pairs that are live but missing
 * something a shopper would notice.
 */
export default async function AdminDashboard() {
  /* Authorise BEFORE opening any query, and not only because a Server Action
     is its own endpoint.
     React renders this page concurrently with the layout above it. If the
     layout's `requireAdmin()` redirects an unauthorised visitor, this page has
     already fired its reads — and Next abandons them mid-flight. Abandoned
     queries never hand their connection back, so a handful of refused
     requests exhausts the pool and every later request hangs until the client
     gives up. One extra call is the fix; `getAdmin` is wrapped in React's
     `cache`, so it costs nothing on top of the layout's own check. */
  await requireAdmin();

  /* Sequential, not Promise.all — and this is deliberate.
     Supabase's transaction pooler multiplexes clients onto a small set of
     backends. postgres.js pipelines concurrent queries down one connection,
     and a burst of them from a single request gets the connection reset
     (ECONNRESET) rather than queued. In development that surfaced as a page
     that took five minutes and then rendered; in production as a 500.
     Each of these reads is under 200ms, so running them in order costs
     roughly half a second and removes the failure mode entirely. If this ever
     needs to be faster, the answer is fewer queries, not parallel ones. */
  const counts = await productCounts();
  const byCategory = await countsByCategory();
  /* Shelf names, so this list reads "Running shoes" rather than the slug the
     count is grouped by. Hidden shelves included — their pairs are still
     published and still counted here. */
  const shelves = await listShelvesForEditing();
  const attention = await productsNeedingAttention(6);
  const drafts = await listProducts({ status: "draft", sort: "updated", pageSize: 5, withDetails: false });

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="The state of the shelf, counted from the database."
        action={
          <AdminLinkButton href="/admin/products/new" variant="primary">
            New product
          </AdminLinkButton>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-px md:grid-cols-4">
        <Stat label="Published" value={counts.published} href="/admin/products?status=published" />
        <Stat label="Drafts" value={counts.draft} href="/admin/products?status=draft" />
        <Stat label="Archived" value={counts.archived} href="/admin/products?status=archived" />
        <Stat label="Orderable pairs" value={counts.pairs} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard title="By shelf" description="Published pairs in each category.">
          {byCategory.length === 0 ? (
            <p className="text-grey text-[13px]">Nothing published yet.</p>
          ) : (
            <ul>
              {byCategory.map(({ category, count }) => {
                const name = shelves.find((s) => s.slug === category)?.name ?? category;
                return (
                  <li
                    key={category}
                    className="border-line flex items-center justify-between border-b py-2.5 last:border-0"
                  >
                    <Link
                      href={`/admin/products?category=${category}`}
                      className="text-ink text-[13px] hover:underline"
                    >
                      {name}
                    </Link>
                    <span className="text-grey text-[13px] tabular-nums">{count}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-line mt-4 border-t pt-4">
            <div className="flex items-center justify-between py-1">
              <span className="text-grey text-[12px]">Featured on the home page</span>
              <span className="text-ink text-[13px] tabular-nums">{counts.featured}</span>
            </div>
            {/* The design system caps featured at three — more and the home
                page becomes /shop. A warning rather than a block: the rule is
                editorial, and forcing it here would mean silently un-featuring
                somebody else's product to satisfy it. */}
            {counts.featured > 3 ? (
              <p className="text-love mt-2 text-[12px]">
                {counts.featured} pairs are featured. Three is the intended maximum — beyond that the
                home page starts to read as the full catalogue.
              </p>
            ) : null}
            <div className="flex items-center justify-between py-1">
              <span className="text-grey text-[12px]">Flagged as new</span>
              <span className="text-ink text-[13px] tabular-nums">{counts.isNew}</span>
            </div>
          </div>
        </AdminCard>

        <AdminCard
          title="Needs attention"
          description="Published pairs a shopper can already see."
        >
          {attention.length === 0 ? (
            <p className="text-grey text-[13px]">
              Nothing to fix. Every published pair has its photographs and stock.
            </p>
          ) : (
            <ul>
              {attention.map((item) => (
                <li
                  key={item.slug}
                  className="border-line flex items-center justify-between gap-4 border-b py-2.5 last:border-0"
                >
                  <Link
                    href={`/admin/products/${item.slug}`}
                    className="text-ink truncate text-[13px] hover:underline"
                  >
                    {item.name}
                  </Link>
                  <span className="text-grey shrink-0 text-[12px]">{item.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <div className="mt-6">
        <AdminCard title="Unfinished drafts" description="Started, not yet on the shelf.">
          {drafts.rows.length === 0 ? (
            <AdminEmptyState
              title="No drafts"
              description="Everything you have started is published or archived."
              action={
                <AdminLinkButton href="/admin/products/new" variant="secondary">
                  Add a product
                </AdminLinkButton>
              }
            />
          ) : (
            <ul>
              {drafts.rows.map((row) => (
                <li
                  key={row.id}
                  className="border-line flex items-center justify-between gap-4 border-b py-2.5 last:border-0"
                >
                  <Link
                    href={`/admin/products/${row.slug}`}
                    className="text-ink truncate text-[13px] hover:underline"
                  >
                    {row.name}
                  </Link>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-grey text-[12px] tabular-nums">
                      {formatPrice(row.price)}
                    </span>
                    <AdminBadge tone="draft">Draft</AdminBadge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </>
  );
}

/**
 * One counted fact.
 *
 * A stat that leads somewhere is a link; one that does not is a plain block.
 * Making all four links would mean two of them go nowhere useful, which is
 * worse than an inconsistent grid.
 */
function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <>
      <p className="a-label">{label}</p>
      <p className="text-ink mt-2 text-[28px] leading-none tabular-nums">{value}</p>
    </>
  );

  if (!href) {
    return <div className="border-line border bg-paper p-4">{body}</div>;
  }

  return (
    <Link href={href} className="border-line hover:bg-mist border bg-paper p-4 transition-colors">
      {body}
    </Link>
  );
}
