import type { ComponentProps, ReactNode } from "react";

import { cx } from "@/lib/cx";

/**
 * Form fields.
 *
 * ── One wrapper, so a field can never be half-labelled ───────────────────
 * `Field` owns the label, the hint, the error and the wiring between them.
 * Every control below takes the same props and hands them to it, which is
 * what makes it impossible to ship an input whose error message is not
 * announced — the `aria-describedby` is built in one place rather than
 * remembered at forty call sites.
 *
 * ── Errors are never colour alone ────────────────────────────────────────
 * An invalid field gets a red rule, a red message, and `aria-invalid`. A
 * reader who cannot see the colour still gets the message and the
 * announcement.
 */

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  className?: string;
};

export function Field({ label, name, error, hint, required, children, className }: FieldProps) {
  const id = `f-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  /* Error first: when both exist it is the more urgent of the two, and
     screen readers announce described-by in order. */
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("mb-5", className)}>
      <label htmlFor={id} className="a-label mb-2 block">
        {label}
        {required ? <span className="text-love ml-1">*</span> : null}
      </label>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {error ? (
        <span id={errorId} className="a-error" role="alert">
          {error}
        </span>
      ) : null}
      {hint && !error ? (
        <span id={hintId} className="a-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

type ControlProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  wrapperClassName?: string;
};

export function AdminInput({
  label,
  name,
  error,
  hint,
  required,
  wrapperClassName,
  ...rest
}: ControlProps & ComponentProps<"input">) {
  return (
    <Field
      label={label}
      name={name}
      error={error}
      hint={hint}
      required={required}
      className={wrapperClassName}
    >
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          name={name}
          className="a-input"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        />
      )}
    </Field>
  );
}

export function AdminTextarea({
  label,
  name,
  error,
  hint,
  required,
  wrapperClassName,
  ...rest
}: ControlProps & ComponentProps<"textarea">) {
  return (
    <Field
      label={label}
      name={name}
      error={error}
      hint={hint}
      required={required}
      className={wrapperClassName}
    >
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          name={name}
          className="a-textarea"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        />
      )}
    </Field>
  );
}

export function AdminSelect({
  label,
  name,
  error,
  hint,
  required,
  options,
  wrapperClassName,
  ...rest
}: ControlProps & {
  options: ReadonlyArray<{ value: string; label: string }>;
} & ComponentProps<"select">) {
  return (
    <Field
      label={label}
      name={name}
      error={error}
      hint={hint}
      required={required}
      className={wrapperClassName}
    >
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          name={name}
          className="a-select"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/**
 * A checkbox, laid out as control-then-label.
 *
 * It does not use `Field`: a checkbox's label belongs beside it rather than
 * above it, and forcing it through the same wrapper would mean a layout
 * exception inside a component whose whole job is that there are none.
 */
export function AdminCheckbox({
  label,
  name,
  hint,
  className,
  ...rest
}: { label: string; name: string; hint?: string } & ComponentProps<"input">) {
  const id = `f-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={cx("mb-4", className)}>
      <div className="flex items-center gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          className="accent-ink h-4 w-4 shrink-0"
          aria-describedby={hintId}
          {...rest}
        />
        <label htmlFor={id} className="text-ink cursor-pointer text-[13px]">
          {label}
        </label>
      </div>
      {hint ? (
        <span id={hintId} className="a-hint ml-7">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
