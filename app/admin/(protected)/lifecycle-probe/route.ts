/**
 * An integration test for the product server actions, run as an HTTP route.
 *
 * ── Why it lives in the app rather than in a script ──────────────────────
 * The actions and the write repository are `server-only`, which means a plain
 * `tsx` process cannot import them — the marker module throws outside Next's
 * server build. Testing them through a route is the only way to exercise the
 * real code path, auth check and all, rather than a reimplementation of it.
 *
 * ── It is inert in production ────────────────────────────────────────────
 * It creates and deletes real rows, so it must never be reachable on a live
 * shop. The guard below is the first thing it does; `requireAdmin` is the
 * second. Driven by `npm run check:lifecycle`.
 */
import { eq } from "drizzle-orm";

import {
  archiveProductAction,
  deleteProductAction,
  duplicateProductAction,
  publishProductAction,
  restoreProductAction,
  saveProductAction,
  unpublishProductAction,
} from "@/lib/actions/products";
import { listActivity } from "@/lib/activity";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { activityLogs, productImages, productSizes, products } from "@/lib/db/schema";
import { deleteStoredImageAction, uploadProductImageAction } from "@/lib/actions/media";
import { getEditableProduct } from "@/lib/repositories/product-write";
import { countImageReferences } from "@/lib/repositories/media";
import { saveHomepageLayoutAction } from "@/lib/actions/homepage";
import { getHomepageLayout, listHomepageSections } from "@/lib/repositories/homepage";
import {
  saveAboutAction,
  saveSeoSettingsAction,
  saveShopSettingsAction,
} from "@/lib/actions/settings";
import {
  createCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
  toggleCategoryAction,
  updateCategoryAction,
} from "@/lib/actions/categories";
import { getAboutForEditing } from "@/lib/repositories/settings";
import { getShelves, listShelvesForEditing } from "@/lib/repositories/categories";
import { getShopSettings } from "@/lib/shop";
import { isAllowedImageUrl } from "@/lib/validation/product";

export const dynamic = "force-dynamic";

const SLUG = "lifecycle-probe-shoe";
const IMG = "https://images.unsplash.com/photo-1544441892-794166f1e3be?auto=format&w=800";

