import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/**
 * The way in.
 *
 * No navigation, no shop chrome, nothing but the form — a signed-out visitor
 * should be shown one door, not a map of the building.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-[360px]">
        <p className="a-label mb-2">WappiCart</p>
        <h1 className="text-ink mb-1 text-[20px]">Admin</h1>
        <p className="text-grey mb-8 text-[13px]">Sign in to manage the shop.</p>

        <LoginForm next={safeNext(next)} />

        <p className="text-grey mt-8 text-[12px] leading-relaxed">
          Accounts are created in Supabase and granted access with{" "}
          <code className="text-ink">npm run admin:create</code>. Signing up does not grant
          access on its own.
        </p>
      </div>
    </div>
  );
}

/**
 * Where to land after signing in.
 *
 * Only same-origin paths under `/admin` are honoured. `?next=` arrives from
 * the middleware, but a query parameter is attacker-controlled: without this
 * check, a link like `/admin/login?next=https://evil.example` would turn the
 * shop's own login page into an open redirect that lands the editor on
 * somebody else's site immediately after they type their password.
 *
 * Anything that is not a plain `/admin/...` path falls back to the dashboard.
 * `//host` is rejected explicitly — browsers read a protocol-relative URL as
 * absolute, and it would otherwise slip past a simple "starts with /" test.
 */
function safeNext(next: string | undefined): string {
  if (!next) return "/admin";
  if (!next.startsWith("/admin")) return "/admin";
  if (next.startsWith("//")) return "/admin";
  if (next.startsWith("/admin/login")) return "/admin";
  return next;
}
