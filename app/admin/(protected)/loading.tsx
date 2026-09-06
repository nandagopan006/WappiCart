/**
 * What you see the instant you click a sidebar link.
 *
 * ── Why this file makes the admin feel fast ──────────────────────────────
 * Without it, clicking a link does nothing visible until the server replies —
 * two or three hundred milliseconds of a page that looks stuck. Next renders
 * this immediately instead, so the click lands, the old page clears, and the
 * real content drops into the same shape a moment later.
 *
 * It also lets Next prefetch these routes when a link scrolls into view, which
 * it will not do for a page that has no loading state.
 *
 * ── Why it is not a shimmering skeleton ──────────────────────────────────
 * No fake headings, no grey blocks pretending to be text, nothing pulsing.
 * The design system rules that out for the shop, and it is just as true here:
 * a fake heading is something to read that turns out not to be real. This
 * holds the page's shape — a title row, a rule, some breathing space — and
 * says plainly that it is loading.
 */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* The same header shape every admin page opens with, so nothing jumps
          when the real one arrives. */}
      <header className="border-line mb-6 border-b pb-5">
        <div className="bg-mist h-6 w-48 max-w-[60%]" />
        <div className="bg-mist mt-3 h-3 w-80 max-w-[80%] opacity-60" />
      </header>

      <p className="text-grey text-[12px] tracking-[0.1em] uppercase">Loading…</p>
    </div>
  );
}
