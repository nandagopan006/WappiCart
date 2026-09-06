"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { eq, inArray } from "drizzle-orm";

import { recordActivity } from "@/lib/activity";
import { requireAdminForAction } from "@/lib/auth";
import { db } from "@/lib/db";
import { homepageProductSelections, homepageSections, products } from "@/lib/db/schema";
import { HOMEPAGE_TAG } from "@/lib/repositories/homepage";
import { homepageLayoutSchema, toFieldErrorsOf } from "@/lib/validation/homepage";

/**
 * Saving the home page's composition.
 *
 * ── One save for the whole page ──────────────────────────────────────────
 * Order is a property of the set, not of any one section: two rows claiming
 * position 3 is only detectable by looking at all of them, and the database's
 * unique constraint on `position` would otherwise reject a legitimate reorder
 * halfway through. So the editor sends the entire layout and this writes it
 * in one transaction.
 *
 * ── Positions are renumbered, not trusted ────────────────────────────────
 * Whatever order the array arrives in becomes 0, 1, 2… That means the client
 * never has to compute positions correctly, and a gap left by a deleted
 * section closes itself.
 *
 * ── Why the positions are cleared first ──────────────────────────────────
 * `position` is unique. Updating rows one at a time from [0,1,2] to [1,0,2]
 * collides on the very first statement. Every row is moved out of the way to
 * a negative offset, then written to its final place — a two-pass shuffle
 * inside one transaction, so nothing observes the intermediate state.
 */

export type HomepageActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function saveHomepageLayoutAction(raw: unknown): Promise<HomepageActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: "Your session has expired. Sign in again." };

  const parsed = homepageLayoutSchema.safeParse(raw);
  if (!parsed.success) {
    const first = toFieldErrorsOf(parsed.error);
    return { ok: false, error: first };
  }

  const sections = parsed.data;

  try {
    /* Resolve pinned slugs to ids up front. A slug that no longer exists is
       dropped rather than failing the save — the pair was probably archived
       while the editor had this screen open, and losing one pin is a better
       outcome than losing the whole arrangement. */
    const allSlugs = [...new Set(sections.flatMap((s) => s.productSlugs))];
    const idBySlug = new Map<string, string>();

    if (allSlugs.length > 0) {
      const rows = await db
        .select({ id: products.id, slug: products.slug })
        .from(products)
        .where(inArray(products.slug, allSlugs));
      for (const row of rows) idBySlug.set(row.slug, row.id);
    }

    await db.transaction(async (tx) => {
      /* Pass one: park every row somewhere it cannot collide. */
      for (const [index, section] of sections.entries()) {
        await tx
          .update(homepageSections)
          .set({ position: -(index + 1) })
          .where(eq(homepageSections.id, section.id));
      }

      /* Pass two: write the real arrangement. */
      for (const [index, section] of sections.entries()) {
        await tx
          .update(homepageSections)
          .set({
            position: index,
            enabled: section.enabled,
            title: section.title?.trim() || null,
            description: section.description?.trim() || null,
            itemLimit: section.itemLimit ?? null,
            config: (section.config ?? {}) as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(homepageSections.id, section.id));

        await tx
          .delete(homepageProductSelections)
          .where(eq(homepageProductSelections.sectionId, section.id));

        const picks = section.productSlugs
          .map((slug) => idBySlug.get(slug))
          .filter((id): id is string => Boolean(id));

        if (picks.length > 0) {
          await tx.insert(homepageProductSelections).values(
            /* De-duplicated: the composite key would reject a repeat, and the
               same pair chosen twice in one section is a slip. */
            [...new Set(picks)].map((productId, position) => ({
              sectionId: section.id,
              productId,
              position,
            })),
          );
        }
      }
    });

    await recordActivity({
      adminId: auth.admin.id,
      action: "homepage.updated",
      entityType: "homepage",
      entityLabel: "Home page",
      metadata: {
        sections: sections.length,
        enabled: sections.filter((s) => s.enabled).length,
      },
    });

    revalidateTag(HOMEPAGE_TAG);
    revalidatePath("/");
    revalidatePath("/admin/homepage");

    return { ok: true, message: "Home page saved." };
  } catch (error) {
    console.error("[saveHomepageLayoutAction]", error);
    return { ok: false, error: "Could not save the layout. Nothing was changed — try again." };
  }
}
