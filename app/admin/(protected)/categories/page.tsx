import { CategoryTable } from "@/components/admin/categories/category-table";
import { AdminLinkButton } from "@/components/admin/ui/button";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/ui/surface";
import { requireAdmin } from "@/lib/auth";
import { listShelvesForEditing, shelfUsage } from "@/lib/repositories/categories";

/**
 * The shelves.
 *
 * Everything the shop browses by lives here: the header's nav row, the shop
 * page's filter row and the home page's shelf tiles all render this list in
 * this order.
 *
 * Hidden shelves are shown, unlike on the storefront — an editor has to be
 * able to see and reach the one they turned off.
 */

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireAdmin();

  /* Sequential, not Promise.all: the transaction pooler resets a connection
     asked to pipeline two reads down it at once. */
  const shelves = await listShelvesForEditing();
  const usage = await shelfUsage();

  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="What the shop browses by. Their names, blurbs, order and visibility."
        action={
          <AdminLinkButton href="/admin/categories/new" variant="primary">
            New category
          </AdminLinkButton>
        }
      />

      {shelves.length === 0 ? (
        <AdminEmptyState
          title="No categories yet"
          description="A shelf is what the header links to and what the shop filters by. Add the first one, or run npm run db:seed to create the starting four."
          action={
            <AdminLinkButton href="/admin/categories/new" variant="primary">
              New category
            </AdminLinkButton>
          }
        />
      ) : (
        <CategoryTable shelves={shelves} usage={usage} />
      )}
    </>
  );
}
