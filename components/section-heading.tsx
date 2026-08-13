import { cx } from "@/lib/cx";

/**
 * The only section divider on the site.
 *
 * A centred uppercase label with a hairline running out to both margins —
 * the band that separates one grid of shoes from the next. There is no
 * second divider style; if a section needs separating, it gets this.
 */
export function SectionHeading({
  children,
  as: Tag = "h2",
  className,
}: {
  children: React.ReactNode;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cx("rule-heading", className)}>
      <Tag className="text-section text-ink text-center font-medium uppercase">{children}</Tag>
    </div>
  );
}
