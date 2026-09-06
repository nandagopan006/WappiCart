CREATE TYPE "public"."admin_role" AS ENUM('admin');--> statement-breakpoint
CREATE TYPE "public"."homepage_section_type" AS ENUM('hero', 'new_in', 'category_story', 'product_story', 'collection_spread', 'category_tiles', 'brand_statement', 'order_block');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "about_content" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"delivery_info" text DEFAULT '' NOT NULL,
	"returns_info" text DEFAULT '' NOT NULL,
	"hours" text DEFAULT '' NOT NULL,
	"contact_info" text DEFAULT '' NOT NULL,
	"image_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "about_content_singleton" CHECK ("about_content"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"entity_label" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "admin_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_profiles_auth_user_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_product_selections" (
	"section_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "homepage_product_selections_section_id_product_id_pk" PRIMARY KEY("section_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "homepage_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "homepage_section_type" NOT NULL,
	"title" text,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	"item_limit" integer,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "homepage_sections_position_unique" UNIQUE("position")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"storage_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_position_unique" UNIQUE("product_id","position"),
	CONSTRAINT "product_images_alt_length" CHECK (char_length("product_images"."alt") >= 20),
	CONSTRAINT "product_images_position_range" CHECK ("product_images"."position" >= 0 AND "product_images"."position" < 4)
);
--> statement-breakpoint
CREATE TABLE "product_sizes" (
	"product_id" uuid NOT NULL,
	"size" smallint NOT NULL,
	CONSTRAINT "product_sizes_product_id_size_pk" PRIMARY KEY("product_id","size"),
	CONSTRAINT "product_sizes_in_run" CHECK ("product_sizes"."size" BETWEEN 6 AND 11)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category_slug" text NOT NULL,
	"price" integer NOT NULL,
	"mrp" integer,
	"colour" text NOT NULL,
	"material" text NOT NULL,
	"fit_note" text,
	"description" text NOT NULL,
	"care" text NOT NULL,
	"sku" text NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"seo_image_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_price_positive" CHECK ("products"."price" > 0),
	CONSTRAINT "products_mrp_above_price" CHECK ("products"."mrp" IS NULL OR "products"."mrp" > "products"."price"),
	CONSTRAINT "products_slug_shape" CHECK ("products"."slug" ~ '^[a-z0-9-]+$')
);
--> statement-breakpoint
CREATE TABLE "seo_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"site_title" text DEFAULT '' NOT NULL,
	"meta_description" text DEFAULT '' NOT NULL,
	"og_title" text DEFAULT '' NOT NULL,
	"og_description" text DEFAULT '' NOT NULL,
	"og_image_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seo_settings_singleton" CHECK ("seo_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "shop_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"whatsapp_phone" text NOT NULL,
	"instagram" text DEFAULT '' NOT NULL,
	"instagram_handle" text DEFAULT '' NOT NULL,
	"delivery_areas" text DEFAULT '' NOT NULL,
	"return_window" text DEFAULT '' NOT NULL,
	"reply_time" text DEFAULT '' NOT NULL,
	"site_url" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_settings_singleton" CHECK ("shop_settings"."id" = 1),
	CONSTRAINT "shop_settings_phone_digits" CHECK ("shop_settings"."whatsapp_phone" ~ '^[0-9]{8,15}$')
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_admin_id_admin_profiles_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_product_selections" ADD CONSTRAINT "homepage_product_selections_section_id_homepage_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."homepage_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_product_selections" ADD CONSTRAINT "homepage_product_selections_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "homepage_selections_section_idx" ON "homepage_product_selections" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "homepage_sections_enabled_idx" ON "homepage_sections" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_sizes_size_idx" ON "product_sizes" USING btree ("size");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX "products_position_idx" ON "products" USING btree ("position");--> statement-breakpoint
CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");