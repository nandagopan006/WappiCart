"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { EASE_SETTLE_POINTS } from "@/lib/motion";

/**
 * A confirmation before something irreversible.
 *
 * ── Why not `confirm()` ──────────────────────────────────────────────────
 * The native dialog is unstyleable, blocks the main thread, and on a phone
 * arrives as a system sheet with the browser's name on it — the one moment
 * the shopper is deciding whether to trust this shop with a destructive
 * action is the worst moment to hand them something that looks like it came
 * from somewhere else.
 *
 * ── What makes it a dialog rather than a floating card ───────────────────
 *   · `role="dialog"` + `aria-modal`, labelled and described by its own copy
 *   · focus moves to Cancel on open — the safe choice, not the destructive
 *     one — and returns to whatever opened it on close
 *   · Escape closes; so does the backdrop
 *   · the page behind cannot scroll while it is open
 *
 * The confirm button is deliberately the plain one and Cancel is the filled
 * one. A destructive action should not be the most attractive thing on
 * screen.
 */

const SETTLE = [...EASE_SETTLE_POINTS] as [number, number, number, number];

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const reduced = useReducedMotion();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (!open) return;

    /* Remember where focus came from so it can be handed back — a dialog that
       drops focus to the top of the document loses a keyboard user's place. */
    openerRef.current = document.activeElement;
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    /* The page must not scroll underneath. Restored exactly as found rather
       than reset to a hard-coded value. */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          {/* The backdrop. Ink at low opacity rather than black — the page
              behind stays legible, so this reads as a pause rather than a
              new screen. */}
          <motion.button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={onCancel}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: SETTLE }}
            className="bg-ink/35 absolute inset-0 cursor-default supports-[backdrop-filter]:backdrop-blur-[2px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={messageId}
            initial={reduced ? false : { opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.28, ease: SETTLE }}
            className="bg-paper border-line relative w-full max-w-sm border p-7 shadow-[0_24px_60px_-30px_rgba(11,11,11,0.4)]"
          >
            <h2 id={titleId} className="text-caption text-grey uppercase">
              {title}
            </h2>

            <p id={messageId} className="text-lead text-ink mt-4">
              {message}
            </p>

            <div className="mt-8 flex items-center gap-3">
              {/* Cancel is the filled button and holds initial focus. The
                  destructive action should never be the easiest thing to
                  hit by reflex. */}
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                className="text-caption border-ink bg-ink text-paper hover:bg-paper hover:text-ink inline-flex h-12 flex-1 items-center justify-center border uppercase transition-colors"
              >
                {cancelLabel}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                className="text-caption border-line text-grey hover:border-love hover:text-love inline-flex h-12 flex-1 items-center justify-center border uppercase transition-colors"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
