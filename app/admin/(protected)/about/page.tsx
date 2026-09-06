import { AboutForm } from "@/components/admin/settings/settings-forms";
import { AdminLinkButton } from "@/components/admin/ui/button";
import { AdminPageHeader } from "@/components/admin/ui/surface";
import { requireAdmin } from "@/lib/auth";
import { ABOUT_FALLBACK, getAboutForEditing } from "@/lib/repositories/settings";

export const metadata = { title: "About" };

/**
 * The About page's content.
 *
 * Loaded undefaulted — the form shows what is actually stored, with the
 * shipped wording as a placeholder. Pre-filling it with the fallback would
 * let an editor save it by accident and turn shipped copy into content they
 * now own and have to maintain.
 */
export default async function AboutAdminPage() {
  await requireAdmin();
  const about = await getAboutForEditing();

  return (
    <>
      <AdminPageHeader
        title="About"
        description="The page where somebody decides whether to trust a shop that has no cart."
        action={
          <AdminLinkButton href="/about" target="_blank" rel="noopener noreferrer" variant="secondary">
            View the page ↗
          </AdminLinkButton>
        }
      />
      <AboutForm
        initial={{
          headline: about.headline,
          body: about.body,
          deliveryInfo: about.deliveryInfo,
          returnsInfo: about.returnsInfo,
          hours: about.hours,
          photographyNote: about.photographyNote,
        }}
        fallback={{
          headline: ABOUT_FALLBACK.headline,
          body: ABOUT_FALLBACK.body,
          photographyNote: ABOUT_FALLBACK.photographyNote,
        }}
      />
    </>
  );
}
