import { MediaGrid } from "@/components/admin/media/media-grid";
import { AdminPageHeader } from "@/components/admin/ui/surface";
import { requireAdmin } from "@/lib/auth";
import { listStoredObjects } from "@/lib/repositories/media";

export const metadata = { title: "Media" };

/**
 * Everything uploaded, and what uses it.
 *
 * The listing walks the bucket and annotates each object with the products
 * that reference it, because "is this safe to delete?" is the only question
 * this page really has to answer. The starting twelve products use Unsplash
 * placeholders, which are not in the bucket and are not this shop's to
 * manage — they will not appear here until real photography replaces them.
 */
export default async function MediaPage() {
  await requireAdmin();

  const items = await listStoredObjects();

  return (
    <>
      <AdminPageHeader
        title="Media"
        description="Photographs uploaded from a product's editor."
      />
      <MediaGrid items={items} />
    </>
  );
}
