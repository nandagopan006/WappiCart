"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { AdminButton } from "@/components/admin/ui/button";

/**
 * The admin's only modal.
 *
 * ── Why not `confirm()` ──────────────────────────────────────────────────
 * The native dialog blocks the main thread, cannot be styled, and arrives as
 * browser chrome — the moment somebody is deciding whether to archive a
 * product is the worst moment to hand them something that looks like it came
 * from somewhere else. The storefront made the same call for its wishlist
 * clear-all; this is that component's sibling.
 *
 * ── What makes it a dialog rather than a floating card ───────────────────
 *   · `role="dialog"` + `aria-modal`, labelled and described by its own copy
 *   · focus moves to Cancel on open — the safe choice, never the destructive
 *     one — and returns to whatever opened it on close
 *   · Escape and the backdrop both dismiss
 *   · focus is trapped, so Tab cannot wander into the page behind
 *   · body scroll is locked and restored to the value it had
 *
 * ── The destructive button is the plain one ──────────────────────────────
 * Cancel is filled. An archive button should not be the most attractive thing
 * on screen.
 */
export function AdminDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;

      /* Trap. Without it, Tab walks into the page behind the backdrop and the
         reader loses the dialog entirely. */
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      /* Restored to what it was, not to "". The page may have locked scroll
         for its own reasons. */
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onCancel}
        className="bg-ink/25 absolute inset-0 cursor-default"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
        className="border-line bg-paper relative w-full max-w-[420px] border p-6"
        style={{ boxShadow: "0 24px 60px rgba(11, 11, 11, 0.18)" }}
      >
        <h2 id={`${id}-title`} className="text-ink text-[15px] tracking-[0.02em]">
          {title}
        </h2>
        <div id={`${id}-desc`} className="text-grey mt-3 text-[13px] leading-relaxed">
          {description}
        </div>

        <div className="mt-7 flex justify-end gap-2">
          <AdminButton ref={cancelRef} variant="primary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </AdminButton>
          <AdminButton
            variant={destructive ? "danger" : "secondary"}
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? "Working…" : confirmLabel}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