export async function GET() {
  /* Never on a live shop — this writes to the catalogue. */
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  await requireAdmin();

  const out: string[] = [];
  const ok = (label: string, pass: boolean, extra = "") =>
    out.push(`${pass ? "OK  " : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);

  const base = {
    slug: SLUG,
    name: "Lifecycle Probe",
    categorySlug: "sneakers" as const,
    price: 1999,
    mrp: null,
    colour: "Test",
    material: "Test material",
    fitNote: null,
    description: "A probe product created by the lifecycle check.",
    care: "Delete it.",
    sku: "WPC-PROBE-1",
    featured: false,
    isNew: false,
    seoTitle: null,
    seoDescription: null,
    seoImageUrl: null,
    images: [] as { url: string; alt: string }[],
    sizes: [] as number[],
  };

  /* Reap anything an interrupted earlier run left behind. A killed request
     never reaches its `finally`, and a leftover probe product would fail the
     very first assertion of the next run on a duplicate slug. */
  await purgeProbeRows();

  try {
    /* 1. Create as draft */
    const created = await saveProductAction(base);
    ok("create draft", created.ok, created.ok ? "" : created.error);
    if (!created.ok) return Response.json({ out }, { status: 500 });

    let row = await getEditableProduct(SLUG);
    ok("saved as draft, not published", row?.status === "draft", row?.status);

    /* 2. Publishing an incomplete pair must be refused */
    const tooEarly = await publishProductAction(SLUG);
    ok("publish refused while incomplete", !tooEarly.ok, tooEarly.ok ? "was allowed" : tooEarly.error.slice(0, 60));

    /* 3. Duplicate slug/SKU must be refused with a field error */
    const dupe = await saveProductAction({ ...base, name: "Clash" });
    ok(
      "duplicate slug refused",
      !dupe.ok && Boolean(dupe.fieldErrors?.slug),
      dupe.ok ? "was allowed" : (dupe.fieldErrors?.slug ?? "").slice(0, 40),
    );

    /* 4. MRP below price must be refused */
    const badMrp = await saveProductAction({ ...base, mrp: 500 }, { id: row!.id });
    ok("mrp below price refused", !badMrp.ok && Boolean(badMrp.fieldErrors?.mrp));

    /* 5. Short alt text must be refused */
    const shortAlt = await saveProductAction(
      { ...base, images: [{ url: IMG, alt: "shoe" }] },
      { id: row!.id },
    );
    ok("alt under 20 chars refused", !shortAlt.ok, shortAlt.ok ? "was allowed" : "");

    /* 6. Size outside the run must be refused */
    const badSize = await saveProductAction({ ...base, sizes: [13] }, { id: row!.id });
    ok("size outside 6-11 refused", !badSize.ok, badSize.ok ? "was allowed" : "");

    /* 7. Complete it, then publish */
    const complete = {
      ...base,
      images: [
        { url: IMG, alt: "Probe shoe in white leather, side profile on concrete" },
        { url: IMG, alt: "Probe shoe in white leather, seen from above" },
      ],
      sizes: [8, 9, 10],
    };
    const filled = await saveProductAction(complete, { id: row!.id });
    ok("save complete draft", filled.ok, filled.ok ? "" : filled.error);

    const published = await publishProductAction(SLUG);
    ok("publish now allowed", published.ok, published.ok ? "" : published.error);

    row = await getEditableProduct(SLUG);
    ok("status is published", row?.status === "published", row?.status);
    ok("publishedAt set", Boolean(row?.publishedAt));
    ok("2 images stored in order", row?.images.length === 2, String(row?.images.length));
    ok("3 sizes stored", row?.sizes.join(",") === "8,9,10", row?.sizes.join(","));

    /* 8. Storefront must now see it */
    const { getProduct } = await import("@/lib/products");
    const onShelf = await getProduct(SLUG);
    ok("visible to the storefront", Boolean(onShelf));

    /* 9. Unpublish → storefront must lose it */
    const un = await unpublishProductAction(SLUG);
    ok("unpublish", un.ok);
    const goneFromShelf = await getProduct(SLUG);
    ok("hidden from the storefront once unpublished", !goneFromShelf);

    /* 10. Duplicate */
    const copy = await duplicateProductAction(SLUG);
    ok("duplicate", copy.ok, copy.ok ? copy.slug : copy.error);
    let copyRowId: string | null = null;
    if (copy.ok) {
      const copyRow = await getEditableProduct(copy.slug);
      /* Held for the delete section below — once the row is gone there is no
         way left to ask what its id was. */
      copyRowId = copyRow?.id ?? null;
      ok("copy is a draft", copyRow?.status === "draft", copyRow?.status);
      ok("copy has its own SKU", copyRow?.sku !== base.sku, copyRow?.sku);
      ok("copy is never featured", copyRow?.featured === false);
    }

    /* 11. Archive then restore */
    const arch = await archiveProductAction(SLUG);
    ok("archive", arch.ok);
    row = await getEditableProduct(SLUG);
    ok("status is archived", row?.status === "archived", row?.status);

    const rest = await restoreProductAction(SLUG);
    ok("restore", rest.ok);
    row = await getEditableProduct(SLUG);
    ok("restored as draft", row?.status === "draft", row?.status);

    /* ── Media ────────────────────────────────────────────────────── */

    /* A 1x1 PNG, built here so the test needs no fixture on disk. */
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );

    const upload = async (name: string, type: string, bytes: Buffer) => {
      const fd = new FormData();
      fd.append("file", new File([new Uint8Array(bytes)], name, { type }), name);
      fd.append("productRef", SLUG);
      return uploadProductImageAction(fd);
    };

    /* A deliberately hostile filename: traversal, a null byte, spaces and a
       double extension. None of it may survive into the stored path. */
    const NASTY = "../../etc/pa ss wd.php.png";
    const good = await upload(NASTY, "image/png", png);
    ok("upload a PNG", good.ok, good.ok ? "" : good.error);

    let uploadedPath: string | null = null;
    if (good.ok) {
      uploadedPath = good.storagePath;
      ok("stored path is namespaced and random", /^products\/[a-z0-9-]+\/\d+-[0-9a-f]{8}\.png$/.test(good.storagePath), good.storagePath);
      const basename = good.storagePath.split("/").pop() ?? "";
      ok(
        "hostile filename discarded entirely",
        !basename.includes("passwd") &&
          !basename.includes("php") &&
          !good.storagePath.includes("..") &&
          !good.storagePath.includes(" ") &&
          !good.storagePath.includes(" "),
        basename,
      );
      ok("returned URL passes the storefront allow-list", isAllowedImageUrl(good.url));
    }

    /* Wrong type must be refused */
    const badType = await upload("notes.txt", "text/plain", Buffer.from("hello"));
    ok("non-image refused", !badType.ok, badType.ok ? "was allowed" : "");

    /* HEIC gets its own message */
    const heic = await upload("photo.heic", "image/heic", png);
    ok(
      "HEIC refused with a useful message",
      !heic.ok && heic.error.includes("Most Compatible"),
      heic.ok ? "was allowed" : heic.error.slice(0, 40),
    );

    /* Oversize must be refused before it uploads */
    const big = Buffer.alloc(11 * 1024 * 1024, 1);
    const tooBig = await upload("huge.png", "image/png", big);
    ok("over 10MB refused", !tooBig.ok && tooBig.error.includes("10MB"), tooBig.ok ? "was allowed" : "");

    /* A path this shop did not upload must be refused */
    const traversal = await deleteStoredImageAction("../../secrets/key.png");
    ok("path traversal refused", !traversal.ok, traversal.ok ? "was allowed" : "");

    if (uploadedPath) {
      /* Attach it to the product, then deletion must be refused */
      const attached = await saveProductAction(
        {
          ...complete,
          images: [
            { url: good.ok ? good.url : "", alt: "Probe shoe photographed against a plain wall", storagePath: uploadedPath },
            complete.images[1],
          ],
        },
        { id: row!.id },
      );
      ok("attach uploaded image to product", attached.ok, attached.ok ? "" : attached.error);

      const refs = await countImageReferences(uploadedPath);
      ok("reference counted", refs.count === 1, String(refs.count));

      const blocked = await deleteStoredImageAction(uploadedPath);
      ok("delete refused while in use", !blocked.ok, blocked.ok ? "was allowed" : blocked.error.slice(0, 50));

      /* Detach, then deletion must succeed */
      await saveProductAction(complete, { id: row!.id });
      const freed = await deleteStoredImageAction(uploadedPath);
      ok("delete allowed once unreferenced", freed.ok, freed.ok ? "" : freed.error);
    }

    /* ── Homepage CMS ─────────────────────────────────────────────── */

    const original = await listHomepageSections();
    ok("sections loaded", original.length === 9, String(original.length));

    const heroFirst = original[0]?.type === "hero";
    ok("hero is first", heroFirst, original[0]?.type);

    /* Turning everything off must be refused — a blank home page is not a
       state the editor should be able to save. */
    const allOff = await saveHomepageLayoutAction(
      original.map((s) => ({ ...s, enabled: false })),
    );
    ok("refuses to disable every section", !allOff.ok, allOff.ok ? "was allowed" : "");

    /* An item limit outside the section's bounds must be refused. */
    const badLimit = await saveHomepageLayoutAction(
      original.map((s) => (s.type === "collection_spread" ? { ...s, itemLimit: 9 } : s)),
    );
    ok("refuses an out-of-range item count", !badLimit.ok, badLimit.ok ? "was allowed" : "");

    /* Reorder: move the last section to the front, then check the storefront. */
    const reordered = [original[original.length - 1], ...original.slice(0, -1)];
    const moved = await saveHomepageLayoutAction(reordered.map((s, i) => ({ ...s, position: i })));
    ok("reorder saved", moved.ok, moved.ok ? "" : moved.error);

    const afterMove = await listHomepageSections();
    ok("order changed in the database", afterMove[0]?.type === "order_block", afterMove[0]?.type);

    /* Turn one section off and confirm the storefront layout loses it. */
    const withOneOff = afterMove.map((s) =>
      s.type === "brand_statement" ? { ...s, enabled: false } : s,
    );
    const offSaved = await saveHomepageLayoutAction(withOneOff.map((s, i) => ({ ...s, position: i })));
    ok("disable one section", offSaved.ok, offSaved.ok ? "" : offSaved.error);

    const live = await getHomepageLayout();
    ok(
      "disabled section absent from the storefront layout",
      !live.some((s) => s.type === "brand_statement"),
      `${live.length} enabled`,
    );

    /* Pin a specific pair to the hero and confirm it is stored. */
    const pinned = withOneOff.map((s) =>
      s.type === "hero" ? { ...s, productSlugs: ["derby-plain-tan"] } : s,
    );
    const pinSaved = await saveHomepageLayoutAction(pinned.map((s, i) => ({ ...s, position: i })));
    ok("pin a pair to the hero", pinSaved.ok, pinSaved.ok ? "" : pinSaved.error);

    const afterPin = await listHomepageSections();
    ok(
      "pinned slug stored",
      afterPin.find((s) => s.type === "hero")?.productSlugs[0] === "derby-plain-tan",
      afterPin.find((s) => s.type === "hero")?.productSlugs.join(",") || "(none)",
    );

    /* Restore exactly what was there before, so the shop is unchanged. */
    const restored = await saveHomepageLayoutAction(
      original.map((s, i) => ({ ...s, position: i })),
    );
    ok("original arrangement restored", restored.ok, restored.ok ? "" : restored.error);

    const finalLayout = await listHomepageSections();
    ok(
      "back to the shipped order",
      finalLayout.map((s) => s.type).join(",") === original.map((s) => s.type).join(","),
      finalLayout.map((s) => s.type).join(","),
    );
    ok(
      "all sections enabled again",
      finalLayout.every((s) => s.enabled),
      `${finalLayout.filter((s) => s.enabled).length}/${finalLayout.length}`,
    );
    ok(
      "hero pin cleared",
      (finalLayout.find((s) => s.type === "hero")?.productSlugs.length ?? 0) === 0,
    );

    /* ── Settings, SEO, About, Categories ─────────────────────────── */

    const { shop: shopBefore, seo: seoBefore } = await getShopSettings();
    const aboutBefore = await getAboutForEditing();
    const shelvesBefore = await listShelvesForEditing();

    const shopPayload = {
      name: shopBefore.name,
      tagline: shopBefore.tagline,
      whatsappPhone: shopBefore.phone,
      instagram: shopBefore.instagram,
      instagramHandle: shopBefore.instagramHandle,
      deliveryAreas: shopBefore.deliveryAreas,
      returnWindow: shopBefore.returnWindow,
      replyTime: shopBefore.replyTime,
      siteUrl: shopBefore.url,
    };

    /* A phone number with formatting must be accepted and normalised. */
    const messyPhone = await saveShopSettingsAction({
      ...shopPayload,
      whatsappPhone: "+91 98765 43210",
    });
    ok("phone with spaces and + accepted", messyPhone.ok, messyPhone.ok ? "" : messyPhone.error);

    const { shop: afterPhone } = await getShopSettings();
    ok("phone stored digits-only", afterPhone.phone === "919876543210", afterPhone.phone);

    /* Too short must be refused. */
    const shortPhone = await saveShopSettingsAction({ ...shopPayload, whatsappPhone: "12" });
    ok("short phone refused", !shortPhone.ok, shortPhone.ok ? "was allowed" : "");

    /* A trailing slash on the site URL doubles up in every generated link. */
    const trailing = await saveShopSettingsAction({
      ...shopPayload,
      siteUrl: "https://example.com/",
    });
    ok("trailing slash on site URL refused", !trailing.ok, trailing.ok ? "was allowed" : "");

    /* An empty shop name must be refused. */
    const noName = await saveShopSettingsAction({ ...shopPayload, name: "" });
    ok("empty shop name refused", !noName.ok, noName.ok ? "was allowed" : "");

    /* Restore the shop exactly. */
    const shopRestored = await saveShopSettingsAction(shopPayload);
    ok("shop settings restored", shopRestored.ok);
    const { shop: shopAfter } = await getShopSettings();
    ok("phone back to what it was", shopAfter.phone === shopBefore.phone, shopAfter.phone);

    /* SEO */
    const seoPayload = {
      siteTitle: seoBefore.siteTitle,
      metaDescription: seoBefore.metaDescription,
      ogTitle: seoBefore.ogTitle,
      ogDescription: seoBefore.ogDescription,
      ogImageUrl: seoBefore.ogImageUrl ?? "",
    };
    const seoSaved = await saveSeoSettingsAction({ ...seoPayload, siteTitle: "Probe title" });
    ok("seo saved", seoSaved.ok, seoSaved.ok ? "" : seoSaved.error);
    const { seo: seoMid } = await getShopSettings();
    ok("seo title changed", seoMid.siteTitle === "Probe title", seoMid.siteTitle);
    await saveSeoSettingsAction(seoPayload);
    const { seo: seoAfter } = await getShopSettings();
    ok("seo restored", seoAfter.siteTitle === seoBefore.siteTitle);

    /* About */
    const aboutPayload = {
      headline: aboutBefore.headline,
      body: aboutBefore.body,
      deliveryInfo: aboutBefore.deliveryInfo,
      returnsInfo: aboutBefore.returnsInfo,
      hours: aboutBefore.hours,
      photographyNote: aboutBefore.photographyNote,
      imageSlugs: [],
    };
    const aboutSaved = await saveAboutAction({ ...aboutPayload, headline: "Probe headline" });
    ok("about saved", aboutSaved.ok, aboutSaved.ok ? "" : aboutSaved.error);
    const aboutMid = await getAboutForEditing();
    ok("about headline changed", aboutMid.headline === "Probe headline", aboutMid.headline);
    await saveAboutAction(aboutPayload);
    const aboutAfter = await getAboutForEditing();
    ok("about restored", aboutAfter.headline === aboutBefore.headline);

    /* Categories — the full lifecycle, on a shelf the probe creates itself.

       It never touches the shop's real shelves beyond reading them: a probe
       that renames "loafers" and crashes halfway leaves the shop renamed. */
    const PROBE_SHELF = "lifecycle-probe-shelf";

    /* Left over from a run that died before its cleanup. */
    await deleteCategoryAction(PROBE_SHELF);

    const shelfCreated = await createCategoryAction({
      slug: PROBE_SHELF,
      name: "Probe Shelf",
      description: "Created by the lifecycle probe.",
      imageUrl: "",
      enabled: true,
    });
    ok("shelf created", shelfCreated.ok, shelfCreated.ok ? "" : shelfCreated.error);

    const afterCreate = await listShelvesForEditing();
    ok(
      "shelf stored",
      afterCreate.some((c) => c.slug === PROBE_SHELF),
      afterCreate.map((c) => c.slug).join(","),
    );
    ok(
      "new shelf lands last",
      afterCreate[afterCreate.length - 1]?.slug === PROBE_SHELF,
      afterCreate.map((c) => c.slug).join(","),
    );

    /* The storefront's own read — enabled shelves only, and the thing the
       header, the shop's filter row and the home page tiles all render. If the
       action's revalidate did not reach it, a new shelf would be invisible on
       the shop until the cache aged out. */
    const shopSees = await getShelves();
    ok(
      "storefront sees the new shelf",
      shopSees.some((c) => c.slug === PROBE_SHELF),
      shopSees.map((c) => c.slug).join(","),
    );

    const duplicate = await createCategoryAction({
      slug: PROBE_SHELF,
      name: "Probe Shelf Again",
      description: "",
      imageUrl: "",
      enabled: true,
    });
    ok("refuses a duplicate slug", !duplicate.ok, duplicate.ok ? "was allowed" : "");

    const reserved = await createCategoryAction({
      slug: "new",
      name: "Reserved",
      description: "",
      imageUrl: "",
      enabled: true,
    });
    ok("refuses a reserved slug", !reserved.ok, reserved.ok ? "was allowed" : "");

    const badSlug = await createCategoryAction({
      slug: "Not A Slug",
      name: "Bad",
      description: "",
      imageUrl: "",
      enabled: true,
    });
    ok("refuses a malformed slug", !badSlug.ok, badSlug.ok ? "was allowed" : "");

    /* A shelf photograph goes through next/image, which refuses a host that is
       not in remotePatterns — at render time, on a page that may already be
       prerendered. So the action has to refuse it at write time. */
    const badHost = await createCategoryAction({
      slug: "probe-bad-image",
      name: "Bad Image",
      description: "",
      imageUrl: "https://example.com/not-allowed.jpg",
      enabled: true,
    });
    ok("refuses a photograph from a host next/image cannot load", !badHost.ok, badHost.ok ? "was allowed" : "");
    if (badHost.ok) await deleteCategoryAction("probe-bad-image");

    const goodHost = await updateCategoryAction({
      slug: PROBE_SHELF,
      name: "Probe Shelf",
      description: "Created by the lifecycle probe.",
      imageUrl: IMG,
      enabled: true,
      position: 0,
    });
    ok("accepts a photograph from an allowed host", goodHost.ok, goodHost.ok ? "" : goodHost.error);

    /* Hiding a shelf that is already hidden is a no-op, not an error. The
       "last visible shelf" guard must not fire on a shelf that is not one. */
    await toggleCategoryAction({ slug: PROBE_SHELF, enabled: false });
    const hideAgain = await toggleCategoryAction({ slug: PROBE_SHELF, enabled: false });
    ok("hiding an already-hidden shelf is not an error", hideAgain.ok, hideAgain.ok ? "" : hideAgain.error);
    await toggleCategoryAction({ slug: PROBE_SHELF, enabled: true });

    const shelfRenamed = await updateCategoryAction({
      slug: PROBE_SHELF,
      name: "Probe Shelf Renamed",
      description: "Still the probe.",
      imageUrl: "",
      enabled: true,
      position: 0,
    });
    ok("shelf renamed", shelfRenamed.ok, shelfRenamed.ok ? "" : shelfRenamed.error);
    const renamedRows = await listShelvesForEditing();
    ok(
      "rename stored",
      renamedRows.find((c) => c.slug === PROBE_SHELF)?.name === "Probe Shelf Renamed",
      renamedRows.find((c) => c.slug === PROBE_SHELF)?.name,
    );

    const hidden = await toggleCategoryAction({ slug: PROBE_SHELF, enabled: false });
    ok("shelf hidden", hidden.ok, hidden.ok ? "" : hidden.error);
    const hiddenRows = await listShelvesForEditing();
    ok(
      "hidden stored",
      hiddenRows.find((c) => c.slug === PROBE_SHELF)?.enabled === false,
    );
    /* Hiding is a safety property, not just a flag: the storefront's reader
       must stop returning it, or a hidden shelf still shows in the header. */
    const hiddenFromShop = await getShelves();
    ok(
      "hidden shelf is gone from the storefront",
      !hiddenFromShop.some((c) => c.slug === PROBE_SHELF),
      hiddenFromShop.map((c) => c.slug).join(","),
    );

    /* Hiding every shelf leaves the header and the filter row empty. */
    for (const shelf of hiddenRows.filter((c) => c.enabled && c.slug !== PROBE_SHELF).slice(1)) {
      await toggleCategoryAction({ slug: shelf.slug, enabled: false });
    }
    const oneLeft = await listShelvesForEditing();
    const lastVisible = oneLeft.find((c) => c.enabled);
    const refusedLast = lastVisible
      ? await toggleCategoryAction({ slug: lastVisible.slug, enabled: false })
      : { ok: false as const, error: "no visible shelf to test with" };
    ok("refuses to hide the last visible shelf", !refusedLast.ok, refusedLast.ok ? "was allowed" : "");

    /* Put every shelf that started visible back. */
    for (const shelf of shelvesBefore.filter((c) => c.enabled)) {
      await toggleCategoryAction({ slug: shelf.slug, enabled: true });
    }
    const restoredVisibility = await listShelvesForEditing();
    ok(
      "visibility restored",
      shelvesBefore
        .filter((c) => c.enabled)
        .every((c) => restoredVisibility.find((r) => r.slug === c.slug)?.enabled),
    );

    /* Reorder: send the probe's shelf to the front, then put it back. */
    const beforeOrder = (await listShelvesForEditing()).map((c) => c.slug);
    const shelfMoved = await reorderCategoriesAction([
      PROBE_SHELF,
      ...beforeOrder.filter((s) => s !== PROBE_SHELF),
    ]);
    ok("shelves reordered", shelfMoved.ok, shelfMoved.ok ? "" : shelfMoved.error);
    const shelfReordered = await listShelvesForEditing();
    ok(
      "reorder stored",
      shelfReordered[0]?.slug === PROBE_SHELF,
      shelfReordered.map((c) => c.slug).join(","),
    );

    await reorderCategoriesAction([...beforeOrder.filter((s) => s !== PROBE_SHELF), PROBE_SHELF]);

    /* A shelf carrying stock cannot be deleted. The probe's own product is
       archived by this point, which still holds the foreign key. */
    const moveProbeProduct = await saveProductAction(
      { ...(await getEditableProduct(SLUG)), categorySlug: PROBE_SHELF },
      { id: (await getEditableProduct(SLUG))?.id },
    );
    if (moveProbeProduct.ok) {
      const blocked = await deleteCategoryAction(PROBE_SHELF);
      ok("refuses to delete a shelf holding pairs", !blocked.ok, blocked.ok ? "was allowed" : "");

      /* Put the pair back on its own shelf so the delete below can run. */
      const current = await getEditableProduct(SLUG);
      if (current) {
        await saveProductAction(
          { ...current, categorySlug: shelvesBefore[0].slug },
          { id: current.id },
        );
      }
    } else {
      ok("refuses to delete a shelf holding pairs", false, "could not move the probe product");
    }

    const shelfDeleted = await deleteCategoryAction(PROBE_SHELF);
    ok("shelf deleted", shelfDeleted.ok, shelfDeleted.ok ? "" : shelfDeleted.error);
    const deletedFromShop = await getShelves();
    ok(
      "deleted shelf is gone from the storefront",
      !deletedFromShop.some((c) => c.slug === PROBE_SHELF),
      deletedFromShop.map((c) => c.slug).join(","),
    );

    const afterDelete = await listShelvesForEditing();
    ok(
      "shelf gone",
      !afterDelete.some((c) => c.slug === PROBE_SHELF),
      afterDelete.map((c) => c.slug).join(","),
    );
    ok(
      "the shop's own shelves are untouched",
      afterDelete.map((c) => c.slug).sort().join(",") ===
        shelvesBefore.map((c) => c.slug).sort().join(","),
      afterDelete.map((c) => c.slug).join(","),
    );

    /* Permanent delete — archived pairs only.

       Run on the duplicate rather than the probe's main product, so the steps
       above keep the row they were written against. */
    if (copy.ok) {
      const liveDelete = await deleteProductAction(copy.slug);
      ok(
        "refuses to delete a pair that is not archived",
        !liveDelete.ok,
        liveDelete.ok ? "was allowed" : liveDelete.error,
      );
      ok(
        "and says why",
        !liveDelete.ok && liveDelete.error.toLowerCase().includes("archive"),
        liveDelete.ok ? "" : liveDelete.error,
      );

      const archivedCopy = await archiveProductAction(copy.slug);
      ok("copy archived", archivedCopy.ok, archivedCopy.ok ? "" : archivedCopy.error);

      const gone = await deleteProductAction(copy.slug);
      ok("archived pair deleted", gone.ok, gone.ok ? "" : gone.error);
      ok("row is gone", (await getEditableProduct(copy.slug)) === null);

      /* Children go with it through the cascade, not through a second call. */
      const orphanImages = await db
        .select({ id: productImages.id })
        .from(productImages)
        .where(eq(productImages.productId, copyRowId ?? ""));
      ok("its images cascaded", orphanImages.length === 0, `${orphanImages.length} left`);

      const orphanSizes = await db
        .select({ size: productSizes.size })
        .from(productSizes)
        .where(eq(productSizes.productId, copyRowId ?? ""));
      ok("its sizes cascaded", orphanSizes.length === 0, `${orphanSizes.length} left`);

      const secondDelete = await deleteProductAction(copy.slug);
      ok("deleting it twice is refused", !secondDelete.ok, secondDelete.ok ? "was allowed" : "");
    }

    /* 12. Audit log */
    const logs = await db.select().from(activityLogs).where(eq(activityLogs.entityLabel, "Lifecycle Probe"));
    ok("activity logged", logs.length > 0, `${logs.length} entries`);
    ok("no secrets in metadata", !JSON.stringify(logs).toLowerCase().includes("password"));
    ok(
      "no secrets anywhere in the log",
      !JSON.stringify(logs).toLowerCase().includes("token") &&
        !JSON.stringify(logs).toLowerCase().includes("service_role"),
    );

    /* The activity screen reads through listActivity(), so check that view
       rather than the raw rows — it is what an admin actually sees. */
    const feed = await listActivity(50);
    const mine = feed.filter((e) => e.entityLabel === "Lifecycle Probe");
    ok("activity entries carry a readable label", mine.every((e) => e.actionLabel.length > 0));
    ok(
      "unknown actions still render",
      mine.every((e) => !e.actionLabel.includes("undefined")),
    );
    ok(
      "product entries record a slug to link to",
      mine.some((e) => typeof (e.metadata as { slug?: unknown }).slug === "string"),
    );
    ok("newest entry is first", feed.length < 2 || feed[0].createdAt >= feed[1].createdAt);

    return Response.json({ out });
  } finally {
    /* Always clean up, whatever happened above. */
    await purgeProbeRows();
  }
}

/**
 * Remove every row this probe creates.
 *
 * Run before the test as well as after it, so an interrupted request cannot
 * leave a product behind that fails the next run on a duplicate slug. Scoped
 * strictly to the probe's own slug and its copies — it must never be capable
 * of touching a real product.
 */
async function purgeProbeRows() {
  const rows = await db.select({ id: products.id, slug: products.slug }).from(products);

  for (const row of rows) {
    if (row.slug !== SLUG && !row.slug.startsWith(`${SLUG}-copy`)) continue;

    await db.delete(productImages).where(eq(productImages.productId, row.id));
    await db.delete(productSizes).where(eq(productSizes.productId, row.id));
    await db.delete(activityLogs).where(eq(activityLogs.entityId, row.id));
    await db.delete(products).where(eq(products.id, row.id));
  }

  /* Image-upload entries are keyed by storage path, not product id, so they
     are matched by the label the probe writes. */
  await db.delete(activityLogs).where(eq(activityLogs.entityLabel, SLUG));
  await db.delete(activityLogs).where(eq(activityLogs.entityLabel, "Lifecycle Probe"));
}
