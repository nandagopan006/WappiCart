import { SeoForm } from "@/components/admin/settings/settings-forms";
import { AdminPageHeader } from "@/components/admin/ui/surface";
import { requireAdmin } from "@/lib/auth";
import { getShopSettings } from "@/lib/shop";

export const metadata = { title: "SEO" };

export default async function SeoPage() {
  await requireAdmin();
  const { seo } = await getShopSettings();

  return (
    <>
      <AdminPageHeader
        title="SEO"
        description="How the shop reads in search results and when a link is forwarded."
      />
      <SeoForm
        initial={{
          siteTitle: seo.siteTitle,
          metaDescription: seo.metaDescription,
          ogTitle: seo.ogTitle,
          ogDescription: seo.ogDescription,
          ogImageUrl: seo.ogImageUrl ?? "",
        }}
      />
    </>
  );
}
