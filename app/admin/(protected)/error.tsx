"use client";

import { useEffect } from "react";

import { AdminButton, AdminLinkButton } from "@/components/admin/ui/button";
import { AdminCard, AdminPageHeader } from "@/components/admin/ui/surface";

/**
 * What an admin sees when a screen fails.
 *
 * Separate from the storefront's version because the audience is different.
 * A shopper needs reassurance; whoever runs the shop needs to know whether
 * their last save went through, and needs the reference number to hand to
 * anyone looking at the logs.
 *
 * The error text itself still stays on the server. It can carry a query or a
 * table name, and a browser is not where that belongs — even an admin's.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <>
      <AdminPageHeader
        title="Something went wrong"
        description="This screen could not be loaded."
      />

      <AdminCard title="What to do">
        <p className="text-grey text-[13px] leading-relaxed">
          Try again first — a brief loss of connection to the database is the usual cause and it
          clears on its own. If it keeps happening, the exact error is in the terminal running the
          server.
        </p>

        <p className="text-grey mt-3 text-[13px] leading-relaxed">
          <strong className="text-ink">If you were saving something:</strong> check the record
          before saving again. Saves are written in one go, so a failed save changed nothing — but
          it is worth confirming rather than assuming.
        </p>

        {error.digest ? (
          <p className="a-label mt-4">Reference {error.digest}</p>
        ) : null}

        <div className="mt-5 flex gap-2">
          <AdminButton type="button" variant="primary" onClick={reset}>
            Try again
          </AdminButton>
          <AdminLinkButton href="/admin" variant="secondary">
            Back to the dashboard
          </AdminLinkButton>
        </div>
      </AdminCard>
    </>
  );
}
