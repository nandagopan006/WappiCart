"use client";

import { useState, useTransition } from "react";

import { AdminButton, AdminSubmitButton } from "@/components/admin/ui/button";
import { AdminInput, AdminSelect, AdminTextarea } from "@/components/admin/ui/fields";
import { AdminBadge, AdminCard } from "@/components/admin/ui/surface";
import { saveHomepageLayoutAction } from "@/lib/actions/homepage";
import type { Category, Shelf } from "@/lib/catalogue";
import {
  SECTION_ITEM_LIMITS,
  SECTION_LABELS,
  type HomepageSectionType,
} from "@/lib/validation/homepage";

/**
 * Arranging the home page.
 *
 * ── What this can and cannot do ──────────────────────────────────────────
 * Reorder sections, turn them off, retitle them, choose which pairs they
 * show, and set how many. It cannot add a section type or remove one — every
 * type maps to a component, and a section with nothing behind it would render
 * a gap. It cannot touch colour, type, spacing or column count either; those
 * are the design system's, not the editor's.
 *
 * ── Reordering is buttons, not drag-and-drop ─────────────────────────────
 * Move up and move down work with a keyboard, with a screen reader, and on a
 * phone, which drag-and-drop does not without a great deal of extra code.
 * Nine sections is a short enough list that two clicks is not a burden.
 *
 * ── One save for the whole page ──────────────────────────────────────────
 * Order is a property of the set, so the entire layout is submitted together
 * and written in one transaction. Saving section by section would leave the
 * page half-rearranged if the second request failed.
 */

export type EditorSection = {
  id: string;
  type: HomepageSectionType;
  title: string | null;
  description: string | null;
  enabled: boolean;
  position: number;
  itemLimit: number | null;
  config: Record<string, unknown>;
  productSlugs: string[];
};

