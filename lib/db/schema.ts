import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Every table in the WappiCart database.
 *
 * Three rules worth knowing before you change anything here:
 *
 * 1. Sizes are a list, not a count. A pair is available in size 9 or it is
 *    not. There is no "how many left" column anywhere.
 * 2. Products are archived, never deleted. Their URL may be in someone's
 *    WhatsApp chat, so the row and its slug stay.
 * 3. Sizes are 6-11, prices are whole rupees, a pair carries 2-4 photos.
 *    Categories are NOT fixed — they are rows the admin creates and deletes.
 *
 * After editing this file run: npm run db:generate && npm run db:migrate
 */

/* ── Enums ──────────────────────────────────────────────────────────────── */

/** draft = hidden. published = on the shop. archived = taken down, URL kept. */
export const productStatus = pgEnum("product_status", ["draft", "published", "archived"]);

/** Only one role for now. Having the column makes adding another easy later. */
export const adminRole = pgEnum("admin_role", ["admin"]);

/**
 * The blocks the home page can be built from. Each one maps to a component
 * in app/(storefront)/page.tsx, so you cannot add a name here without also
 * adding the component that draws it.
 */
export const homepageSectionType = pgEnum("homepage_section_type", [
  "hero",
  "new_in",
  "category_story",
  "product_story",
  "collection_spread",
  "category_tiles",
  "brand_statement",
  "order_block",
]);

/* ── Categories ─────────────────────────────────────────────────────────── */

/**
 * The shelves the shop browses by. Seeded with four; there is no cap.
 *
 * They are created, renamed, reordered and deleted from the admin. The slug
 * used to be a TypeScript union across the whole storefront, which is why
 * adding one needed a code change — it is an ordinary string now, and the
 * `category_slug` foreign key below is what enforces that a shelf exists.
 *
 * The slug is fixed once chosen. It is the `?c=` value in every header link
 * and the thing every product points at, so changing it would break links
 * already shared and re-shelve stock. Rename the `name`; the slug is the
 * address.
 */
export const categories = pgTable(
  "categories",
  {
    slug: text("slug").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url"),
    position: integer("position").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /* A slug goes straight into a URL. It was safe while the set was four
       literals in the source; it is user input now. Matches SLUG_PATTERN in
       lib/catalogue.ts. */
    check("categories_slug_shape", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("categories_name_present", sql`char_length(trim(${t.name})) > 0`),
    index("categories_position_idx").on(t.position),
  ],
);

/* ── Products ───────────────────────────────────────────────────────────── */

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /* Becomes /p/<slug>. Unique here too, not just in the form. */
    slug: text("slug").notNull(),
    name: text("name").notNull(),

    categorySlug: text("category_slug")
      .notNull()
      /* restrict = deleting a shelf can never delete its shoes. It is also
         what makes "delete this shelf" refuse while any pair is still on it,
         drafts and archived ones included. */
      .references(() => categories.slug, { onUpdate: "cascade", onDelete: "restrict" }),

    /* Whole rupees only. The shop never shows paise. */
    price: integer("price").notNull(),
    /* Optional "was" price, shown struck through. Must be above price. */
    mrp: integer("mrp"),

    colour: text("colour").notNull(),
    material: text("material").notNull(),
    fitNote: text("fit_note"),
    description: text("description").notNull(),
    care: text("care").notNull(),

    /* Goes into the WhatsApp order message. Must be unique. */
    sku: text("sku").notNull(),

    featured: boolean("featured").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),

    status: productStatus("status").notNull().default("draft"),

    /* Optional. Blank = use the product's own name and description. */
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoImageUrl: text("seo_image_url"),

    /* Where the pair sits on the shelf. Used to break ties when sorting. */
    position: integer("position").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /* Set the first time it goes live, then never moved. */
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    unique("products_slug_unique").on(t.slug),
    unique("products_sku_unique").on(t.sku),

    check("products_price_positive", sql`${t.price} > 0`),
    /* A blank MRP passes: in SQL, NULL > 5 is "unknown", not false. */
    check("products_mrp_above_price", sql`${t.mrp} IS NULL OR ${t.mrp} > ${t.price}`),
    check("products_slug_shape", sql`${t.slug} ~ '^[a-z0-9-]+$'`),

    /* Indexes for the queries the shop runs most. */
    index("products_status_idx").on(t.status),
    index("products_category_idx").on(t.categorySlug),
    index("products_position_idx").on(t.position),
    index("products_updated_at_idx").on(t.updatedAt),
  ],
);

