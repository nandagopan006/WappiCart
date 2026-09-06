import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh and the first gate, for `/admin` only.
 *
 * ── Why the matcher stops at /admin ──────────────────────────────────────
 * Supabase's SSR guidance runs middleware site-wide, which is right for an
 * app where every page knows who you are. This storefront is the opposite:
 * it is public, static and deliberately ships almost no JavaScript, and it
 * has no concept of a signed-in shopper. Running middleware across it would
 * add a hop to every product page to refresh a session that does not exist.
 * The admin is the only part of this site with a session, so it is the only
 * part with middleware.
 *
 * ── What this checks, and what it deliberately does not ──────────────────
 * Two jobs: refresh the auth token so a working session does not expire
 * mid-edit, and bounce anyone with no session at all.
 *
 * It does NOT check whether the user is an admin. That answer lives in the
 * `admin_profiles` table, and middleware runs on the Edge runtime where the
 * Postgres driver cannot. So this is the cheap gate — "are you signed in?" —
 * and `requireAdmin()` in the protected layout is the real one: "are you an
 * admin?". Every Server Action re-checks independently, because an action is
 * its own endpoint and a layout cannot protect it.
 *
 * Treating this as the whole of the security would be the classic mistake.
 * It is the doorman, not the lock.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  /* Unconfigured: let the request through to the page, which renders a real
     setup message. A blank redirect loop is a miserable way to discover that
     an environment variable is missing. */
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        /* The refreshed token has to be written twice: onto the request, so
           anything rendering downstream in this same pass sees it, and onto a
           newly constructed response, so it reaches the browser. Mutating
           only one of the two is why "I am randomly signed out" bugs happen. */
        for (const { name, value } of toSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  /* Is there a session at all, and does it still have a while to run?
     Read straight out of the cookie — no network. */
  const session = readSessionCookie(request);

  /* Only talk to Supabase when there is something to do: a token that is
     close to expiring needs refreshing, and a cookie we could not read needs
     verifying properly.

     Skipping the call the rest of the time saves a ~180ms round trip on every
     single admin page load, which was most of the wait between clicking a
     sidebar link and seeing the page.

     This does not weaken anything. Middleware never decided who is an admin —
     `requireAdmin()` in the protected layout does, with a verified
     `getUser()`, and every save re-checks again. A forged cookie gets past
     this line and no further. */
  let user: { id: string } | null = session.present ? { id: "cookie" } : null;

  if (session.present && session.needsRefresh) {
    const verified = await supabase.auth.getUser();
    user = verified.data.user ? { id: verified.data.user.id } : null;
  }

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";

  if (!user && !isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    /* Remember where they were headed, so signing in lands them there rather
       than dumping them on the dashboard. Only the path is kept — see the
       note on safeRedirect in the login action. */
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  /* The storefront never runs this. `_next` and the favicon are excluded so a
     stylesheet request does not cost a token verification. */
  matcher: ["/admin/:path*"],
};

/**
 * What the session cookie says about itself, without asking Supabase.
 *
 * `@supabase/ssr` stores the whole session as base64 in `sb-<ref>-auth-token`,
 * split across `.0`, `.1` … when it is long. That JSON carries `expires_at`,
 * so the expiry can be read locally — no network, no token parsing.
 *
 * Anything unexpected returns `needsRefresh: true`, which sends the request
 * down the verify-properly path. Failing towards the slower, safer branch is
 * the right way round for a guess about a cookie.
 */
function readSessionCookie(request: NextRequest): { present: boolean; needsRefresh: boolean } {
  const chunks = request.cookies
    .getAll()
    .filter((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"))
    /* `.0`, `.1`, … must be joined in order or the base64 is nonsense. */
    .sort((a, b) => a.name.localeCompare(b.name));

  if (chunks.length === 0) return { present: false, needsRefresh: false };

  try {
    const raw = chunks.map((c) => c.value).join("");
    const encoded = raw.startsWith("base64-") ? raw.slice("base64-".length) : raw;
    const session = JSON.parse(atob(encoded)) as { expires_at?: number };

    if (typeof session.expires_at !== "number") return { present: true, needsRefresh: true };

    /* Refresh with five minutes to spare, so a token never expires part-way
       through someone filling in a form. */
    const secondsLeft = session.expires_at - Math.floor(Date.now() / 1000);
    return { present: true, needsRefresh: secondsLeft < 5 * 60 };
  } catch {
    return { present: true, needsRefresh: true };
  }
}
