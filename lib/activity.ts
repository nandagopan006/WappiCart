import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLogs, adminProfiles } from "@/lib/db/schema";

/**
 * The audit trail.
 *
 * ── What goes in ─────────────────────────────────────────────────────────
 * A verb, the thing it happened to, a human-readable label, and a small bag
 * of context. Nothing else. Never a password, never a token, never a whole
 * row — a log that carries secrets is a second place they can leak from, and
 * one that carries entire records becomes a shadow copy of the database that
 * nobody remembers to protect.
 *
 * ── Why the label is copied in at write time ─────────────────────────────
 * "Archived Oxford Cap-Toe" has to keep reading correctly after the product
 * is renamed, or archived, or its row deleted. A log that resolves its
 * subject at read time tells you what things are called now, which is not
 * what an audit trail is for.
 *
 * ── Why a failure here is swallowed ──────────────────────────────────────
 * The log is a record of work, not part of it. If writing the entry fails,
 * the product edit that succeeded must still be reported as succeeded — an
 * editor told their save failed will do it again, and now there are two.
 * The failure goes to the server console, where it belongs.
 */

export type ActivityAction =
  | "product.created"
  | "product.updated"
  | "product.published"
  | "product.unpublished"
  | "product.archived"
  | "product.restored"
  | "product.duplicated"
  | "product.image.uploaded"
  | "product.image.deleted"
  | "product.deleted"
  | "category.created"
  | "category.updated"
  | "category.deleted"
  | "category.shown"
  | "category.hidden"
  | "category.reordered"
  | "homepage.updated"
  | "about.updated"
  | "settings.updated"
  | "seo.updated";

/** How each action reads in the activity list. */
export const ACTION_LABELS: Record<ActivityAction, string> = {
  "product.created": "Created product",
  "product.updated": "Updated product",
  "product.published": "Published product",
  "product.unpublished": "Unpublished product",
  "product.archived": "Archived product",
  "product.restored": "Restored product",
  "product.duplicated": "Duplicated product",
  "product.image.uploaded": "Uploaded image",
  "product.image.deleted": "Deleted image",
  "product.deleted": "Deleted product",
  "category.created": "Added shelf",
  "category.updated": "Updated shelf",
  "category.deleted": "Deleted shelf",
  "category.shown": "Showed shelf",
  "category.hidden": "Hid shelf",
  "category.reordered": "Reordered shelves",
  "homepage.updated": "Updated home page",
  "about.updated": "Updated about page",
  "settings.updated": "Updated shop settings",
  "seo.updated": "Updated SEO",
};

export async function recordActivity({
  adminId,
  action,
  entityType,
  entityId,
  entityLabel,
  metadata = {},
}: {
  adminId: string;
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      adminId,
      action,
      entityType,
      entityId: entityId ?? null,
      entityLabel: entityLabel ?? null,
      metadata,
    });
  } catch (error) {
    console.error("[activity] could not write log entry:", error);
  }
}

export type ActivityEntry = {
  id: string;
  action: string;
  actionLabel: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  adminName: string | null;
};

/**
 * The most recent entries.
 *
 * A left join rather than two queries, and sequential rather than parallel —
 * see the note about the transaction pooler in the dashboard.
 */
export async function listActivity(limit = 50, offset = 0): Promise<ActivityEntry[]> {
  const rows = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      entityLabel: activityLogs.entityLabel,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
      adminName: adminProfiles.name,
    })
    .from(activityLogs)
    .leftJoin(adminProfiles, eq(adminProfiles.id, activityLogs.adminId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    ...row,
    /* An action written by an older version of the app still renders — it
       falls back to its own key rather than an empty cell. */
    actionLabel: ACTION_LABELS[row.action as ActivityAction] ?? row.action,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }));
}
