/**
 * Sets up a throwaway admin and drives the app as them.
 *
 * ── Why this file exists ─────────────────────────────────────────────────
 * Five check scripts each need the same thing: a real Supabase user, a real
 * admin row, a real signed-in session, and a way to fetch pages as that
 * person. That was thirty lines copied into each of them — five places to fix
 * whenever the cookie format or the cleanup changed.
 *
 * ── What it guarantees ───────────────────────────────────────────────────
 * The account is always removed afterwards, even if the checks throw. And it
 * clears any stragglers on the way IN as well, because a script killed
 * halfway through never reaches its cleanup — that is how eight confirmed
 * admin accounts once accumulated unnoticed.
 */
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";

import { adminProfiles } from "../lib/db/schema";
import { connect } from "./db-connect";
import { purgeTestUsers } from "./test-users";

export type TestSession = {
  /** Fetch a page as the signed-in admin. Follows no redirects. */
  get: (path: string) => Promise<{ status: number; location: string | null; body: string }>;
  /** The database handle, for setting up rows a check needs. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  /** The throwaway account's email, for assertions that look for it. */
  email: string;
  /** The Supabase Auth id, for granting or revoking admin mid-test. */
  authUserId: string;
  /** The raw cookie header, for a check that needs to fetch by hand. */
  cookie: string;
};

/**
 * Run `work` as a signed-in admin, then clean up.
 *
 * The account is created WITH admin rights by default. Pass
 * `{ grantAdmin: false }` when a check needs to test what a signed-in
 * non-admin sees.
 */
export async function withTestAdmin(
  work: (session: TestSession) => Promise<void>,
  options: { grantAdmin?: boolean } = {},
): Promise<void> {
  const { grantAdmin = true } = options;
  const base = process.env.CHECK_BASE_URL ?? "http://localhost:3000";

  const { db, close } = connect();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /* Reap anything an interrupted earlier run left behind. */
  await purgeTestUsers(db, true);

  const email = `check-${Date.now()}@wappicart.test`;
  const password = `Pw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw new Error(`could not create the test user: ${created.error.message}`);

  const authUserId = created.data.user.id;

  try {
    if (grantAdmin) {
      await db.insert(adminProfiles).values({
        authUserId,
        email,
        name: "Check Runner",
        role: "admin",
      });
    }

    /* Sign in through the real endpoint, so the session is a real one. */
    const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const signIn = await anonClient.auth.signInWithPassword({ email, password });
    if (signIn.error) throw new Error(`could not sign in: ${signIn.error.message}`);

    /* Build the cookie exactly as @supabase/ssr writes it: the whole session,
       base64, under sb-<project ref>-auth-token. */
    const projectRef = new URL(url).hostname.split(".")[0];
    const encoded = Buffer.from(JSON.stringify(signIn.data.session)).toString("base64");
    const cookie = `sb-${projectRef}-auth-token=base64-${encoded}`;

    const get = async (path: string) => {
      const response = await fetch(`${base}${path}`, {
        headers: { cookie },
        redirect: "manual",
      });
      return {
        status: response.status,
        location: response.headers.get("location"),
        /* React puts <!-- --> between adjacent text nodes, which breaks naive
           string matching in the checks. Stripped once, here. */
        body: (await response.text()).replace(/<!-- -->/g, ""),
      };
    };

    await work({ get, db, email, authUserId, cookie });
  } finally {
    /* Each step reports its own problem rather than masking the failure that
       brought us here. */
    try {
      await db.delete(adminProfiles).where(eq(adminProfiles.authUserId, authUserId));
    } catch (error) {
      console.log("  cleanup: could not remove the admin row —", (error as Error).message);
    }

    try {
      await admin.auth.admin.deleteUser(authUserId);
    } catch {
      console.log(`  cleanup: could not remove ${email} — delete it in Supabase by hand`);
    }

    await close();
  }
}

/** Prints an OK/FAIL line and counts the failures. */
export function createReporter() {
  let failures = 0;

  const check = (label: string, passed: boolean, extra = "") => {
    if (!passed) failures += 1;
    console.log(`  ${passed ? "OK  " : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  };

  const finish = (subject: string) => {
    console.log(
      failures === 0 ? `\n  ${subject} verified.\n` : `\n  ${failures} failure(s).\n`,
    );
    process.exitCode = failures === 0 ? 0 : 1;
  };

  return { check, finish };
}
