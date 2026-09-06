"use client";

import { useState, useTransition } from "react";

import { AdminSubmitButton } from "@/components/admin/ui/button";
import { AdminInput, AdminTextarea } from "@/components/admin/ui/fields";
import { AdminCard } from "@/components/admin/ui/surface";
import {
  saveAboutAction,
  saveSeoSettingsAction,
  saveShopSettingsAction,
  type SettingsResult,
} from "@/lib/actions/settings";
import { SEO_LIMITS } from "@/lib/validation/settings";
import type { FieldErrors } from "@/lib/validation/product";

/**
 * The three settings forms.
 *
 * ── One shell, four bodies ───────────────────────────────────────────────
 * They all save the same way: submit, show a banner, render field-level
 * errors from the server. `SettingsForm` owns that so each body is only its
 * fields — three copies of the submit-and-report dance is three places for the
 * error handling to drift.
 */

function useSave<T>(action: (raw: T) => Promise<SettingsResult>) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = (value: T) => {
    setBanner(null);
    setErrors({});
    startTransition(async () => {
      const result = await action(value);
      if (result.ok) {
        setBanner({ tone: "ok", text: result.message });
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setBanner({ tone: "bad", text: result.error });
    });
  };

  return { errors, banner, isPending, save };
}

function Banner({ banner }: { banner: { tone: "ok" | "bad"; text: string } | null }) {
  if (!banner) return null;
  return (
    <p
      role="status"
      className={
        banner.tone === "ok"
          ? "border-line bg-mist text-ink mb-6 border px-4 py-3 text-[13px]"
          : "border-love/40 text-love mb-6 border px-4 py-3 text-[13px]"
      }
    >
      {banner.text}
    </p>
  );
}

/* ── Shop settings ──────────────────────────────────────────────────────── */

export type ShopSettingsValue = {
  name: string;
  tagline: string;
  whatsappPhone: string;
  instagram: string;
  instagramHandle: string;
  deliveryAreas: string;
  returnWindow: string;
  replyTime: string;
  siteUrl: string;
};

export function ShopSettingsForm({ initial }: { initial: ShopSettingsValue }) {
  const [value, setValue] = useState(initial);
  const { errors, banner, isPending, save } = useSave(saveShopSettingsAction);
  const set = (k: keyof ShopSettingsValue, v: string) => setValue((p) => ({ ...p, [k]: v }));

  const placeholder = value.whatsappPhone.replace(/\D/g, "") === "919000000000";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(value);
      }}
      noValidate
    >
      <Banner banner={banner} />

      {/* The one setting that silently loses orders if it is wrong. */}
      {placeholder ? (
        <p className="border-love/40 text-love mb-6 border px-4 py-3 text-[13px]">
          The WhatsApp number is still the placeholder. Every order button on the shop currently
          reaches nobody — set the real number below before going live.
        </p>
      ) : null}

      <AdminCard title="The shop">
        <div className="grid gap-x-4 sm:grid-cols-2">
          <AdminInput
            label="Name"
            name="name"
            required
            value={value.name}
            error={errors.name}
            hint="Appears in the wordmark, the page title and every WhatsApp message."
            onChange={(e) => set("name", e.target.value)}
          />
          <AdminInput
            label="Tagline"
            name="tagline"
            required
            value={value.tagline}
            error={errors.tagline}
            onChange={(e) => set("tagline", e.target.value)}
          />
        </div>
      </AdminCard>

      <AdminCard title="Ordering" description="The only conversion path on the site." className="mt-6">
        <AdminInput
          label="WhatsApp number"
          name="whatsappPhone"
          required
          inputMode="tel"
          value={value.whatsappPhone}
          error={errors.whatsappPhone}
          hint="Country code and number, e.g. 919876543210. Spaces, dashes and + are stripped on save."
          onChange={(e) => set("whatsappPhone", e.target.value)}
        />
      </AdminCard>

      <AdminCard title="What the shop promises" description="These appear on the About page and in the footer." className="mt-6">
        <AdminTextarea
          label="Delivery areas"
          name="deliveryAreas"
          rows={2}
          value={value.deliveryAreas}
          error={errors.deliveryAreas}
          hint="Say a time you can actually hit."
          onChange={(e) => set("deliveryAreas", e.target.value)}
        />
        <AdminInput
          label="Return window"
          name="returnWindow"
          value={value.returnWindow}
          error={errors.returnWindow}
          onChange={(e) => set("returnWindow", e.target.value)}
        />
        <AdminInput
          label="Reply time"
          name="replyTime"
          value={value.replyTime}
          error={errors.replyTime}
          hint="A shop that answers in an hour and promises minutes has made the promise worse."
          onChange={(e) => set("replyTime", e.target.value)}
        />
      </AdminCard>

      <AdminCard title="Elsewhere" className="mt-6">
        <div className="grid gap-x-4 sm:grid-cols-2">
          <AdminInput
            label="Instagram URL"
            name="instagram"
            value={value.instagram}
            error={errors.instagram}
            onChange={(e) => set("instagram", e.target.value)}
          />
          <AdminInput
            label="Instagram handle"
            name="instagramHandle"
            value={value.instagramHandle}
            error={errors.instagramHandle}
            onChange={(e) => set("instagramHandle", e.target.value)}
          />
        </div>
        <AdminInput
          label="Site URL"
          name="siteUrl"
          required
          value={value.siteUrl}
          error={errors.siteUrl}
          hint="No trailing slash. Used for canonical tags, the sitemap, and the product link in every order message."
          onChange={(e) => set("siteUrl", e.target.value)}
        />
      </AdminCard>

      <div className="mt-6">
        <AdminSubmitButton pending={isPending}>Save shop settings</AdminSubmitButton>
      </div>
    </form>
  );
}

