"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AdminSubmitButton } from "@/components/admin/ui/button";
import { AdminInput } from "@/components/admin/ui/fields";
import { createClient } from "@/lib/supabase/client";

/**
 * The sign-in form.
 *
 * ── Why this one thing runs in the browser ───────────────────────────────
 * Everything else the admin does goes through a Server Action. Sign-in is the
 * exception because `signInWithPassword` has to run where the session cookies
 * will live. Supabase writes them to the browser it is called from; called on
 * the server, the tokens would land in the wrong place and the visitor would
 * appear signed out.
 *
 * Only the publishable key reaches here, which is designed to be public. It
 * grants nothing on its own — being authenticated is not being an admin, and
 * that second question is answered server-side against `admin_profiles`.
 *
 * ── Why the redirect is a hard navigation ────────────────────────────────
 * `router.refresh()` then `push` would work, but the layout that has to
 * re-run is the one that reads the cookie this call just wrote. A full
 * navigation is the reliable way to make the server see the new session on
 * the very next request, and this happens once per session.
 *
 * ── The error message is deliberately vague ──────────────────────────────
 * "Those details did not work" rather than "no such user" or "wrong
 * password". Distinguishing the two turns the form into a way to discover
 * which email addresses have accounts.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError("Those details did not work. Check the email and password and try again.");
        setPending(false);
        return;
      }

      /* Kept pending through the navigation: flipping it back would flash an
         enabled button for the moment before the page changes, which reads as
         the click having failed. */
      window.location.assign(next);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <AdminInput
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <AdminInput
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error ? (
        <p role="alert" className="border-love/40 text-love mb-5 border px-3 py-2 text-[13px]">
          {error}
        </p>
      ) : null}

      <AdminSubmitButton pending={pending} pendingLabel="Signing in…" className="w-full">
        Sign in
      </AdminSubmitButton>
    </form>
  );
}
