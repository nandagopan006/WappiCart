"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminButton } from "@/components/admin/ui/button";
import { AdminDialog } from "@/components/admin/ui/dialog";
import { AdminBadge, AdminTable } from "@/components/admin/ui/surface";
import {
  deleteCategoryAction,
  reorderCategoriesAction,
  toggleCategoryAction,
  type CategoryResult,
} from "@/lib/actions/categories";
import type { Shelf } from "@/lib/catalogue";
import type { ShelfUsage } from "@/lib/repositories/categories";

/**
 * The shelves, in the order they appear on the shop.
 *
 * ── Order is edited here, saved deliberately ─────────────────────────────
 * The arrows move a row in local state and a Save button appears. Writing on
 * every click would mean four round trips to move one shelf three places, and
 * an editor who reorders and then changes their mind would have no way back.
 *
 * ── A shelf carrying stock cannot be deleted ─────────────────────────────
 * The delete button is disabled while any pair points at the shelf, including
 * drafts and archived ones — the foreign key refuses either way, and a button
 * that always fails is worse than one that says why it is off. Unlike a
 * product, a shelf is not archived first: it has no public page of its own to
 * leave behind, only a `?c=` filter value.
 *
 * ── Nothing is optimistic ────────────────────────────────────────────────
 * These change what a shopper can see. Showing a row as hidden for a save
 * that did not happen is worse than waiting 300ms for the truth.
 */

type Pending = null | { kind: "delete"; slug: string; name: string };

