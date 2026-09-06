import Link from "next/link";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPagination,
  AdminTable,
} from "@/components/admin/ui/surface";
import { listActivity } from "@/lib/activity";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Activity" };

const PAGE_SIZE = 40;

/**
 * A record of every change made in the admin, newest first.
 *
 * Read-only on purpose. An audit trail you can edit is not an audit trail,
 * so there is no delete button and no filter that could hide an entry.
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();

  const { page: pageParam } = await searchParams;
  const requested = Number(pageParam ?? "1");
  const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;

  /* One row more than the page needs, purely to find out whether a next page
     exists. Cheaper than a second COUNT query over a table that only grows. */
  const rows = await listActivity(PAGE_SIZE + 1, (page - 1) * PAGE_SIZE);
  const hasMore = rows.length > PAGE_SIZE;
  const entries = rows.slice(0, PAGE_SIZE);

  return (
    <>
      <AdminPageHeader
        title="Activity"
        description="Everything changed in the admin, newest first."
      />

      {entries.length === 0 ? (
        <AdminEmptyState
          title={page > 1 ? "Nothing on this page" : "No activity yet"}
          description={
            page > 1
              ? "You have reached the end of the log."
              : "Changes you make in the admin — saving a product, editing the home page, uploading a photo — appear here."
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <AdminTable
              headers={[
                { label: "What" },
                { label: "Which" },
                { label: "Who" },
                { label: "When" },
              ]}
            >
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="text-ink">{entry.actionLabel}</td>
                  <td>
                    <EntityCell
                      type={entry.entityType}
                      label={entry.entityLabel}
                      slug={slugOf(entry.metadata)}
                    />
                  </td>
                  <td className="text-grey">{entry.adminName ?? "—"}</td>
                  <td className="text-grey whitespace-nowrap">{formatWhen(entry.createdAt)}</td>
                </tr>
              ))}
            </AdminTable>
          </div>

          {/* Four columns do not fit at 360px, so below md each entry becomes
              a small stacked block instead of a row that scrolls sideways. */}
          <ul className="md:hidden">
            {entries.map((entry) => (
              <li key={entry.id} className="border-line border-b py-3">
                <p className="text-ink text-[13px]">{entry.actionLabel}</p>
                <p className="text-grey mt-1 text-[12px]">
                  <EntityCell
                    type={entry.entityType}
                    label={entry.entityLabel}
                    slug={slugOf(entry.metadata)}
                  />
                </p>
                <p className="text-grey mt-1 text-[11px]">
                  {entry.adminName ?? "—"} · {formatWhen(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>

          <AdminPagination
            page={page}
            pageSize={PAGE_SIZE}
            /* The exact total is not worth a COUNT over a table that only
               grows. This is enough for the control to know where it is and
               whether Next should be live. */
            total={(page - 1) * PAGE_SIZE + entries.length + (hasMore ? 1 : 0)}
            buildHref={(p) => (p > 1 ? `/admin/activity?page=${p}` : "/admin/activity")}
          />
        </>
      )}
    </>
  );
}

/**
 * The thing that was changed.
 *
 * Product entries link to their editor when the log recorded a slug. Older
 * entries and non-product ones render as plain text — a link that guesses at
 * a URL is worse than no link.
 */
function EntityCell({
  type,
  label,
  slug,
}: {
  type: string;
  label: string | null;
  slug: string | null;
}) {
  if (!label) return <span className="text-grey">—</span>;

  if (type === "product" && slug) {
    return (
      <Link href={`/admin/products/${slug}`} className="text-ink hover:underline">
        {label}
      </Link>
    );
  }

  return <span className="text-ink">{label}</span>;
}

/** Pulls the slug out of a log entry's metadata, if it recorded one. */
function slugOf(metadata: Record<string, unknown>): string | null {
  const slug = metadata.slug;
  return typeof slug === "string" && /^[a-z0-9-]+$/.test(slug) ? slug : null;
}

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
