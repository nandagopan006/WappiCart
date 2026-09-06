/**
 * What the shop accepts as a product photograph.
 *
 * ── Why these are not in lib/actions/media.ts ────────────────────────────
 * That file carries `"use server"`, and such a file may only export async
 * functions — Next turns every export into a callable server endpoint, so a
 * number or an array there is a build error. These live here so the upload
 * action, the uploader UI and the bucket's own configuration can all name the
 * same two values.
 *
 * ── Keep in step with the bucket ─────────────────────────────────────────
 * The Supabase bucket enforces the same 10MB limit and the same four types.
 * That is the backstop; these are the interface, and a mismatch would mean
 * the editor is told a file is fine and then storage silently rejects it.
 */

/** 10MB. A 2000px shoe photograph is 2–4MB; a phone camera file is 3–8MB. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Four formats, and deliberately not five.
 *
 * No SVG: it can carry a `<script>`, and served from a public bucket that is
 * a stored XSS hole. `next/image` refuses to optimise it anyway.
 *
 * No HEIC: it is what an iPhone shoots by default and `next/image` cannot
 * process it, so accepting one would succeed at upload and then render
 * nowhere — a worse failure than being turned away at the door.
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const EXTENSION_FOR_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
