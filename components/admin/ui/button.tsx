import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cx } from "@/lib/cx";

/**
 * The admin's only button.
 *
 * Four variants and no more, mirroring the storefront's discipline: ink on
 * paper, paper on ink, a plain destructive one, and a quiet one for row
 * actions. No pills, no rounded corners, no third colour.
 *
 * `danger` is deliberately the least attractive of the four. The archive
 * button should never be the thing the eye lands on first — the same reason
 * the storefront's confirm dialog makes Cancel the filled one.
 */

export type ButtonVariant = "primary" | "secondary" | "danger" | "quiet";

type BaseProps = {
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
};

export function AdminButton({
  variant = "secondary",
  className,
  children,
  ...rest
}: BaseProps & ComponentProps<"button">) {
  return (
    <button data-variant={variant} className={cx("a-btn", className)} {...rest}>
      {children}
    </button>
  );
}

/**
 * A link that looks like a button.
 *
 * Kept separate rather than given an `as` prop: "go somewhere" and "do
 * something" are different to a keyboard and to a screen reader, and an
 * anchor styled as a button that submits a form is the usual way that
 * distinction gets lost.
 */
export function AdminLinkButton({
  variant = "secondary",
  className,
  children,
  ...rest
}: BaseProps & ComponentProps<typeof Link>) {
  return (
    <Link data-variant={variant} className={cx("a-btn", className)} {...rest}>
      {children}
    </Link>
  );
}

/**
 * A button that reports what it is doing.
 *
 * The label swaps to `pendingLabel` and the control disables while a
 * mutation is in flight — both, because a button that only greys out leaves
 * the reader guessing whether the click registered. `aria-busy` says the
 * same thing to a screen reader.
 */
export function AdminSubmitButton({
  pending,
  pendingLabel = "Saving…",
  variant = "primary",
  className,
  children,
  ...rest
}: BaseProps & { pending?: boolean; pendingLabel?: string } & ComponentProps<"button">) {
  return (
    <button
      type="submit"
      data-variant={variant}
      aria-busy={pending || undefined}
      disabled={pending || rest.disabled}
      className={cx("a-btn", className)}
      {...rest}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