/* ── Product images ─────────────────────────────────────────────────────── */

/**
 * The photographs for one pair. Two to four of them.
 *
 * position 0 is the main photo, used by the grid, the hero and the share
 * card. There is no separate "is main" flag on purpose — one source of truth
 * is easier to keep correct than two.
 *
 * The 2-4 rule is checked when publishing, not here: a half-finished draft
 * with one photo uploaded so far still has to be saveable.
 */
export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      /* cascade = deleting a product deletes its image rows too. */
      .references(() => products.id, { onDelete: "cascade" }),

    url: text("url").notNull(),
    /* Describes the shoe for screen readers. 20 characters minimum, which
       is what stops "product image" getting through. */
    alt: text("alt").notNull(),
    position: integer("position").notNull().default(0),

    /* Where the file lives in Supabase Storage, so it can be deleted later.
       Blank for the placeholder images, which we do not own. */
    storagePath: text("storage_path"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("product_images_position_unique").on(t.productId, t.position),
    check("product_images_alt_length", sql`char_length(${t.alt}) >= 20`),
    check("product_images_position_range", sql`${t.position} >= 0 AND ${t.position} < 4`),
    index("product_images_product_idx").on(t.productId),
  ],
);

/* ── Product sizes ──────────────────────────────────────────────────────── */

/**
 * Which sizes of this pair can be ordered. One row per size.
 *
 * A row each (rather than one list column) makes "show me anything in a 9" a
 * fast lookup, and lets the database enforce the 6-11 range.
 */
export const productSizes = pgTable(
  "product_sizes",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: smallint("size").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.size] }),
    check("product_sizes_in_run", sql`${t.size} BETWEEN 6 AND 11`),
    index("product_sizes_size_idx").on(t.size),
  ],
);

/* ── Home page composition ──────────────────────────────────────────────── */

/**
 * One row per block on the home page.
 *
 * The admin can reorder these, turn them off, retitle them and choose which
 * pairs they show. It cannot change colours, fonts or spacing — those stay
 * in the components, which is what keeps the site looking designed.
 *
 * `position` is both the order and the number shown on the page (01, 02...).
 */
export const homepageSections = pgTable(
  "homepage_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: homepageSectionType("type").notNull(),

    /* Blank = use the wording built into the component. */
    title: text("title"),
    description: text("description"),

    enabled: boolean("enabled").notNull().default(true),
    position: integer("position").notNull(),

    /* How many pairs to show. Blank for blocks that show none. */
    itemLimit: integer("item_limit"),

    /**
     * Extra settings that only some blocks need — which shelf a category
     * story points at, the small line above a spread. Kept as JSON because
     * eight mostly-empty columns would be worse. The shape is checked in
     * lib/validation/homepage.ts.
     */
    config: jsonb("config").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("homepage_sections_position_unique").on(t.position),
    index("homepage_sections_enabled_idx").on(t.enabled),
  ],
);

/**
 * Pairs pinned to a home page block.
 *
 * No rows here means "choose automatically" — featured pairs for the hero,
 * new arrivals for New in. That is the normal state, not an error.
 */
