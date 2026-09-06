import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./admin.css";

/**
 * The admin's root.
 *
 * It sits beside `(storefront)` rather than inside it, so none of the shop's
 * chrome reaches it: no header, no footer, no mobile dock, no Lenis smooth
 * scroll, no brand intro. An editor scrolling a table does not want the
 * scroll position interpolated, and a sticky shop header over a product form
 * is furniture in the way of the work.
 *
 * `admin.css` is imported here and nowhere else. Every class in it is
 * prefixed `a-`, so even if that import were to move, a rule could not
 * silently restyle a product page.
 *
 * This layout deliberately holds no navigation. `/admin/login` renders inside
 * it and must NOT show a sidebar — offering links to pages the visitor cannot
 * open is both confusing and a small information leak. The shell lives one
 * level down, in `(protected)/layout.tsx`, behind the auth check.
 */

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · WappiCart Admin" },
  /* The admin must never be indexed. This is a stronger statement than
     robots.txt: a crawler that ignores the file still sees the header. */
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="text-ink min-h-screen">{children}</div>;
}
