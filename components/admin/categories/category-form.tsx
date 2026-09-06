"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { AdminButton, AdminSubmitButton } from "@/components/admin/ui/button";
import { AdminCheckbox, AdminInput, AdminTextarea } from "@/components/admin/ui/fields";
import { AdminCard } from "@/components/admin/ui/surface";
import {
  createCategoryAction,
  updateCategoryAction,
  type CategoryResult,
} from "@/lib/actions/categories";
import { slugifyCategory } from "@/lib/validation/category";
import type { FieldErrors } from "@/lib/validation/product";

/**
 * One shelf, being written or rewritten.
 *
 * ── The slug is chosen once ──────────────────────────────────────────────
 * A new shelf's slug follows its name until the editor types one themselves.
 * On an existing shelf the field is read-only, because the slug is the `?c=`
 * value in every header link and the thing `products.category_slug` points
 * at — renaming it would break links already sent and re-shelve every pair on
 * it. The name is what a shopper reads; the slug is the address.
 *
 * ── Errors come back from the server ─────────────────────────────────────
 * There is no client-side mirror of the rules. The action validates and
 * returns field errors, which is the only way the uniqueness check — which
 * needs the database — can be reported next to the field it belongs to.
 */

export type CategoryFormValue = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  enabled: boolean;
};

export const EMPTY_CATEGORY: CategoryFormValue = {
  slug: "",
  name: "",
  description: "",
  imageUrl: "",
  enabled: true,
};

export function CategoryForm({
  initial,
  editing = false,
  /* How many pairs sit on this shelf, so hiding it can say what that does. */
  pairCount = 0,
}: {
  initial: CategoryFormValue;
  editing?: boolean;
  pairCount?: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState<CategoryFormValue>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  /* Only a new shelf's slug tracks its name, and only until it is touched. */
  const [slugLocked, setSlugLocked] = useState(editing);

  const set = useCallback(<K extends keyof CategoryFormValue>(key: K, v: CategoryFormValue[K]) => {
    setValue((prev) => ({ ...prev, [key]: v }));
  }, []);

  const submit = () => {
    setBanner(null);
    setErrors({});

    startTransition(async () => {
      const payload = {
        slug: value.slug,
        name: value.name,
        description: value.description,
        imageUrl: value.imageUrl,
        enabled: value.enabled,
        ...(editing ? { position: 0 } : {}),
      };

      const result: CategoryResult = editing
        ? await updateCategoryAction(payload)
        : await createCategoryAction(payload);

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setBanner({ tone: "bad", text: result.error });
        return;
      }

      setBanner({ tone: "ok", text: result.message });

      if (editing) {
        router.refresh();
      } else {
        /* A new shelf's page is the one the editor wants next — they have just
           named it and will want to check it. */
        router.push("/admin/categories");
        router.refresh();
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      {banner ? (
        <p
          role={banner.tone === "bad" ? "alert" : "status"}
          className={
            banner.tone === "bad"
              ? "border-love/40 text-love mb-6 border-l-2 py-1 pl-3 text-[13px]"
              : "border-ink/30 text-ink mb-6 border-l-2 py-1 pl-3 text-[13px]"
          }
        >
          {banner.text}
        </p>
      ) : null}

      <AdminCard title="The shelf">
        <div className="grid gap-x-4 sm:grid-cols-2">
          <AdminInput
            label="Name"
            name="name"
            required
            value={value.name}
            error={errors.name}
            hint="What a shopper reads — in the header, the filters and on the home page."
            onChange={(e) => {
              const name = e.target.value;
              setValue((prev) => ({
                ...prev,
                name,
                slug: slugLocked ? prev.slug : slugifyCategory(name),
              }));
            }}
          />

          <AdminInput
            label="Slug"
            name="slug"
            required
            value={value.slug}
            error={errors.slug}
            readOnly={editing}
            hint={
              editing
                ? "Fixed. It is this shelf's web address and what every pair on it points at."
                : "The web address: /shop?c=<slug>. Chosen once — it cannot be changed later."
            }
            onChange={(e) => {
              setSlugLocked(true);
              set("slug", e.target.value);
            }}
          />
        </div>

        <AdminTextarea
          label="Blurb"
          name="description"
          rows={2}
          value={value.description}
          error={errors.description}
          hint="One sentence: what the shoe is, no adjectives for sale. Shown on the home page's shelf story."
          onChange={(e) => set("description", e.target.value)}
        />

        <AdminInput
          label="Photograph URL"
          name="imageUrl"
          value={value.imageUrl}
          error={errors.imageUrl}
          hint="Optional — shown on the home page's shelf tile. Blank uses the shelf's lead pair instead. Upload to the media library and paste that link; other hosts are refused."
          onChange={(e) => set("imageUrl", e.target.value)}
        />

        <AdminCheckbox
          label="Show this shelf"
          name="enabled"
          checked={value.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
          hint={
            !value.enabled && pairCount > 0
              ? `${pairCount} ${pairCount === 1 ? "pair sits" : "pairs sit"} on this shelf. Hiding it takes the shelf out of the header and the filters — the pairs stay on /shop and keep their own pages.`
              : "A hidden shelf is off the header, the filters and the home page. Its pairs are not affected."
          }
        />

        {errors.enabled ? (
          <p role="alert" className="text-love -mt-2 mb-4 text-[12px]">
            {errors.enabled}
          </p>
        ) : null}
      </AdminCard>

      <div className="mt-6 flex items-center gap-2">
        <AdminSubmitButton pending={isPending}>
          {editing ? "Save shelf" : "Add shelf"}
        </AdminSubmitButton>
        <AdminButton
          type="button"
          variant="quiet"
          disabled={isPending}
          onClick={() => router.push("/admin/categories")}
        >
          Cancel
        </AdminButton>
      </div>
    </form>
  );
}
