import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/categories/category-form";
import { AdminLinkButton } from "@/components/admin/ui/button";
import { AdminPageHeader } from "@/components/admin/ui/surface";
import { requireAdmin } from "@/lib/auth";
import { getShelf, shelfUsage } from "@/lib/repositories/categories";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const shelf = await getShelf(slug);
  return { title: shelf ? shelf.name : "Category" };
}

/**
 * Edit one shelf.
 *
 * The slug is shown but not editable — see the note in CategoryForm. What can
 * be changed is everything a shopper actually reads: the name, the blurb, the
 * photograph and whether the shelf is on the shop at all.
 */
export default async function EditCategoryPage({ params }: Params) {
  await requireAdmin();

  const { slug } = await params;
  const shelf = await getShelf(slug);

  if (!shelf) notFound();

  const usage = await shelfUsage();
  const pairs = usage[shelf.slug]?.total ?? 0;

  return (
    <>
      <AdminPageHeader
        title={shelf.name}
        description={`/shop?c=${shelf.slug}`}
        action={
          <AdminLinkButton href="/admin/categories" variant="secondary">
            Back to categories
          </AdminLinkButton>
        }
      />
      <CategoryForm
        editing
        pairCount={pairs}
        initial={{
          slug: shelf.slug,
          name: shelf.name,
          description: shelf.description,
          imageUrl: shelf.imageUrl ?? "",
          enabled: shelf.enabled,
        }}
      />
    </>
  );
}
