import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { adminProfiles } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * Who is allowed into the admin.
 *
 * Two separate questions:
 *   "Who is this?"          - answered by Supabase Auth (email + password)
 *   "Can they edit shops?"  - answered by a row in the admin_profiles table
 *
 * Having a Supabase account grants nothing on its own. Only
 * `npm run admin:create` adds the row that grants access.
 *
 * NOTE: always use getUser(), never getSession(). getSession() just reads the
 * cookie and believes it; getUser() checks the token with Supabase first. On
 * a server that difference is the entire security.
 *
 * ── Why there is a cache below ───────────────────────────────────────────
 * Answering both questions costs a round trip to Supabase (~180ms) plus one
 * to Postgres (~70ms). Doing that on every click made the admin feel sluggish
 * for no new information: the same token, checked again, gives the same
 * answer.
 *
 * So a verified answer is remembered for a minute, keyed by the access token
 * itself. The token is still verified — just not five times a minute.
 */

export type AdminUser = {
  id: string;
  authUserId: string;
  email: string;
  name: string;
  role: "admin";
};

/**
 * Token → auth user id, remembered briefly.
 *
 * ONLY the identity is cached, never the permission.
 *
 * "Which account does this token belong to?" cannot change while the token is
 * valid, so asking Supabase again is 180ms spent to be told the same thing.
 * "Is that account an admin?" CAN change at any moment, so it is read from the
 * database every single time — that is a 70ms query and worth every
 * millisecond.
 *
 * Getting this split wrong is not theoretical: caching the permission meant
 * granting somebody admin did not take effect for a minute, which the test
 * suite caught immediately.
 *
 * A token that fails verification is not cached either. A "no" is cheap to
 * work out again, and remembering one is how a fixed problem stays broken.
 */
const IDENTITY_TTL_MS = 60_000;
const identities = new Map<string, { userId: string; expires: number }>();

function rememberIdentity(token: string, userId: string) {
  /* Bounded: a long-running server must not grow this forever. */
  if (identities.size > 50) identities.clear();
  identities.set(token, { userId, expires: Date.now() + IDENTITY_TTL_MS });
}

export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const supabase = await createClient();

  /* Read locally, only to use as a cache key. Never as proof of identity — a
     token is trusted here solely because getUser() verified it below, within
     the last minute. */
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  let userId: string | undefined;

  const known = token ? identities.get(token) : undefined;
  if (known && known.expires > Date.now()) {
    userId = known.userId;
  } else {
    if (token && known) identities.delete(token);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    userId = user.id;
    if (token) rememberIdentity(token, userId);
  }

  const [profile] = await db
    .select()
    .from(adminProfiles)
    .where(eq(adminProfiles.authUserId, userId))
    .limit(1);

  /* Logged in, but not an admin. Normal — not an error. */
  /* Read fresh every time — see the note above about permission vs identity. */
  if (!profile) return null;

  const admin: AdminUser = {
    id: profile.id,
    authUserId: profile.authUserId,
    email: profile.email,
    name: profile.name,
    role: profile.role,
  };

  return admin;
});

/** Forget a token's identity — used when signing out. */
export async function forgetVerifiedSession(token?: string): Promise<void> {
  if (token) identities.delete(token);
  else identities.clear();
}

/**
 * Put this at the top of every admin page.
 *
 * It redirects rather than returning null, so there is no way to forget to
 * handle the logged-out case.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/**
 * The same check, for save functions.
 *
 * Returns a result instead of redirecting, because redirecting in the middle
 * of a form submission produces a confusing failure.
 */
export async function requireAdminForAction(): Promise<
  { ok: true; admin: AdminUser } | { ok: false; error: "UNAUTHORISED" }
> {
  const admin = await getAdmin();
  return admin ? { ok: true, admin } : { ok: false, error: "UNAUTHORISED" };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
