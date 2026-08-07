"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

import { EASE_SETTLE, prefersReducedMotion } from "@/lib/motion";
import { shop } from "@/lib/shop";

/**
 * The first two seconds: a wordmark, a count, and a curtain that lifts.
 *
 * ── The safety rule this is built around ─────────────────────────────────
 * A loader is the one component that can hide an entire shop. If its
 * JavaScript never arrives, or throws, the curtain must still come up. So the
 * overlay carries a pure-CSS animation (`loader-failsafe`) that fades it out
 * and disables its pointer events after 2.4s with no script involved at all.
 * GSAP normally beats that timer and drives the real exit; the CSS is what
 * runs when nothing else does.
 *
 * It is also shown once per browser session, not once per navigation. Watching
 * the same curtain lift on every visit within a session is a toll, not an
 * experience — sessionStorage keeps it to the first arrival.
 *
 * Under reduced motion it never renders. The counter is tied to a real signal
 * (`window.load`) rather than a fixed fake duration, so it cannot claim 100%
 * while images are still arriving.
 */

const SESSION_KEY = "wappicart:loaded";

export function SiteLoader() {
  /* Rendered on the server as `true` would flash for visitors who should not
     see it at all, so the decision is made on mount — before paint, via
     useState's initialiser running client-side only after hydration. */
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setActive(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    if (!root) return;

    document.documentElement.classList.add("is-loading");

    /* ── Hard backstop ───────────────────────────────────────────────────
       Three independent things now have to fail before a visitor is stuck
       behind this curtain: GSAP's exit timeline, the CSS failsafe animation,
       and this timer. It is deliberate belt-and-braces — every other
       component on the site can fail and cost a nice effect, this one can
       cost the whole shop. React owns the unmount, so it cannot be defeated
       by anything going wrong inside GSAP. */
    const backstop = window.setTimeout(() => {
      document.documentElement.classList.remove("is-loading");
      setActive(false);
    }, 2800);

    /* The exit can be reached from the load event and from the timeout below.
       Without this, a slow `load` fires the whole exit twice and the two
       timelines fight over the same transform. */
    let finished = false;

    const counter = { value: 0 };
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline();

      /* Creeps to 90 on its own, then completes when the page really is ready.
         A counter that hits 100 before the hero image has decoded is a lie the
         visitor can see. */
      timeline.to(counter, {
        value: 90,
        duration: 1.1,
        ease: "power2.out",
        onUpdate: () => setProgress(Math.round(counter.value)),
      });

      const finish = () => {
        if (finished) return;
        finished = true;

        gsap.to(counter, {
          value: 100,
          duration: 0.32,
          ease: "power2.out",
          onUpdate: () => setProgress(Math.round(counter.value)),
          onComplete: () => {
            const exit = gsap.timeline({
              onComplete: () => {
                window.clearTimeout(backstop);
                document.documentElement.classList.remove("is-loading");
                setActive(false);
              },
            });

            exit
              .to("[data-loader-content]", { opacity: 0, y: -12, duration: 0.34, ease: "power2.in" })
              /* The curtain lifts rather than fades — a wipe reads as a
                 physical thing leaving, a fade reads as a dialog closing. */
              .to(root, { yPercent: -100, duration: 0.85, ease: EASE_SETTLE }, "-=0.1");
          },
        });
      };

      if (document.readyState === "complete") {
        gsap.delayedCall(0.85, finish);
      } else {
        window.addEventListener("load", () => gsap.delayedCall(0.25, finish), { once: true });
        /* Never wait on a stalled third-party request. */
        gsap.delayedCall(3.2, finish);
      }
    }, root);

    return () => {
      window.clearTimeout(backstop);
      ctx.revert();
      document.documentElement.classList.remove("is-loading");
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={rootRef}
      className="site-loader bg-espresso text-blush fixed inset-0 z-[100] flex flex-col justify-between p-6 md:p-10"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div data-loader-content className="flex flex-1 flex-col justify-between">
        <span className="font-mono text-utility text-blush/50 uppercase">{shop.tagline}</span>

        <div className="flex items-end justify-between gap-6">
          <span className="type-display text-[clamp(2.5rem,11vw,7rem)] leading-[0.85] tracking-[-0.03em]">
            {shop.name.toUpperCase()}
          </span>
          <span className="font-mono text-utility text-blush/70 tabular-nums">
            {String(progress).padStart(3, "0")}
          </span>
        </div>
      </div>

      {/* One hairline filling left to right. The same 1px vocabulary as the
          wave, so the loader belongs to the site rather than to a template. */}
      <div className="bg-blush/15 mt-6 h-px w-full">
        <div
          className="bg-blush h-px origin-left transition-transform duration-200 ease-linear"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
    </div>
  );
}
