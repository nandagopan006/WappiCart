"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The admin's navigation, and the drawer it lives in on a phone.
 *
 * ── Why the whole rail is one Client Component ───────────────────────────
 * It needs `usePathname` to mark the current page and state for the drawer.
 * Nothing inside it reads data, so it costs one small bundle on admin routes
 * only — the storefront never loads this file.
 *
 * ── What is deliberately absent ──────────────────────────────────────────
 * Orders, Customers, Payments, Revenue. The shop has no datastore behind any
 * of them: WhatsApp is the order system and no sale is recorded in this
 * codebase. A nav item leading to invented numbers would be worse than no
 * nav item.
 */

type Item = { href: string; label: string; exact?: boolean };
type Group = { heading: string; items: Item[] };

const GROUPS: Group[] = [
  {
    heading: "Catalog",
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/media", label: "Media" },
    ],
  },
  {
    heading: "Content",
    items: [
      { href: "/admin/homepage", label: "Homepage" },
      { href: "/admin/about", label: "About" },
    ],
  },
  {
    heading: "Store",
    items: [
      { href: "/admin/settings", label: "Shop settings" },
      { href: "/admin/seo", label: "SEO" },
    ],
  },
  {
    heading: "System",
    items: [
      { href: "/admin/activity", label: "Activity" },
      { href: "/admin/account", label: "Account" },
    ],
  },
];

export function AdminNav({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /* Close on navigation. Without this the drawer stays over the page the
     editor just asked for, and the tap reads as having done nothing. */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  /* Escape closes it, matching every other dismissible surface on the site. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (item: Item) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <>
      {/* The bar that only exists below lg, carrying the drawer toggle. */}
      <div className="border-line bg-paper sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-nav"
          className="a-btn"
          data-variant="quiet"
        >
          <MenuIcon />
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          Menu
        </button>
        <span className="text-ink text-[13px] tracking-[0.08em] uppercase">WappiCart</span>
      </div>

      {/* The scrim. Only mounted while open, so it can never swallow a click
          on a wide screen where the rail is permanent. */}
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="bg-ink/20 fixed inset-0 z-30 lg:hidden"
        />
      ) : null}

      <nav
        id="admin-nav"
        data-open={open}
        aria-label="Admin"
        className="a-sidebar flex flex-col lg:sticky lg:top-0 lg:h-screen"
      >
        <div className="border-line flex h-14 shrink-0 items-center border-b px-6">
          <Link href="/admin" className="text-ink text-[15px] font-semibold tracking-[0.02em] uppercase">
            Wappi<span className="font-light">Cart</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto pb-6">
          <div className="a-nav-group">
            <Link
              href="/admin"
              prefetch
              aria-current={pathname === "/admin" ? "page" : undefined}
              className="a-nav-link"
            >
              Dashboard
            </Link>
          </div>

          {GROUPS.map((group) => (
            <div key={group.heading} className="a-nav-group">
              <p className="a-nav-heading">{group.heading}</p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  /* Fetch the page as soon as this link is on screen, so a
                     click has nothing left to wait for. Next only does this
                     for routes that have a loading state — see
                     app/admin/(protected)/loading.tsx. */
                  prefetch
                  aria-current={isActive(item) ? "page" : undefined}
                  className="a-nav-link"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="border-line shrink-0 border-t px-6 py-4">
          <p className="text-ink truncate text-[13px]">{name}</p>
          <p className="text-grey truncate text-[11px]">{email}</p>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-grey hover:text-ink mt-3 inline-block text-[11px] tracking-[0.1em] uppercase"
          >
            View the shop ↗
          </Link>
        </div>
      </nav>
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
      <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

