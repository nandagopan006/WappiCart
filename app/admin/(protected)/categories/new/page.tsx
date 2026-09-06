import { CategoryForm, EMPTY_CATEGORY } from "@/components/admin/categories/category-form";
import { AdminLinkButton } from "@/components/admin/ui/button";
import { AdminPageHeader } from "@/components/admin/ui/surface";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "New category" };

/**
 * A blank shelf.
 *
 * It lands at the end of the order and visible by default — a shelf is added
 * because it is wanted, and an editor who wants to prepare one quietly can
 * clear the checkbox before saving.
 */
export default async function NewCategoryPage() {
  await requireAdmin();

  return (
    <>
      <AdminPageHeader
        title="New category"
        description="The slug is chosen once here — it becomes this shelf's web address."
        action={
          <AdminLinkButton href="/admin/categories" variant="secondary">
            Back to categories
          </AdminLinkButton>
        }
      />
      <CategoryForm initial={EMPTY_CATEGORY} />
    </>
  );
}