export function CategoryTable({
  shelves,
  usage,
}: {
  shelves: Shelf[];
  usage: Record<string, ShelfUsage>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [order, setOrder] = useState(shelves);
  const [dialog, setDialog] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * Re-sync when the server sends a different list.
   *
   * The rows are held in state so the arrows can move them before anything is
   * saved. State initialised once would then ignore `router.refresh()`
   * entirely — a deleted shelf would keep rendering and a hidden one would
   * keep its old badge, because the fresh props would never reach the array
   * this component draws from.
   *
   * Adjusting state during render rather than in an effect is deliberate:
   * React discards the render and re-runs it immediately, so the stale list is
   * never painted. Comparing a signature rather than the array identity
   * matters because RSC hands over a new array on every refresh, and comparing
   * by reference would throw away an in-progress reorder for no reason.
   */
  const signature = shelves.map((s) => `${s.slug}:${s.enabled}:${s.name}`).join("|");
  const [syncedTo, setSyncedTo] = useState(signature);

  if (signature !== syncedTo) {
    setSyncedTo(signature);
    setOrder(shelves);
  }

  /* The saved order, so the Save button only appears once something moved. */
  const dirty = order.map((s) => s.slug).join() !== shelves.map((s) => s.slug).join();

  const run = (fn: () => Promise<CategoryResult>) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        setDialog(null);
        return;
      }
      setDialog(null);
      setNotice(result.message);
      /* The action already revalidated; this makes the open view pick the new
         data up without a full reload. */
      router.refresh();
    });
  };

  const move = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    setOrder(next);
  };

  const visible = order.filter((s) => s.enabled).length;

  return (
    <>
      {error ? (
        <p role="alert" className="border-love/40 text-love mb-6 border-l-2 py-1 pl-3 text-[13px]">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="border-ink/30 text-ink mb-6 border-l-2 py-1 pl-3 text-[13px]">
          {notice}
        </p>
      ) : null}

      {/* ── Table, from md up ───────────────────────────────────────────── */}
      <div className="hidden md:block">
        <AdminTable
          headers={[
            { label: "", srLabel: "Photograph" },
            { label: "Shelf" },
            { label: "Blurb" },
            { label: "Pairs" },
            { label: "Status" },
            { label: "Order" },
            { label: "", srLabel: "Actions", className: "text-right" },
          ]}
        >
          {order.map((shelf, index) => {
            const used = usage[shelf.slug];
            return (
              <tr key={shelf.slug}>
                <td className="w-[52px]">
                  <Thumb src={shelf.imageUrl} name={shelf.name} />
                </td>
                <td>
                  <Link
                    href={`/admin/categories/${shelf.slug}`}
                    className="text-ink hover:underline"
                  >
                    {shelf.name}
                  </Link>
                  <div className="text-grey mt-0.5 text-[11px]">/shop?c={shelf.slug}</div>
                </td>
                <td className="text-grey max-w-[28ch] text-[12px]">
                  {shelf.description || <span className="text-grey/60">—</span>}
                </td>
                <td>
                  <PairCount usage={used} />
                </td>
                <td>
                  <AdminBadge tone={shelf.enabled ? "published" : "draft"}>
                    {shelf.enabled ? "Visible" : "Hidden"}
                  </AdminBadge>
                </td>
                <td>
                  <MoveButtons
                    name={shelf.name}
                    index={index}
                    total={order.length}
                    disabled={isPending}
                    onMove={move}
                  />
                </td>
                <td>
                  <RowActions
                    shelf={shelf}
                    usage={used}
                    visible={visible}
                    pending={isPending}
                    onToggle={() =>
                      run(() => toggleCategoryAction({ slug: shelf.slug, enabled: !shelf.enabled }))
                    }
                    onDelete={() => setDialog({ kind: "delete", slug: shelf.slug, name: shelf.name })}
                  />
                </td>
              </tr>
            );
          })}
        </AdminTable>
      </div>

      {/* ── Cards, below md ────────────────────────────────────────────── */}
      <ul className="md:hidden">
        {order.map((shelf, index) => {
          const used = usage[shelf.slug];
          return (
            <li key={shelf.slug} className="border-line border-b py-4">
              <div className="flex gap-3">
                <Thumb src={shelf.imageUrl} name={shelf.name} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/categories/${shelf.slug}`}
                    className="text-ink text-[14px]"
                  >
                    {shelf.name}
                  </Link>
                  <p className="text-grey mt-0.5 text-[11px]">/shop?c={shelf.slug}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <AdminBadge tone={shelf.enabled ? "published" : "draft"}>
                      {shelf.enabled ? "Visible" : "Hidden"}
                    </AdminBadge>
                    <PairCount usage={used} />
                  </div>
                </div>
                <MoveButtons
                  name={shelf.name}
                  index={index}
                  total={order.length}
                  disabled={isPending}
                  onMove={move}
                />
              </div>
              <div className="mt-3">
                <RowActions
                  shelf={shelf}
                  usage={used}
                  visible={visible}
                  pending={isPending}
                  onToggle={() =>
                    run(() => toggleCategoryAction({ slug: shelf.slug, enabled: !shelf.enabled }))
                  }
                  onDelete={() => setDialog({ kind: "delete", slug: shelf.slug, name: shelf.name })}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {dirty ? (
        <div className="border-line mt-6 flex items-center gap-3 border-t pt-6">
          <AdminButton
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={() => run(() => reorderCategoriesAction(order.map((s) => s.slug)))}
          >
            {isPending ? "Saving…" : "Save order"}
          </AdminButton>
          <AdminButton
            type="button"
            variant="quiet"
            disabled={isPending}
            onClick={() => setOrder(shelves)}
          >
            Reset
          </AdminButton>
          <p className="text-grey text-[12px]">
            The order sets the header&rsquo;s nav row and the shop&rsquo;s filter row.
          </p>
        </div>
      ) : null}

      <AdminDialog
        open={dialog?.kind === "delete"}
        title={`Delete ${dialog?.name ?? "this shelf"}?`}
        description={
          <>
            The shelf is removed for good — this one does not archive. Nothing else is deleted:
            a shelf has no page of its own, only the <code>?c=</code> filter the header links to,
            so no address a shopper already has stops working. It disappears from the header, the
            shop&rsquo;s filters and the home page immediately.
          </>
        }
        confirmLabel="Delete"
        destructive
        pending={isPending}
        onConfirm={() => (dialog ? run(() => deleteCategoryAction(dialog.slug)) : undefined)}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function Thumb({ src, name }: { src: string | null; name: string }) {
  if (!src) {
    return (
      <div className="bg-mist border-line text-grey flex h-13 w-13 shrink-0 items-center justify-center border text-[10px]">
        none
      </div>
    );
  }

  return (
    <div className="bg-mist relative h-13 w-13 shrink-0 overflow-hidden">
      <Image src={src} alt={`${name} shelf`} fill sizes="52px" className="object-cover" />
    </div>
  );
}

/**
 * How much stock is on the shelf.
 *
 * All three statuses, because all three hold the shelf's foreign key and all
 * three therefore block a delete. Published is the number that matters to a
 * shopper, so it leads; the rest sit under it in grey.
 */
function PairCount({ usage }: { usage: ShelfUsage | undefined }) {
  if (!usage || usage.total === 0) {
    return <span className="text-grey/60 text-[12px]">empty</span>;
  }

  const rest: string[] = [];
  if (usage.draft > 0) rest.push(`${usage.draft} draft`);
  if (usage.archived > 0) rest.push(`${usage.archived} archived`);

  return (
    <span className="text-[12px]">
      <span className="text-ink tabular-nums">{usage.published} live</span>
      {rest.length > 0 ? <span className="text-grey"> · {rest.join(", ")}</span> : null}
    </span>
  );
}

function MoveButtons({
  name,
  index,
  total,
  disabled,
  onMove,
}: {
  name: string;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (index: number, delta: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <AdminButton
        type="button"
        variant="quiet"
        disabled={disabled || index === 0}
        onClick={() => onMove(index, -1)}
        aria-label={`Move ${name} up`}
      >
        ↑
      </AdminButton>
      <AdminButton
        type="button"
        variant="quiet"
        disabled={disabled || index === total - 1}
        onClick={() => onMove(index, 1)}
        aria-label={`Move ${name} down`}
      >
        ↓
      </AdminButton>
    </div>
  );
}

/**
 * The per-row controls.
 *
 * Delete and Hide are both disabled rather than hidden when they cannot run,
 * because *why* they cannot is the useful part — a missing button says
 * nothing, and the title explains what would have to change first.
 */
function RowActions({
  shelf,
  usage,
  visible,
  pending,
  onToggle,
  onDelete,
}: {
  shelf: Shelf;
  usage: ShelfUsage | undefined;
  visible: number;
  pending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const pairs = usage?.total ?? 0;
  const lastVisible = shelf.enabled && visible <= 1;

  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/admin/categories/${shelf.slug}`} className="a-btn" data-variant="quiet">
        Edit
      </Link>

      {shelf.enabled ? (
        <Link
          href={`/shop?c=${shelf.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="a-btn"
          data-variant="quiet"
        >
          View ↗
        </Link>
      ) : null}

      <button
        type="button"
        className="a-btn"
        data-variant="quiet"
        disabled={pending || lastVisible}
        title={
          lastVisible
            ? "This is the only visible shelf. The shop needs one to browse by."
            : undefined
        }
        onClick={onToggle}
      >
        {shelf.enabled ? "Hide" : "Show"}
      </button>

      <button
        type="button"
        className="a-btn"
        data-variant="quiet"
        disabled={pending || pairs > 0}
        title={
          pairs > 0
            ? `${pairs} ${pairs === 1 ? "pair is" : "pairs are"} on this shelf. Move them first — drafts and archived pairs count too.`
            : undefined
        }
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}
