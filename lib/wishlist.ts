"use client";

import { useSyncExternalStore } from "react";

/**
 * The saved pairs.
 *
 * ── Why this and not a store library ─────────────────────────────────────
 * The project has no global state, no Context, no auth and no API. Adding
 * Zustand or Redux to hold a list of strings would be the largest dependency
 * in the app serving the smallest job. `useSyncExternalStore` is React's own
 * answer for exactly this shape — an external mutable source that components
 * subscribe to — and it costs nothing.
 *
 * It is also the only approach here that is hydration-safe by construction.
 * The server has no localStorage, so `getServerSnapshot` returns an empty
 * list; React renders that, hydrates, then re-renders with the real value.
 * Reading localStorage during render instead would produce markup the server
 * cannot match, which is the classic way this feature ships a hydration
 * error.
 *
 * ── Slugs, never product objects ─────────────────────────────────────────
 * Only the slug is stored. Product data lives in `data/products.json` and is
 * the single source of truth for price, stock and photography — copying it
 * into localStorage would mean a shopper seeing last month's price on a pair
 * they saved. A slug that no longer exists simply resolves to nothing when
 * the wishlist page maps over it, so a discontinued pair disappears rather
 * than rendering broken.
 */

const KEY = "wappicart:wishlist:v1";

/** A stable reference for the empty case — `useSyncExternalStore` compares
    snapshots by identity, and returning a fresh `[]` each read would loop. */
const EMPTY: readonly string[] = Object.freeze([]);

let snapshot: readonly string[] = EMPTY;
let loaded = false;

const listeners = new Set<() => void>();

/**
 * Anything may be in localStorage — a half-written value, another app's key,
 * a shape from a future version. Parse defensively and fall back to empty
 * rather than throwing inside a render.
 */
function parse(value: string | null): string[] {
  if (!value) return [];

  try {
    const data: unknown = JSON.parse(value);
    if (!Array.isArray(data)) return [];

    /* Filter to strings and de-duplicate in one pass, so a corrupted store
       can never produce two hearts for one pair. */
    return Array.from(
      new Set(data.filter((item): item is string => typeof item === "string" && item.length > 0)),
    );
  } catch {
    return [];
  }
}

/** localStorage throws in Safari private mode and when storage is disabled.
    The wishlist then works for the session and simply does not persist. */
function load() {
  if (loaded) return;
  loaded = true;

  try {
    snapshot = Object.freeze(parse(window.localStorage.getItem(KEY)));
  } catch {
    snapshot = EMPTY;
  }
}

function commit(next: string[]) {
  snapshot = Object.freeze(next);

  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Out of quota or unavailable — keep the in-memory value so the current
       session still behaves correctly. */
  }

  for (const listener of listeners) listener();
}

/** Another tab changed the list. Adopt its value rather than overwriting it. */
function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== KEY) return;
  snapshot = Object.freeze(parse(event.newValue));
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);

  if (listeners.size === 1) window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/**
 * Add or remove, derived from the committed list rather than from a
 * component's copy of it — so a double-click cannot toggle twice off one
 * stale value, and two cards for the same pair can never disagree.
 */
export function toggleWishlist(slug: string) {
  load();
  const next = snapshot.includes(slug)
    ? snapshot.filter((item) => item !== slug)
    : [...snapshot, slug];
  commit(next);
}

/**
 * Empty the list.
 *
 * Guarded on length so a second press — or a double-fire from an impatient
 * click — is a no-op rather than a redundant write and a redundant render of
 * every subscriber.
 */
export function clearWishlist() {
  load();
  if (snapshot.length === 0) return;
  commit([]);
}

/** Every saved slug, oldest first. */
export function useWishlist(): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return snapshot;
    },
    () => EMPTY,
  );
}

/**
 * Whether one pair is saved.
 *
 * Deliberately its own subscription returning a boolean: a card re-renders
 * only when its own state flips, not every time any other pair is saved. On
 * a twelve-tile grid that is the difference between one re-render and twelve.
 */
export function useIsWishlisted(slug: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return snapshot.includes(slug);
    },
    () => false,
  );
}

/** How many pairs are saved. A primitive, so the header re-renders only when
    the number actually changes. */
export function useWishlistCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return snapshot.length;
    },
    () => 0,
  );
}
