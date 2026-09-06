/**
 * Fetches every admin page as a real signed-in admin and asserts what it
 * renders. Creates a throwaway user and deletes it again, always.
 */

import { createReporter, withTestAdmin } from "./test-session";


type Check = { path: string; label: string; expect: [string, RegExp | string][] };

const CHECKS: Check[] = [
  {
    path: "/admin",
    label: "Dashboard",
    expect: [
      ["heading", "Dashboard"],
      ["published count", /Published<\/p><p[^>]*>12</],
    ],
  },
  {
    path: "/admin/products",
    label: "Products",
    expect: [
      ["heading", "Products"],
      ["a real product name", "Runner Low"],
      ["SKU column", "WPC-RL-WHT"],
      ["status badge", "Published"],
      ["product count rendered", /\d+ products?/],
      ["edit link", /href="\/admin\/products\/runner-low-white"/],
      ["no Orders nav", /^(?!.*>Orders<)/s],
    ],
  },
  {
    path: "/admin/products?status=draft",
    label: "Products filtered to drafts",
    /* Either outcome is correct — there may or may not be drafts. What must
       not happen is a crash or a blank panel. */
    expect: [
      ["shows drafts or a proper empty state", /Nothing matches|No pair matches those filters|Draft</],
    ],
  },
  {
    path: "/admin/products?category=loafers",
    label: "Products filtered to loafers",
    expect: [["a loafer", /Penny Loafer|Tassel Loafer|Driver Moc/]],
  },
  {
    path: "/admin/products?search=oxford",
    label: "Products searched",
    expect: [["oxford", "Oxford Cap-Toe"]],
  },
  {
    path: "/admin/activity",
    label: "Activity log",
    expect: [
      ["heading", "Activity"],
      ["table or empty state", /What<\/th>|No activity yet/],
    ],
  },
  {
    path: "/admin/account",
    label: "Account",
    expect: [
      ["heading", "Account"],
      ["signed-in email shown", /@wappicart\.test/],
      ["role shown", ">admin<"],
      ["sign out button", "Sign out"],
      ["password guidance", /managed by Supabase/],
    ],
  },
  {
    path: "/admin/settings",
    label: "Shop settings",
    expect: [
      ["heading", "Shop settings"],
      ["name field", /id="f-name"/],
      ["whatsapp field", /id="f-whatsappPhone"/],
      ["site url field", /id="f-siteUrl"/],
      ["placeholder-number warning", /still the placeholder/],
      ["save button", "Save shop settings"],
    ],
  },
  {
    path: "/admin/seo",
    label: "SEO",
    expect: [
      ["heading", "SEO"],
      ["site title field", /id="f-siteTitle"/],
      ["character counter", /characters/],
      ["save button", "Save SEO"],
    ],
  },
  {
    path: "/admin/about",
    label: "About editor",
    expect: [
      ["heading", "About"],
      ["headline field", /id="f-headline"/],
      ["body field", /id="f-body"/],
      ["photography field", /id="f-photographyNote"/],
      ["shipped copy as placeholder", /Two people, a room, and a phone/],
      ["save button", "Save About page"],
    ],
  },
  {
    path: "/admin/categories",
    label: "Categories",
    expect: [
      ["heading", "Categories"],
      ["every shelf listed", /sneakers[\s\S]*formals[\s\S]*loafers[\s\S]*sandals/],
      ["reorder controls", /aria-label="Move [^"]+ (up|down)"/],
      /* Each row shows how much stock is on the shelf, because that is what
         decides whether it can be deleted. */
      ["stock counts", /\d+ live|empty/],
      ["a link to add one", "/admin/categories/new"],
      /* Edit, Hide and Delete are the per-row controls. Delete is the one
         that did not exist while the four shelves were fixed. */
      ["delete control", ">Delete<"],
      ["visibility control", /">(Hide|Show)</],
    ],
  },
  {
    path: "/admin/homepage",
    label: "Homepage editor",
    expect: [
      ["heading", "Homepage"],
      ["all nine sections", /9 of 9 sections on/],
      ["hero row", "Hero"],
      ["category story row", "Category story"],
      ["order block row", "Order block"],
      ["reorder controls", /aria-label="Move [^"]+ (up|down)"/],
      ["save button", "Save home page"],
    ],
  },
  {
    path: "/admin/media",
    label: "Media library",
    expect: [
      ["heading", "Media"],
      ["all / unused filters", /All \(\d+\)/],
      ["empty or grid", /No uploads yet|Nothing unused|In use|Unused/],
    ],
  },
  {
    path: "/admin/products/new",
    label: "New product form",
    expect: [
      ["heading", "New product"],
      ["name field", /id="f-name"/],
      ["slug field", /id="f-slug"/],
      ["sku field", /id="f-sku"/],
      ["price field", /id="f-price"/],
      ["size toggles", /aria-pressed="false"[^>]*>6</],
      ["publish button", "Publish"],
      ["upload control", "Choose file"],
      ["upload limits stated", /Up to 10MB/],
    ],
  },
  {
    path: "/admin/products/runner-low-white",
    label: "Edit an existing product",
    expect: [
      ["loads the name", /value="Runner Low"/],
      ["loads the SKU", /value="WPC-RL-WHT"/],
      ["loads the price", /value="2499"/],
      ["loads the MRP", /value="2999"/],
      ["marks a stocked size pressed", /aria-pressed="true"/],
      ["shows published status", "Published"],
      ["links to the live page", /href="\/p\/runner-low-white"/],
    ],
  },
];

async function main() {
  const { check, finish } = createReporter();

  await withTestAdmin(async ({ get, email }) => {
    for (const page of CHECKS) {
      const started = Date.now();

      let response;
      try {
        response = await get(page.path);
      } catch (error) {
        check(page.label, false, `request failed: ${(error as Error).message}`);
        continue;
      }

      const ms = Date.now() - started;

      if (response.status !== 200) {
        check(page.label, false, `status ${response.status} (${ms}ms)`);
        continue;
      }

      console.log(`  ${page.label}  (${ms}ms)`);

      for (const [label, matcher] of page.expect) {
        /* The email of the throwaway account is generated per run, so a check
           looking for "the signed-in email" matches on the test domain. */
        const passed =
          typeof matcher === "string" ? response.body.includes(matcher) : matcher.test(response.body);
        check(`  ${label}`, passed);
      }
    }

    void email;
  });

  finish("All admin pages");
}

main().catch((e) => { console.error("Failed:", (e as Error).message); process.exit(1); });
