"use client";

import Image from "next/image";
import { useRef, useState, type DragEvent } from "react";

import { AdminButton } from "@/components/admin/ui/button";
import { uploadProductImageAction } from "@/lib/actions/media";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/media-limits";
import { cx } from "@/lib/cx";

/**
 * Choosing a photograph.
 *
 * ── Checked here and again on the server ─────────────────────────────────
 * Size and type are validated before the request leaves the browser, purely
 * so a 40MB file is refused instantly rather than after a minute of
 * uploading. The server checks the same things, and the bucket checks them a
 * third time — this one is a courtesy, not a control.
 *
 * ── One at a time, on purpose ────────────────────────────────────────────
 * A pair carries two to four views and each needs its own alt text. Accepting
 * a multi-select would upload four files and leave the editor with four empty
 * alt boxes and no idea which is which. The parent enforces the maximum and
 * hides this control at four.
 *
 * ── The preview is local until the upload lands ──────────────────────────
 * `URL.createObjectURL` shows the chosen file immediately, so the tile is
 * never blank while bytes move. It is revoked when the real URL replaces it;
 * leaving object URLs around holds the file in memory for the life of the
 * page.
 */

export type UploadedImage = { url: string; storagePath: string };

export function ImageUploader({
  productRef,
  onUploaded,
  disabled,
}: {
  /** The product's slug, used to group files in the bucket. */
  productRef: string;
  onUploaded: (image: UploadedImage) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const send = async (file: File) => {
    setError(null);

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 10MB.`);
      return;
    }

    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError(
        file.type === "image/heic" || file.type === "image/heif"
          ? "iPhone HEIC photos are not supported. Set Camera → Formats → Most Compatible, or export as JPEG."
          : "Use a JPEG, PNG, WebP or AVIF.",
      );
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBusy(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("productRef", productRef);

      const result = await uploadProductImageAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onUploaded({ url: result.url, storagePath: result.storagePath });
    } catch {
      setError("The upload did not complete. Check your connection and try again.");
    } finally {
      setBusy(false);
      setPreview(null);
      URL.revokeObjectURL(localUrl);
      /* Cleared so choosing the same file twice still fires a change event. */
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled || busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void send(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          "border-line flex items-center gap-4 border border-dashed px-4 py-4 transition-colors",
          dragging && "border-ink bg-mist",
        )}
      >
        {preview ? (
          <div className="bg-mist relative h-16 w-16 shrink-0 overflow-hidden">
            <Image src={preview} alt="" fill sizes="64px" className="object-cover" unoptimized />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="text-ink text-[13px]">
            {busy ? "Uploading…" : "Drop an image here, or choose a file."}
          </p>
          <p className="text-grey mt-1 text-[12px]">JPEG, PNG, WebP or AVIF. Up to 10MB.</p>
        </div>

        <AdminButton
          type="button"
          variant="secondary"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : "Choose file"}
        </AdminButton>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void send(file);
          }}
        />
      </div>

      {error ? (
        <p role="alert" className="a-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
