"use client";

import { useCallback, useRef, useState } from "react";
import gsap from "gsap";

import { Wordmark } from "@/components/wordmark";
import { prefersReducedMotion, useIsomorphicLayoutEffect } from "@/lib/motion";

/**
 * The brand arriving. Once, on a visitor's first entry, and never again.
 *
 * ── The sequence ─────────────────────────────────────────────────────────
 *   0.00  an empty warm canvas, held just long enough to be noticed
 *   0.25  WAPPI and CART enter from opposite edges, blurred and faint
 *   0.25  they ACCELERATE inward — the entrance eases *in*, not out
 *   1.20  the last stretch is the fastest, and they press 3px past centre
 *   1.50  the meet: overshoot resolves, the mark punches once, a single
 *         soft ring leaves the join
 *   1.95  a hairline draws itself out of the centre beneath the mark
 *   2.30  the focus pull lands — the mark is perfectly sharp
 *   2.45  a hole opens at the middle of the curtain and grows past the
 *         corners, uncovering the site outward from the logo
 *
 * 3.35s end to end, with the site emerging from 2.45s.
 *
 * ── On the pace ──────────────────────────────────────────────────────────
 * Every beat carries an absolute position (see `T` below) rather than being
 * appended, because append order is what broke this once already — a long
 * drift inserted at 0 silently pushed everything after it to the end of that
 * drift. Positions also make retiming honest: change one number and the
 * storyboard still reads top to bottom.
 *
 * The three CSS failsafes in globals.css are set from these numbers, not
 * guessed — 4.0s, 4.4s and 4.6s, each with a second of margin over the
 * 3.35s timeline. Slowing the choreography without moving them is exactly
 * how the curtain once lifted while the logo was still out of focus.
 *
 * ── Why the entrance accelerates ─────────────────────────────────────────
 * The first version used one decelerating ease for the whole travel, which
 * is why it read as a slide rather than an arrival: the halves were at their
 * slowest exactly when they should have had the most momentum. The travel is
 * now two tweens — a long accelerating approach, then a short hard stop —
 * so there is a build-up before the join and the meeting has weight.
 *
 * ── It animates the real logo, not a copy ────────────────────────────────
 * `Wordmark` is the same component the header renders — same split, same
 * weights, same tracking. The halves are moved with `x` alone, so at rest
 * they sit in their natural inline positions and the assembled mark is
 * pixel-identical to the one in the bar.
 *
 * This is also why letter-spacing is never animated. A tracking tween has to
 * land on exactly the value the stylesheet holds, and any rounding error
 * shows as a permanent gap between WAPPI and CART. Every scale acts on the
 * wrapper, which cannot disturb spacing.
 *
 * ── Why the flag is read in the document head ────────────────────────────
 * A returning visitor must never see a frame of this. Decided in an effect,
 * the loader would paint and then vanish — a flash on every visit after the
 * first. An inline script in `layout.tsx` reads localStorage before first
 * paint and stamps `intro-seen` on `<html>`; CSS keeps this hidden from the
 * very first frame. This component only decides whether to *run*.
 *
 * ── It cannot trap the site ──────────────────────────────────────────────
 * Four independent releases, because a loader that sticks is worse than no
 * loader at all: the timeline's completion, a CSS failsafe that hides the
 * surface after 3s whatever JavaScript is doing, a scroll unlock at 3.2s,
 * and a catch that releases immediately if GSAP throws. The flag is written
 * when the timeline *starts*, so leaving mid-animation does not earn a
 * repeat.
 */

const KEY = "wappicart:intro:v1";

/** Five rows of tiled wordmark behind the lockup. */
const WALL_ROWS = [0, 1, 2, 3, 4];

