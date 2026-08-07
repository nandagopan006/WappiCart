"use client";

import { useEffect, useState } from "react";

import { canAnimateRich } from "@/lib/motion";

/**
 * The layer that keeps the page from ever being completely still: film grain,
 * one slow-moving warmth, and a vignette that pulls the corners down.
 *
 * All three are painted in CSS on a single fixed, pointer-events-none element
 * — no canvas, no particle loop, no per-frame JavaScript. The grain is an
 * inline SVG turbulence filter encoded as a data URI, so it costs one paint
 * and then animates on `transform` alone, which the compositor handles without
 * ever touching the main thread.
 *
 * Mounted only where it can be appreciated and afforded: a real pointer, and
 * no reduced-motion request. On a phone this is battery spent on an effect
 * that reads as noise on a small screen.
 */
export function Atmosphere() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const update = () => setEnabled(canAnimateRich());
    update();

    const pointer = window.matchMedia("(pointer: fine)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    pointer.addEventListener("change", update);
    motion.addEventListener("change", update);

    return () => {
      pointer.removeEventListener("change", update);
      motion.removeEventListener("change", update);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {/* Warmth that drifts across the page over three quarters of a minute.
          Ember at 6% — light, never paint. */}
      <div className="atmosphere-light" />
      {/* Grain sits above the light so it textures it rather than the reverse. */}
      <div className="atmosphere-grain" />
      <div className="atmosphere-vignette" />
    </div>
  );
}
