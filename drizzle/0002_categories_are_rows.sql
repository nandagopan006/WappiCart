-- Shelves stopped being four fixed rows and became a collection the admin
-- creates, reorders and deletes.
--
-- Nothing about the table's shape changes; what changes is who writes to it.
-- `slug` used to be one of four literals in the TypeScript source, so its
-- shape was guaranteed by the compiler. It is typed into a form now and goes
-- straight into a URL (/shop?c=<slug>), so the database has to enforce what
-- the union used to: lowercase letters, digits and single hyphens.
--
-- The name check is the same argument — a shelf with a blank name renders an
-- empty link in the header, which reads as a broken page rather than an empty
-- one.
--
-- The index is for ordering: `position` is now sorted on every storefront
-- request rather than over a fixed four rows.
--
-- Both constraints are satisfied by the seeded shelves, so this applies to an
-- existing database without touching a row.

CREATE INDEX "categories_position_idx" ON "categories" USING btree ("position");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_slug_shape" CHECK ("categories"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_name_present" CHECK (char_length(trim("categories"."name")) > 0);