export const homepageProductSelections = pgTable(
  "homepage_product_selections",
  {
    sectionId: uuid("section_id")
      .notNull()
      .references(() => homepageSections.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      /* cascade = a deleted product cannot leave a dangling pin. */
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.sectionId, t.productId] }),
    index("homepage_selections_section_idx").on(t.sectionId),
  ],
);

/* ── Singletons ─────────────────────────────────────────────────────────── */

/**
 * The next three tables hold exactly one row each.
 *
 * Each one's id is locked to 1 by a check, so a second settings row is
 * impossible rather than just unlikely.
 */

/** The About page's content. The layout stays in the component. */
export const aboutContent = pgTable(
  "about_content",
  {
    id: smallint("id").primaryKey().default(1),
    headline: text("headline").notNull().default(""),
    body: text("body").notNull().default(""),
    deliveryInfo: text("delivery_info").notNull().default(""),
    returnsInfo: text("returns_info").notNull().default(""),
    hours: text("hours").notNull().default(""),
    /* The fourth fact in the page's table. Named for what it renders rather
       than for a generic "contact" it never carried. */
    photographyNote: text("photography_note").notNull().default(""),
    /* The page's plate photographs, by product slug — the About page has
       always borrowed real stock rather than shipping its own art. */
    imageSlugs: jsonb("image_slugs").notNull().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("about_content_singleton", sql`${t.id} = 1`)],
);

/** Everything about the shop that is not a product — was lib/shop.ts. */
export const shopSettings = pgTable(
  "shop_settings",
  {
    id: smallint("id").primaryKey().default(1),
    name: text("name").notNull(),
    tagline: text("tagline").notNull(),

    /* Country code + digits only, e.g. 919876543210. wa.me rejects
       anything else, and this is the only way the shop takes orders. */
    whatsappPhone: text("whatsapp_phone").notNull(),

    instagram: text("instagram").notNull().default(""),
    instagramHandle: text("instagram_handle").notNull().default(""),
    deliveryAreas: text("delivery_areas").notNull().default(""),
    returnWindow: text("return_window").notNull().default(""),
    replyTime: text("reply_time").notNull().default(""),
    siteUrl: text("site_url").notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("shop_settings_singleton", sql`${t.id} = 1`),
    check("shop_settings_phone_digits", sql`${t.whatsappPhone} ~ '^[0-9]{8,15}$'`),
  ],
);

/** Site-wide SEO. Per-product overrides live on `products`. */
export const seoSettings = pgTable(
  "seo_settings",
  {
    id: smallint("id").primaryKey().default(1),
    siteTitle: text("site_title").notNull().default(""),
    metaDescription: text("meta_description").notNull().default(""),
    ogTitle: text("og_title").notNull().default(""),
    ogDescription: text("og_description").notNull().default(""),
    ogImageUrl: text("og_image_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("seo_settings_singleton", sql`${t.id} = 1`)],
);

/* ── Admin ──────────────────────────────────────────────────────────────── */

/**
 * Who is allowed into the admin.
 *
 * Supabase Auth handles logging in. This table decides who is an admin —
 * having an account is not the same as having access. A row here is what
 * grants it, and only `npm run admin:create` adds one.
 */
export const adminProfiles = pgTable(
  "admin_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /* The Supabase Auth user id. No foreign key — that table is Supabase's,
       not ours. */
    authUserId: uuid("auth_user_id").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: adminRole("role").notNull().default("admin"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("admin_profiles_auth_user_unique").on(t.authUserId)],
);

/**
 * A record of what each admin changed, and when.
 *
 * Only ever added to, never edited. Keep passwords and tokens out of it — a
 * log holding secrets is a second place they can leak from.
 */
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id").references(() => adminProfiles.id, { onDelete: "set null" }),
    /* e.g. "product.published", "settings.updated". */
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    /* The name at the time, so the log still reads right after a rename. */
    entityLabel: text("entity_label"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("activity_logs_created_at_idx").on(t.createdAt),
    index("activity_logs_entity_idx").on(t.entityType, t.entityId),
  ],
);
