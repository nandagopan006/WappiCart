import { HomepageEditor, type EditorSection } from "@/components/admin/homepage/homepage-editor";
import { AdminLinkButton } from "@/components/admin/ui/button";
import { AdminPageHeader } from "@/components/admin/ui/surface";
import { requireAdmin } from "@/lib/auth";
import { listShelvesForEditing } from "@/lib/repositories/categories";
import { listHomepageSections } from "@/lib/repositories/homepage";
import { listProducts } from "@/lib/repositories/products";

export const metadata = { title: "Homepage" };

/**
 * Arranging the home page.
 *
 * The product list offered for pinning is published pairs only — pinning a
 * draft would put a slug in the layout that the storefront cannot resolve,
 * and the section would silently fall back as though the choice had never
 * been made.
 */
export default async function HomepagePage() {
  await requireAdmin();

  const sections = await listHomepageSections();
  const shelves = await listShelvesForEditing();
  const catalogue = await listProducts({ status: "published", sort: "shelf", pageSize: 200, withDetails: false });

  const initial: EditorSection[] = sections.map((s) => ({
    id: s.id,
    type: s.type,
    title: s.title,
    description: s.description,
    enabled: s.enabled,
    position: s.position,
    itemLimit: s.itemLimit,
    config: s.config,
    productSlugs: s.productSlugs,
  }));

  return (
    <>
      <AdminPageHeader
        title="Homepage"
        description="Order, visibility, copy and which pairs each section shows."
        action={
          <AdminLinkButton href="/" target="_blank" rel="noopener noreferrer" variant="secondary">
            View the shop ↗
          </AdminLinkButton>
        }
      />

      {initial.length === 0 ? (
        <div className="border-line border border-dashed px-6 py-14 text-center">
          <p className="text-ink text-[13px] tracking-[0.08em] uppercase">No sections yet</p>
          <p className="text-grey mx-auto mt-3 max-w-md text-[13px]">
            Run <code className="text-ink">npm run db:seed</code> to create the page&rsquo;s
            shipped arrangement.
          </p>
        </div>
      ) : (
        <HomepageEditor
          initial={initial}
          shelves={shelves}
          productOptions={catalogue.rows.map((p) => ({
            slug: p.slug,
            name: p.name,
            category: p.category,
          }))}
        />
      )}
    </>
  );
}
