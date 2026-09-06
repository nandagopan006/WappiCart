"use server";

import { redirect } from "next/navigation";

import { forgetVerifiedSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Signing out.
 *
 * Runs on the server rather than in the browser so the session cookies are
 * cleared by the same side that set them. Signing out client-side leaves the
 * server still holding a valid session for the rest of the request.
 *
 * The redirect is outside the try/catch on purpose: Next implements
 * `redirect()` by throwing, so catching around it would swallow the
 * navigation and leave the person on a page they are no longer signed in to.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();

  /* Drop the remembered verification before clearing the session, so signing
     out takes effect now rather than when the cache entry expires. */
  const { data } = await supabase.auth.getSession();
  await forgetVerifiedSession(data.session?.access_token);

  await supabase.auth.signOut();

  redirect("/admin/login");
}
