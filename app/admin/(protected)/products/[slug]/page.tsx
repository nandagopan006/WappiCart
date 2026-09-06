import { notFound } from "next/navigation";

import { ProductForm, type ProductFormValue } from "@/components/admin/products/product-form";
import { AdminLinkButton } from "@/components/admin/ui/button";
import { AdminPageHeader } from "@/components/admin/ui/surface";
import { requireAdmin } from "@/lib/auth";
import { listShelvesForEditing } from "@/lib/repositories/categories";
import { getEditableProduct } from "@/lib/repositories/product-write";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const product = await getEditableProduct(slug);
  return { title: product ? product.name : "Product" };
}

/**
 * Edit one pair.
 *
 * Loaded through the write repository rather than `lib/products.ts`, because
 * the editor has to be able to open a draft or an archived product — the
 * storefront's reader cannot see either, by design.
 */
export default async function EditProductPage({ params }: Params) {
  await requireAdmin();

  const { slug } = await params;
  const product = await getEditableProduct(slug);

  if (!product) notFound();

  const shelves = await listShelvesForEditing();

  const initial: ProductFormValue = {
    slug: product.slug,
    name: product.name,
    categorySlug: product.categorySlug,
    price: product.price,
    mrp: product.mrp ?? "",
    colour: product.colour,
    material: product.material,
    fitNote: product.fitNote ?? "",
    description: product.description,
    care: product.care,
    sku: product.sku,
    featured: product.featured,
    isNew: product.isNew,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    seoImageUrl: product.seoImageUrl ?? "",
    images: product.images.map((i) => ({
      id: i.id,
      url: i.url,
      alt: i.alt,
      storagePath: i.storagePath ?? null,
    })),
    sizes: product.sizes,
  };

  return (
    <>
      <AdminPageHeader
        title={product.name}
        description={`/p/${product.slug}`}
        action={
          <AdminLinkButton href="/admin/products" variant="secondary">
            Back to products
          </AdminLinkButton>
        }
      />
      <ProductForm
        initial={initial}
        shelves={shelves}
        productId={product.id}
        status={product.status}
      />
    </>
  );
}
