import { AdminButton } from "@/components/admin/ui/button";
import { AdminCard, AdminPageHeader } from "@/components/admin/ui/surface";
import { signOutAction } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/auth";
import { listActivity } from "@/lib/activity";

export const metadata = { title: "Account" };

/**
 * Who you are signed in as, and the way out.
 *
 * Deliberately thin. Passwords and email changes are handled by Supabase, not
 * here — building a password form would mean this app touching credentials it
 * has no reason to see.
 */
export default async function AccountPage() {
  const admin = await requireAdmin();

  /* The last few things this person did, as a "was that you?" check. */
  const recent = (await listActivity(50)).filter((entry) => entry.adminName === admin.name).slice(0, 5);

  return (
    <>
      <AdminPageHeader title="Account" description="The account you are signed in with." />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard title="Signed in as">
          <dl>
            <Row term="Name" value={admin.name} />
            <Row term="Email" value={admin.email} />
            <Row term="Role" value={admin.role} />
          </dl>

          <form action={signOutAction} className="border-line mt-5 border-t pt-5">
            <AdminButton type="submit" variant="secondary">
              Sign out
            </AdminButton>
          </form>
        </AdminCard>

        <AdminCard title="Your recent changes" description="A quick way to spot something you did not do.">
          {recent.length === 0 ? (
            <p className="text-grey text-[13px]">Nothing yet.</p>
          ) : (
            <ul>
              {recent.map((entry) => (
                <li
                  key={entry.id}
                  className="border-line flex items-baseline justify-between gap-4 border-b py-2.5 last:border-0"
                >
                  <span className="text-ink text-[13px]">
                    {entry.actionLabel}
                    {entry.entityLabel ? <span className="text-grey"> · {entry.entityLabel}</span> : null}
                  </span>
                  <time
                    dateTime={entry.createdAt.toISOString()}
                    className="text-grey shrink-0 text-[12px]"
                  >
                    {formatWhen(entry.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <AdminCard title="Passwords and access" className="mt-6">
        <p className="text-grey text-[13px] leading-relaxed">
          Your password is managed by Supabase, not by this admin — change it from the Supabase
          dashboard under Authentication. Giving someone else access is a deliberate step too:
          create their account in Supabase, then run{" "}
          <code className="text-ink">npm run admin:create</code> with their email. Signing up alone
          grants nothing.
        </p>
      </AdminCard>
    </>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="border-line grid grid-cols-[7rem_1fr] gap-3 border-b py-2.5 last:border-0">
      <dt className="a-label pt-0.5">{term}</dt>
      <dd className="text-ink text-[13px] break-words">{value}</dd>
    </div>
  );
}

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