export function BrandIntro({ name = "WappiCart" }: { name?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);

  /* Starts true so the surface is in the DOM for the very first paint; the
     head script has already hidden it for returning visitors. */
  const [alive, setAlive] = useState(true);

  const release = useCallback(() => {
    document.documentElement.classList.remove("intro-running");
    setAlive(false);
  }, []);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    const mark = markRef.current;
    if (!node || !mark) return;

    /* In development the intro plays on every load. An animation you can
       only watch once per browser profile is one you cannot tune — the flag
       makes it invisible from the second reload onward, which looks exactly
       like the feature being broken. Production keeps first-visit-only. */
    const replaying = process.env.NODE_ENV === "development";

    /* The head script already decided this. Nothing to play. */
    if (!replaying && document.documentElement.classList.contains("intro-seen")) {
      release();
      return;
    }

    if (replaying) {
      /* The head script may have stamped this from a previous load; clear it
         so the CSS does not keep the curtain hidden. */
      document.documentElement.classList.remove("intro-seen");
    }

    /* Written now rather than on completion: a visitor who navigates away
       mid-animation has still seen the brand arrive, and showing it again
       would be the loader failing in the other direction. */
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* Private mode or storage disabled. The intro plays once per session
         instead of once per visitor, which is the graceful degradation. */
    }

    /* Nothing scrolls behind the curtain. Released by `release()` and, if
       everything else fails, by the CSS failsafe. */
    document.documentElement.classList.add("intro-running");

    if (prefersReducedMotion()) {
      /* No choreography, no collision. The mark is simply there, briefly,
         and the surface goes. Someone who asked for less motion still gets
         the brand. */
      const timer = window.setTimeout(release, 420);
      return () => window.clearTimeout(timer);
    }

    let ctx: gsap.Context | undefined;

    try {
      ctx = gsap.context(() => {
        const halves = mark.querySelectorAll(
          "[data-wordmark-brand], [data-wordmark-category]",
        );
        const rule = ruleRef.current;
        const pulse = pulseRef.current;

        /* Disarm the CSS start-state failsafe. It exists so a bundle that
           never lands still shows the mark, but a CSS animation outranks
           inline styles — left armed it would fire mid-timeline and snap the
           halves to their end state. GSAP is here, so it is not needed. */
        gsap.set(halves, { animation: "none" });

        /* The press-past distance. Small enough to read as two things
           meeting under momentum, not as a bounce. */
        const OVERSHOOT = 3;

        const wall = wallRef.current;
        const rows = wall?.querySelectorAll("[data-wall-row]") ?? [];

        /* ── Choreography ──────────────────────────────────────────────
           Every beat carries an EXPLICIT position. The first version chained
           with append and "<", which silently broke the moment the wall was
           added: the row drift is a long tween inserted at 0, so it defined
           the timeline's length, and every later tween appended without a
           position landed at the END of that drift rather than after the
           entrance. The focus pull then resolved a second after the CSS
           failsafe had already lifted the curtain — the logo was still
           blurred when it disappeared.

           Absolute positions cannot drift like that. The numbers below are
           the storyboard, readable top to bottom. */
        const T = {
          wall: 0,
          enter: 0.25,
          /* 1.16 + the press's own 0.34 lands exactly on `clash`. The lean,
             stretch and lift finish on that frame, so the halves are square
             the instant they touch — a join made while either side is still
             skewed is a join in the wrong place. */
          press: 1.16,
          clash: 1.5,
          rule: 1.95,
          reveal: 2.45,
        };

        const tl = gsap.timeline({ onComplete: release });

        /* ── Scene 01 · The room fills ────────────────────────────────
           The wall arrives first and alone, so the canvas is never an
           empty sheet waiting for something. The drift is deliberately
           longer than the intro and linear, so it is still moving when
           the reveal starts — a drift that visibly settles reads as a
           second animation ending, competing with the lockup. */
        tl.fromTo(wall, { opacity: 0 }, { opacity: 1, duration: 0.65, ease: "power2.out" }, T.wall)
          .fromTo(
            rows,
            { xPercent: (i: number) => (i % 2 === 0 ? -4 : 2) },
            {
              xPercent: (i: number) => (i % 2 === 0 ? 2 : -4),
              duration: 3.2,
              ease: "none",
            },
            T.wall,
          )

          /* ── Scene 02 · Enter, and build speed ─────────────────────
             `power1.in`: the halves start slowly at the edges and are
             still gaining speed when they hand over. Distance in vw so
             neither half has to cross a phone's whole width. */
          .fromTo(
            halves,
            {
              x: (i: number) => (i === 0 ? "-34vw" : "34vw"),
              opacity: 0,
              filter: "blur(18px)",
              /* Type moving this fast leans into its own direction and
                 stretches along it. Both resolve before the join, so the
                 assembled mark is untouched — but while the halves travel
                 they behave like something with mass instead of two
                 rectangles sliding on rails. */
              skewX: (i: number) => (i === 0 ? -7 : 7),
              scaleX: 1.06,
              y: 10,
            },
            {
              x: (i: number) => (i === 0 ? "-7vw" : "7vw"),
              opacity: 0.92,
              /* Still well out of focus. The pull to sharp is the
                 climax and must not be spent here. */
              filter: "blur(7px)",
              skewX: (i: number) => (i === 0 ? -4 : 4),
              scaleX: 1.035,
              y: 4,
              duration: 0.95,
              ease: "power1.in",
            },
            T.enter,
          )

          /* ── Scene 03 · The last stretch ───────────────────────────
             Fastest movement of the sequence, ending 3px past centre so
             the halves meet under load. */
          .to(
            halves,
            {
              x: (i: number) => (i === 0 ? OVERSHOOT : -OVERSHOOT),
              opacity: 1,
              filter: "blur(3px)",
              /* Lean, stretch and lift all unwind by the moment of contact.
                 Only the 3px press is left to resolve, so the halves meet
                 square — nothing is skewed or scaled when they join. */
              skewX: 0,
              scaleX: 1,
              y: 0,
              duration: 0.34,
              ease: "power1.in",
            },
            T.press,
          )

          /* ── Scene 04 · The clash ──────────────────────────────────
             The press unwinds to exactly 0 — each half's natural inline
             position, so the join is correct at every width with nothing
             measured. */
          .to(halves, { x: 0, duration: 0.5, ease: "power3.out" }, T.clash)

          /* The focus pull, running through the impact and the settle so
             the mark is still finding its edge while it punches, and is
             sharp exactly as the scale reaches 1. */
          .to(halves, { filter: "blur(0px)", duration: 0.8, ease: "power2.out" }, T.clash)

          /* Sharper than blur(0): any filter at all routes the element
             through the filter pipeline and renders type softer. `none`,
             not `clearProps` — clearing the inline value would fall back
             to the CSS start state and re-blur it. */
          .set(halves, { filter: "none" }, T.clash + 0.8)

          /* The wall defers so the lockup is unmistakably the subject. */
          .to(wall, { opacity: 0.32, scale: 0.985, duration: 0.65, ease: "power2.out" }, T.clash)

          /* One hairline ring leaves the join. Air displaced, not light. */
          .fromTo(
            pulse,
            { scale: 0.35, opacity: 0.5 },
            { scale: 1.9, opacity: 0, duration: 0.7, ease: "power2.out" },
            T.clash,
          )

          /* Punch and settle in one tween, on the wrapper so letter
             spacing is never touched. Ends at exactly 1. */
          .fromTo(
            mark,
            { scale: 1 },
            {
              keyframes: { scale: [1.035, 0.995, 1] },
              duration: 0.62,
              ease: "power2.out",
            },
            T.clash,
          )

          /* ── Scene 05 · The one secondary detail ───────────────────
             A hairline draws out of the centre — the site's own material
             rather than a borrowed effect. */
          .fromTo(
            rule,
            { scaleX: 0, opacity: 0 },
            { scaleX: 1, opacity: 1, duration: 0.65, ease: "power3.out" },
            T.rule,
          )

          /* ── Scene 06 · The site is born from the mark ─────────────
             A hole opens where the logo stands and grows past the
             corners. Everything else leaves a beat ahead of it. */
          .add(() => node.classList.add("is-revealing"), T.reveal)
          .to(mark, { scale: 1.06, opacity: 0, duration: 0.55, ease: "power2.in" }, T.reveal)
          .to(rule, { opacity: 0, duration: 0.38, ease: "none" }, T.reveal)
          .to(wall, { opacity: 0, duration: 0.46, ease: "power2.in" }, T.reveal)
          .fromTo(
            node,
            { "--intro-reveal": "0%" },
            { "--intro-reveal": "155%", duration: 0.85, ease: "power2.inOut" },
            T.reveal + 0.05,
          );
      }, node);
    } catch {
      /* GSAP unavailable or threw. The site matters more than the
         animation. */
      release();
    }

    return () => ctx?.revert();
  }, [release]);

  if (!alive) return null;

  return (
    <div
      ref={ref}
      /* Decorative curtain: a screen reader should be reading the page
         underneath, not a logo. */
      aria-hidden="true"
      className="brand-intro bg-paper fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* A very faint warm wash so the canvas is not a flat sheet of white.
          One radial; there is no other gradient on the site. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 45%, var(--color-paper), var(--color-mist))",
        }}
      />

      {/* ── The wall ──────────────────────────────────────────────────────
          The mark repeated across the canvas in the palette's faintest
          value, each row drifting a different way. It is texture: the eye
          reads the hero lockup in front and registers the wall as the brand
          filling the room.

          Rows alternate direction by index — deterministic, so the server
          and the client agree and there is nothing random to desync. */}
      <div
        ref={wallRef}
        className="brand-intro-wall text-line pointer-events-none absolute inset-0 flex flex-col justify-center gap-[3vh] overflow-hidden opacity-0"
      >
        {WALL_ROWS.map((row) => (
          <div
            key={row}
            data-wall-row
            className="flex w-max shrink-0 will-change-transform"
            /* The middle row sits lowest so it never competes with the
               lockup resting on top of it. */
            style={{ opacity: row === 2 ? 0.45 : 1 }}
          >
            {Array.from({ length: 7 }, (_, copy) => (
              <span key={copy} className="px-[1.6vw]">
                <Wordmark name={name} />
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* The ring, centred on the join. */}
      <div
        ref={pulseRef}
        className="brand-intro-pulse pointer-events-none absolute h-[34vmin] w-[34vmin] will-change-transform"
      />

      <div ref={markRef} className="brand-intro-mark text-ink relative will-change-transform">
        <Wordmark name={name} />
      </div>

      <div
        ref={ruleRef}
        className="brand-intro-rule relative mt-6 w-[min(18rem,42vw)] will-change-transform"
      />
    </div>
  );
}
