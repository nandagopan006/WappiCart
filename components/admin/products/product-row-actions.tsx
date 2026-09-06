"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminDialog } from "@/components/admin/ui/dialog";
import {
  archiveProductAction,
  deleteProductAction,
  duplicateProductAction,
  publishProductAction,
  restoreProductAction,
  unpublishProductAction,
  type ActionResult,
} from "@/lib/actions/products";
import type { ProductStatus } from "@/lib/repositories/products";

/**
 * The per-row controls.
 *
 * ── Which action is offered depends on the state ─────────────────────────
 * A draft can be published; a published pair can be unpublished or archived;
 * an archived pair can be restored or deleted for good. Showing all of them
 * and disabling most would be a row of dead controls, which is harder to read
 * than a short list of live ones.
 *
 * ── Delete only exists on an archived pair ───────────────────────────────
 * There is no delete on a live or draft product, and that is deliberate rather
 * than an omission: a `/p/<slug>` address may be sitting in a WhatsApp chat.
 * Archiving keeps the row so that link resolves to a proper "not found";
 * deleting is the separate, later decision once nobody is still holding it.
 * The two steps are what stop one click removing a shoe somebody is looking
 * at.
 *
 * ── Nothing destructive happens on a single click ────────────────────────
 * Archive and unpublish both take the pair off the shop, so both go through
 * the dialog and both say exactly what will happen. Publish and duplicate are
 * additive and go straight through.
 *
 * ── Errors are shown, not swallowed ──────────────────────────────────────
 * A failed action reports its message inline and leaves the row as it was.
 * There is no optimistic update here on purpose: these change what shoppers
 * can see, and showing "Archived" for a save that did not happen is worse
 * than waiting 300ms.
 */

type Pending = null | "publish" | "unpublish" | "archive" | "restore" | "duplicate" | "delete";

export function ProductRowActions({
  slug,
  name,
  status,
}: {
  slug: string;
  name: string;
  status: ProductStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<ActionResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        setDialog(null);
        return;
      }
      setDialog(null);
      /* The server action already revalidated; this makes the current view
         pick the new data up without a full reload. */
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Link href={`/admin/products/${slug}`} className="a-btn" data-variant="quiet">
          Edit
        </Link>

        {status === "published" ? (
          <Link
            href={`/p/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="a-btn"
            data-variant="quiet"
          >
            View ↗
          </Link>
        ) : null}

        {status === "draft" ? (
          <button
            type="button"
            className="a-btn"
            data-variant="quiet"
            disabled={isPending}
            onClick={() => run(() => publishProductAction(slug))}
          >
            Publish
          </button>
        ) : null}

        {status === "published" ? (
          <button
            type="button"
            className="a-btn"
            data-variant="quiet"
            disabled={isPending}
            onClick={() => setDialog("unpublish")}
          >
            Unpublish
          </button>
        ) : null}

        {status === "archived" ? (
          <>
            <button
              type="button"
              className="a-btn"
              data-variant="quiet"
              disabled={isPending}
              onClick={() => run(() => restoreProductAction(slug))}
            >
              Restore
            </button>
            <button
              type="button"
              className="a-btn"
              data-variant="quiet"
              disabled={isPending}
              onClick={() => setDialog("delete")}
            >
              Delete
            </button>
          </>
        ) : (
          <button
            type="button"
            className="a-btn"
            data-variant="quiet"
            disabled={isPending}
            onClick={() => setDialog("archive")}
          >
            Archive
          </button>
        )}

        <button
          type="button"
          className="a-btn"
          data-variant="quiet"
          disabled={isPending}
          onClick={() => run(() => duplicateProductAction(slug))}
        >
          Duplicate
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-love mt-1 text-right text-[12px]">
          {error}
        </p>
      ) : null}

      <AdminDialog
        open={dialog === "archive"}
        title={`Archive ${name}?`}
        description={
          <>
            This takes the pair off the shop and out of the sitemap. Nothing is deleted — the record
            and its web address are kept, so a link already shared on WhatsApp resolves to a proper
            &ldquo;not found&rdquo; rather than to a different shoe. You can restore it at any time.
          </>
        }
        confirmLabel="Archive"
        destructive
        pending={isPending}
        onConfirm={() => run(() => archiveProductAction(slug))}
        onCancel={() => setDialog(null)}
      />

      <AdminDialog
        open={dialog === "delete"}
        title={`Delete ${name} for good?`}
        description={
          <>
            This cannot be undone. The pair, its photographs, its sizes and any home page pin are
            removed permanently, and uploaded images no other pair uses are deleted from storage
            too. Anyone still holding the old <code>/p/{slug}</code> link will keep getting
            &ldquo;not found&rdquo;, which is what they get now. If you only want it off the shop,
            leave it archived instead.
          </>
        }
        confirmLabel="Delete for good"
        destructive
        pending={isPending}
        onConfirm={() => run(() => deleteProductAction(slug))}
        onCancel={() => setDialog(null)}
      />

      <AdminDialog
        open={dialog === "unpublish"}
        title={`Unpublish ${name}?`}
        description={
          <>
            The pair goes back to draft and disappears from the shop, the shelf and the sitemap
            immediately. Everything you have written is kept, and publishing again puts it straight
            back.
          </>
        }
        confirmLabel="Unpublish"
        destructive
        pending={isPending}
        onConfirm={() => run(() => unpublishProductAction(slug))}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}
