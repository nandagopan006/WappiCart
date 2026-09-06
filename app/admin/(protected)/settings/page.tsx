import { ShopSettingsForm } from "@/components/admin/settings/settings-forms";
import { AdminPageHeader } from "@/components/admin/ui/surface";
import { requireAdmin } from "@/lib/auth";
import { getShopSettings } from "@/lib/shop";

export const metadata = { title: "Shop settings" };

export default async function ShopSettingsPage() {
  await requireAdmin();
  const { shop } = await getShopSettings();

  return (
    <>
      <AdminPageHeader
        title="Shop settings"
        description="The shop's name, its number, and what it promises. These appear on every page."
      />
      <ShopSettingsForm
        initial={{
          name: shop.name,
          tagline: shop.tagline,
          whatsappPhone: shop.phone,
          instagram: shop.instagram,
          instagramHandle: shop.instagramHandle,
          deliveryAreas: shop.deliveryAreas,
          returnWindow: shop.returnWindow,
          replyTime: shop.replyTime,
          siteUrl: shop.url,
        }}
      />
    </>
  );
}
