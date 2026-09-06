import { AdminLinkButton } from "@/components/admin/ui/button";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/ui/surface";
import { EMPTY_PRODUCT, ProductForm } from "@/components/admin/products/product-form";
import { requireAdmin } from "@/lib/auth";
import { listShelvesForEditing } from "@/lib/repositories/categories";

export const metadata = { title: "New product" };

/**
 * A blank pair.
 *
 * It saves as a draft — there is no way to create something already live,
 * because a product that has never been previewed should not be the shop's
 * problem. Publishing is a second, deliberate action once the form is full.
 */
export default async function NewProductPage() {
  await requireAdmin();

  /* Hidden shelves included: a pair can be written up against a shelf that is
     not live yet, and the form's select is the only place to choose one. */
  const shelves = await listShelvesForEditing();

  return (
    <>
      <AdminPageHeader
        title="New product"
        description="Saves as a draft. Publish it once the photographs and sizes are in."
        action={
          <AdminLinkButton href="/admin/products" variant="secondary">
            Back to products
          </AdminLinkButton>
        }
      />
      {shelves.length === 0 ? (
        <AdminEmptyState
          title="Add a category first"
          description="Every pair sits on a shelf, and there are none yet. Shelves are what the header links to and what the shop filters by."
          action={
            <AdminLinkButton href="/admin/categories/new" variant="primary">
              New category
            </AdminLinkButton>
          }
        />
      ) : (
        <ProductForm initial={EMPTY_PRODUCT} shelves={shelves} />
      )}
    </>
  );
}
