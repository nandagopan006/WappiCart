import { cx } from "@/lib/cx";

/**
 * The only section divider on the site.
 *
 * A number, a label, and a hairline — pinned left, never centred. The count
 * sits at the far right of the same baseline, so the heading tells you where
 * you are and how much is under it in one line.
 *
 * `index` is the section's place in the home page's sequence. It is real
 * information rather than decoration: the page is a scroll with an order to
 * it, and numbering the parts is what stops a long one feeling shapeless.
 */
export function SectionHeading({
  children,
  index,
  meta,
  as: Tag = "h2",
  className,
}: {
  children: React.ReactNode;
  /** Rendered as 01, 02, … Omitted where the section is not part of a run. */
  index?: number;
  /** Right-hand note — usually a count. */
  meta?: string;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cx("section-index", className)}>
      {index !== undefined ? (
        <span aria-hidden="true" className="text-caption text-grey tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
      ) : null}

      <Tag className="text-caption text-ink uppercase">{children}</Tag>

      {meta ? <span className="text-caption text-grey ml-auto tabular-nums">{meta}</span> : null}
    </div>
  );
}