/* ── SEO ────────────────────────────────────────────────────────────────── */

export type SeoValue = {
  siteTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
};

export function SeoForm({ initial }: { initial: SeoValue }) {
  const [value, setValue] = useState(initial);
  const { errors, banner, isPending, save } = useSave(saveSeoSettingsAction);
  const set = (k: keyof SeoValue, v: string) => setValue((p) => ({ ...p, [k]: v }));

  /* A counter, not a validator. Search engines truncate a long title, which
     is a soft failure — refusing to save one would be the admin having an
     opinion the search engine does not. */
  const counter = (text: string, limit: number) =>
    `${text.length} / ${limit} characters${text.length > limit ? " — will be truncated in results" : ""}`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(value);
      }}
      noValidate
    >
      <Banner banner={banner} />

      <AdminCard title="Search" description="Leave blank to fall back to the shop name and tagline.">
        <AdminInput
          label="Site title"
          name="siteTitle"
          value={value.siteTitle}
          error={errors.siteTitle}
          hint={counter(value.siteTitle, SEO_LIMITS.siteTitle)}
          onChange={(e) => set("siteTitle", e.target.value)}
        />
        <AdminTextarea
          label="Meta description"
          name="metaDescription"
          rows={3}
          value={value.metaDescription}
          error={errors.metaDescription}
          hint={counter(value.metaDescription, SEO_LIMITS.metaDescription)}
          onChange={(e) => set("metaDescription", e.target.value)}
        />
      </AdminCard>

      <AdminCard
        title="Sharing"
        description="What a forwarded link looks like on WhatsApp."
        className="mt-6"
      >
        <AdminInput
          label="Share title"
          name="ogTitle"
          value={value.ogTitle}
          error={errors.ogTitle}
          hint={counter(value.ogTitle, SEO_LIMITS.ogTitle)}
          onChange={(e) => set("ogTitle", e.target.value)}
        />
        <AdminTextarea
          label="Share description"
          name="ogDescription"
          rows={2}
          value={value.ogDescription}
          error={errors.ogDescription}
          hint={counter(value.ogDescription, SEO_LIMITS.ogDescription)}
          onChange={(e) => set("ogDescription", e.target.value)}
        />
        <AdminInput
          label="Share image URL"
          name="ogImageUrl"
          value={value.ogImageUrl}
          error={errors.ogImageUrl}
          hint="Optional. Blank uses the generated card, which already carries the shop name and stock count."
          onChange={(e) => set("ogImageUrl", e.target.value)}
        />
      </AdminCard>

      <div className="mt-6">
        <AdminSubmitButton pending={isPending}>Save SEO</AdminSubmitButton>
      </div>
    </form>
  );
}

/* ── About ──────────────────────────────────────────────────────────────── */

export type AboutValue = {
  headline: string;
  body: string;
  deliveryInfo: string;
  returnsInfo: string;
  hours: string;
  photographyNote: string;
};

export function AboutForm({
  initial,
  fallback,
}: {
  initial: AboutValue;
  fallback: { headline: string; body: string; photographyNote: string };
}) {
  const [value, setValue] = useState(initial);
  const { errors, banner, isPending, save } = useSave(saveAboutAction);
  const set = (k: keyof AboutValue, v: string) => setValue((p) => ({ ...p, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save({ ...value, imageSlugs: [] });
      }}
      noValidate
    >
      <Banner banner={banner} />

      <AdminCard
        title="The page"
        description="Blank fields fall back to the wording the page ships with."
      >
        <AdminInput
          label="Headline"
          name="headline"
          value={value.headline}
          error={errors.headline}
          placeholder={fallback.headline}
          hint="One short line. It is the first thing somebody deciding whether to trust the shop reads."
          onChange={(e) => set("headline", e.target.value)}
        />
        <AdminTextarea
          label="Body"
          name="body"
          rows={8}
          value={value.body}
          error={errors.body}
          placeholder={fallback.body}
          hint="Leave a blank line between paragraphs. Factual and short — the page builds trust, it does not sell."
          onChange={(e) => set("body", e.target.value)}
        />
      </AdminCard>

      <AdminCard
        title="The details table"
        description="Blank falls back to the matching shop setting."
        className="mt-6"
      >
        <AdminTextarea
          label="Delivery"
          name="deliveryInfo"
          rows={2}
          value={value.deliveryInfo}
          error={errors.deliveryInfo}
          onChange={(e) => set("deliveryInfo", e.target.value)}
        />
        <AdminTextarea
          label="Returns"
          name="returnsInfo"
          rows={2}
          value={value.returnsInfo}
          error={errors.returnsInfo}
          onChange={(e) => set("returnsInfo", e.target.value)}
        />
        <AdminInput
          label="We answer"
          name="hours"
          value={value.hours}
          error={errors.hours}
          onChange={(e) => set("hours", e.target.value)}
        />
        <AdminInput
          label="Photography"
          name="photographyNote"
          value={value.photographyNote}
          error={errors.photographyNote}
          placeholder={fallback.photographyNote}
          onChange={(e) => set("photographyNote", e.target.value)}
        />
      </AdminCard>

      <div className="mt-6">
        <AdminSubmitButton pending={isPending}>Save About page</AdminSubmitButton>
      </div>
    </form>
  );
}

/* ── Categories ─────────────────────────────────────────────────────────── */

/*
 * The shelves used to be edited here, as one form over four fixed rows. They
 * are a collection now — created, reordered and deleted — so they have their
 * own screens under /admin/categories and their own components in
 * components/admin/categories/.
 */
