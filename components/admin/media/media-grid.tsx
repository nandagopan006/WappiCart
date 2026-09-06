"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminButton } from "@/components/admin/ui/button";
import { AdminDialog } from "@/components/admin/ui/dialog";
import { AdminBadge } from "@/components/admin/ui/surface";
import { deleteStoredImageAction } from "@/lib/actions/media";
import type { MediaItem } from "@/lib/repositories/media";

/**
 * The uploaded files, with what each one is used by.
 *
 * ── Usage is the point ───────────────────────────────────────────────────
 * A media library that only shows thumbnails invites somebody to tidy up and
 * take a live product's photograph with them. Every tile says which products
 * reference it, and delete is only offered on the ones nothing references —
 * the server refuses the rest anyway, but offering a button that always fails
 * is its own kind of rude.
 */
export function MediaGrid({ items }: { items: MediaItem[] }) {
  const router = useRouter();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "unused">("all");

  const shown = filter === "unused" ? items.filter((i) => i.usedBy.length === 0) : items;
  const unusedCount = items.filter((i) => i.usedBy.length === 0).length;

  const confirmDelete = (path: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteStoredImageAction(path);
      setPendingPath(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const target = items.find((i) => i.storagePath === pendingPath);

  return (
    <>
      <div className="border-line mb-6 flex flex-wrap items-center gap-3 border-b pb-4">
        <AdminButton
          type="button"
          variant={filter === "all" ? "primary" : "secondary"}
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
        >
          All ({items.length})
        </AdminButton>
        <AdminButton
          type="button"
          variant={filter === "unused" ? "primary" : "secondary"}
          onClick={() => setFilter("unused")}
          aria-pressed={filter === "unused"}
        >
          Unused ({unusedCount})
        </AdminButton>

        <p className="text-grey ml-auto text-[12px]">
          Uploaded photographs. Files a product still uses cannot be deleted.
        </p>
      </div>

      {error ? (
        <p role="alert" className="border-love/40 text-love mb-6 border px-4 py-3 text-[13px]">
          {error}
        </p>
      ) : null}

      {shown.length === 0 ? (
        <div className="border-line border border-dashed px-6 py-14 text-center">
          <p className="text-ink text-[13px] tracking-[0.08em] uppercase">
            {filter === "unused" ? "Nothing unused" : "No uploads yet"}
          </p>
          <p className="text-grey mx-auto mt-3 max-w-md text-[13px]">
            {filter === "unused"
              ? "Every uploaded file is in use by a product."
              : "Photographs uploaded from a product's editor appear here. The starting twelve use placeholder images, which this shop does not own and cannot manage."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((item) => (
            <li key={item.storagePath} className="border-line border">
              <div className="bg-mist relative aspect-square">
                <Image
                  src={item.url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                />
              </div>

              <div className="p-3">
                {item.usedBy.length === 0 ? (
                  <AdminBadge tone="draft">Unused</AdminBadge>
                ) : (
                  <AdminBadge tone="published">In use</AdminBadge>
                )}

                <p className="text-grey mt-2 text-[11px] leading-relaxed">
                  {item.usedBy.length === 0 ? (
                    "No product references this file."
                  ) : (
                    <>Used by {item.usedBy.join(", ")}</>
                  )}
                </p>

                <p className="text-grey mt-1 text-[11px] tabular-nums">
                  {item.bytes ? `${Math.round(item.bytes / 1024)} KB` : "—"}
                </p>

                <div className="mt-3 flex gap-1">
                  <Link
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="a-btn"
                    data-variant="quiet"
                  >
                    Open ↗
                  </Link>
                  {item.usedBy.length === 0 ? (
                    <AdminButton
                      type="button"
                      variant="quiet"
                      disabled={isPending}
                      onClick={() => setPendingPath(item.storagePath)}
                    >
                      Delete
                    </AdminButton>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdminDialog
        open={Boolean(target)}
        title="Delete this file?"
        description={
          <>
            The file is removed from storage permanently and cannot be recovered. Nothing currently
            references it, so no product page will change.
          </>
        }
        confirmLabel="Delete permanently"
        destructive
        pending={isPending}
        onConfirm={() => target && confirmDelete(target.storagePath)}
        onCancel={() => setPendingPath(null)}
      />
    </>
  );
}