export function HomepageEditor({
  initial,
  shelves,
  productOptions,
}: {
  initial: EditorSection[];
  /* The shelves a category story can point at, sent from the server. */
  shelves: Shelf[];
  productOptions: { slug: string; name: string; category: string }[];
}) {
  const [sections, setSections] = useState<EditorSection[]>(initial);
  const [banner, setBanner] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);

  const dirty = JSON.stringify(sections) !== JSON.stringify(initial);

  const patch = (id: string, changes: Partial<EditorSection>) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...changes } : s)));

  const move = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    setSections(next.map((s, i) => ({ ...s, position: i })));
  };

  const save = () => {
    setBanner(null);
    startTransition(async () => {
      const payload = sections.map((s, i) => ({ ...s, position: i }));
      const result = await saveHomepageLayoutAction(payload);
      setBanner(
        result.ok ? { tone: "ok", text: result.message } : { tone: "bad", text: result.error },
      );
    });
  };

  const enabledCount = sections.filter((s) => s.enabled).length;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {banner ? (
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
      ) : null}

      <div className="border-line mb-6 flex flex-wrap items-center gap-3 border-b pb-4">
        <p className="text-grey text-[12px]">
          {enabledCount} of {sections.length} sections on. Numbering follows the order below.
        </p>
        <div className="ml-auto flex gap-2">
          {dirty ? (
            <AdminButton type="button" variant="quiet" onClick={() => setSections(initial)} disabled={isPending}>
              Discard changes
            </AdminButton>
          ) : null}
          {/* The label does not change with state. A disabled button reading
              "Saved" on first load claims something happened that did not;
              disabled-and-named says the same thing without the fiction. */}
          <AdminSubmitButton pending={isPending} disabled={!dirty} pendingLabel="Saving…">
            Save home page
          </AdminSubmitButton>
        </div>
      </div>

      <ol>
        {sections.map((section, index) => {
          const bounds = SECTION_ITEM_LIMITS[section.type];
          const open = openId === section.id;
          /* The hero carries no numeral on the page, so it carries none here. */
          const numeral =
            section.type === "hero"
              ? "—"
              : String(
                  sections
                    .slice(0, index + 1)
                    .filter((s) => s.enabled && s.type !== "hero").length,
                ).padStart(2, "0");

          return (
            <li key={section.id} className="border-line mb-3 border">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="text-grey w-7 shrink-0 text-[12px] tabular-nums">
                  {section.enabled ? numeral : "··"}
                </span>

                <span className="text-ink min-w-0 flex-1 text-[13px]">
                  {SECTION_LABELS[section.type]}
                  {section.title ? <span className="text-grey"> · {section.title}</span> : null}
                </span>

                <AdminBadge tone={section.enabled ? "published" : "draft"}>
                  {section.enabled ? "On" : "Off"}
                </AdminBadge>

                <div className="flex items-center gap-1">
                  <AdminButton
                    type="button"
                    variant="quiet"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Move ${SECTION_LABELS[section.type]} up`}
                  >
                    ↑
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="quiet"
                    disabled={index === sections.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Move ${SECTION_LABELS[section.type]} down`}
                  >
                    ↓
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="quiet"
                    onClick={() => patch(section.id, { enabled: !section.enabled })}
                    aria-pressed={section.enabled}
                  >
                    {section.enabled ? "Turn off" : "Turn on"}
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="quiet"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : section.id)}
                  >
                    {open ? "Close" : "Edit"}
                  </AdminButton>
                </div>
              </div>

              {open ? (
                <div className="border-line bg-mist/40 border-t px-4 py-4">
                  <SectionFields
                    section={section}
                    bounds={bounds}
                    shelves={shelves}
                    productOptions={productOptions}
                    onChange={(changes) => patch(section.id, changes)}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </form>
  );
}

function SectionFields({
  section,
  bounds,
  shelves,
  productOptions,
  onChange,
}: {
  section: EditorSection;
  bounds: { min: number; max: number } | null;
  shelves: Shelf[];
  productOptions: { slug: string; name: string; category: string }[];
  onChange: (changes: Partial<EditorSection>) => void;
}) {
  const config = section.config as { category?: Category; blurb?: string; side?: string; eyebrow?: string; headline?: string };

  const setConfig = (patch: Record<string, unknown>) =>
    onChange({ config: { ...section.config, ...patch } });

  const setPick = (slotIndex: number, slug: string) => {
    const next = [...section.productSlugs];
    if (slug === "") next.splice(slotIndex, 1);
    else next[slotIndex] = slug;
    onChange({ productSlugs: next.filter(Boolean) });
  };

  const slots = bounds ? Math.min(bounds.max, section.itemLimit ?? bounds.max) : 0;

  return (
    <>
      {/* Only the sections that actually render a heading get a title box. */}
      {(["new_in", "category_tiles", "order_block"] as const).includes(section.type as never) ? (
        <AdminInput
          label="Heading"
          name={`title-${section.id}`}
          value={section.title ?? ""}
          hint="Leave blank to use the wording the section ships with."
          onChange={(e) => onChange({ title: e.target.value })}
        />
      ) : null}

      {section.type === "category_story" ? (
        <div className="grid gap-x-4 sm:grid-cols-2">
          <AdminSelect
            label="Shelf"
            name={`cat-${section.id}`}
            value={config.category ?? shelves[0]?.slug ?? ""}
            onChange={(e) => setConfig({ category: e.target.value })}
            options={shelves.map((shelf) => ({ value: shelf.slug, label: shelf.name }))}
          />
          <AdminSelect
            label="Photograph side"
            name={`side-${section.id}`}
            value={config.side ?? "left"}
            hint="Alternate between stories — never the same shape twice in a row."
            onChange={(e) => setConfig({ side: e.target.value })}
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
          />
          <AdminTextarea
            label="Blurb"
            name={`blurb-${section.id}`}
            rows={2}
            value={config.blurb ?? ""}
            wrapperClassName="sm:col-span-2"
            hint="One sentence: what the shoe is, no adjectives for sale. Blank uses the shipped copy."
            onChange={(e) => setConfig({ blurb: e.target.value })}
          />
        </div>
      ) : null}

      {section.type === "collection_spread" ? (
        <>
          <AdminInput
            label="Eyebrow"
            name={`eyebrow-${section.id}`}
            value={config.eyebrow ?? ""}
            onChange={(e) => setConfig({ eyebrow: e.target.value })}
          />
          <AdminTextarea
            label="Headline"
            name={`headline-${section.id}`}
            rows={2}
            value={config.headline ?? ""}
            onChange={(e) => setConfig({ headline: e.target.value })}
          />
        </>
      ) : null}

      {bounds && bounds.min !== bounds.max ? (
        <AdminInput
          label="How many pairs"
          name={`limit-${section.id}`}
          type="number"
          min={bounds.min}
          max={bounds.max}
          value={section.itemLimit ?? ""}
          hint={`Between ${bounds.min} and ${bounds.max}.`}
          onChange={(e) =>
            onChange({ itemLimit: e.target.value === "" ? null : Number(e.target.value) })
          }
        />
      ) : null}

      {slots > 0 ? (
        <div>
          <p className="a-label mb-2">Pairs shown</p>
          <p className="a-hint mb-3">
            Leave blank to let the section choose — featured pairs for the hero, newest for New in.
            A pinned pair that is later archived drops out and the fallback fills the gap.
          </p>
          <div className="grid gap-x-4 sm:grid-cols-2">
            {Array.from({ length: slots }, (_, i) => (
              <AdminSelect
                key={i}
                label={`Slot ${i + 1}`}
                name={`pick-${section.id}-${i}`}
                value={section.productSlugs[i] ?? ""}
                onChange={(e) => setPick(i, e.target.value)}
                options={[
                  { value: "", label: "— choose automatically —" },
                  ...productOptions.map((p) => ({
                    value: p.slug,
                    label: `${p.name} (${p.category})`,
                  })),
                ]}
              />
            ))}
          </div>
        </div>
      ) : null}

      {section.type === "brand_statement" ? (
        <p className="text-grey text-[13px]">
          This section carries no product and no editable copy — it is the page&rsquo;s one
          display-type moment, and its wording lives in the component.
        </p>
      ) : null}
    </>
  );
}
