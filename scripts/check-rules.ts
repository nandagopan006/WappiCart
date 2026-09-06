/**
 * Checks the rules the project documents but a computer was not enforcing.
 *
 *   npm run check:rules
 *
 * ── Why this file exists ─────────────────────────────────────────────────
 * CODE-GUIDE.md lists four rules that must not be broken. Each of them had
 * already caused a real bug. They were written down carefully — and one of
 * them ("never run database queries in parallel") was still broken in five
 * places months later, because a comment cannot fail a build.
 *
 * So each rule is now a search over the source. A violation stops the check
 * with the file, the line, and what to do instead.
 *
 * ── How to add a rule ────────────────────────────────────────────────────
 * Add an entry to RULES below: which files to look at, what to look for, and
 * the sentence someone should read when it fires. Keep the sentence practical
 * — "use X instead" beats "this is forbidden".
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

type Violation = { file: string; line: number; text: string };

type Rule = {
  name: string;
  /** Why this matters, shown when the rule fires. */
  why: string;
  /** What to do instead. */
  fix: string;
  /** Which folders to search. */
  roots: string[];
  /** A file is checked only if this returns true. */
  applies?: (path: string, source: string) => boolean;
  /** A line is a violation if this returns true. */
  offends: (line: string, path: string, source: string) => boolean;
};

/* Files that are allowed to break a rule, with the reason. Keep this short —
   a long list of exceptions means the rule is wrong, not the code. */
const ALLOWED = new Set<string>([
  /* Test probes deliberately drive the real actions in unusual ways. */
  "app/admin/(protected)/lifecycle-probe/route.ts",
  "app/admin/(protected)/edge-probe/route.ts",
]);

const RULES: Rule[] = [
  {
    name: "No parallel database queries",
    why: "Supabase's pooler resets a connection asked to run several queries at once. It fails as ECONNRESET in production, and in development as a page that hangs for five minutes with nothing in the logs.",
    fix: "Await them one after another. Each query here takes about 70ms, so running them in order costs almost nothing.",
    roots: ["app", "lib", "components"],
    offends: (line) =>
      /Promise\.all\(/.test(line) &&
      /\bdb\b|get[A-Z]\w*\(|list[A-Z]\w*\(|published[A-Z]\w*\(|count[A-Z]\w*\(/.test(line),
  },
  {
    name: "Browser files must not import the database",
    why: "lib/products.ts, lib/shop.ts, lib/db and lib/auth are server-only. Importing one from a file that runs in the browser is a build error — and a file runs in the browser if it says \"use client\" OR if any client file imports it, however indirectly.",
    fix: 'Take the data as a prop. For types and helpers import "@/lib/catalogue", which holds no data and is safe anywhere.',
    roots: ["components", "app"],
    /* Only files that actually reach the browser. A Server Component in
       components/ — the header, the footer — may import these freely, which
       is why this cannot be a simple folder rule. */
    applies: (path) => clientGraph().has(path),
    offends: (line) =>
      /from ["']@\/lib\/(products|shop|db|auth)["']/.test(line) && !line.trim().startsWith("import type"),
  },
  {
    name: "Every save action checks the login",
    why: "A Server Action is its own web endpoint. Anyone can call it directly without ever opening the admin, so the check on the page does not protect it.",
    fix: "Start the file's exported actions with `await requireAdminForAction()` and return { ok: false } when it fails.",
    roots: ["lib/actions"],
    applies: (path, source) =>
      source.includes('"use server"') &&
      /export async function/.test(source) &&
      /* Signing out needs no check: it only clears the caller's own cookies. */
      !path.endsWith("auth.ts"),
    offends: (_line, _path, source) =>
      !source.includes("requireAdminForAction") && !source.includes("requireAdmin("),
  },
  {
    name: "No hex colours outside lib/palette.ts",
    why: "The shop has five colours plus two accents, all defined as tokens. A hex code in a component is how a design system stops being one.",
    fix: "Use a token: text-ink, bg-mist, border-line. The two literals that genuinely cannot read CSS live in lib/palette.ts.",
    roots: ["components", "app"],
    applies: (path) => path.endsWith(".tsx"),
    offends: (line) =>
      /#[0-9a-fA-F]{3,8}\b/.test(line) &&
      /* Data URLs, SVG path data and comments are not colour decisions. */
      !/^\s*(\/\/|\*|\/\*)/.test(line) &&
      !line.includes("data:") &&
      !line.includes("digest"),
  },
  {
    name: "No raw SQL built from strings",
    why: "sql.raw with a value pasted into it is how a query that is safe today becomes an injection tomorrow.",
    fix: "Use the query builder, or the sql`` template with ${values} — Drizzle sends those as parameters, so a value can never be read as SQL.",
    roots: ["lib", "app"],
    offends: (line) => /sql\.raw\(\s*[`'"].*\$\{/.test(line),
  },
  {
    name: "A use-server file exports only functions",
    why: 'Next turns every export of a "use server" file into a callable endpoint. Exporting a number or an array is a build error.',
    fix: "Move constants to a normal module — see lib/media-limits.ts.",
    roots: ["lib/actions"],
    applies: (_path, source) => source.includes('"use server"'),
    offends: (line) =>
      /^export const \w+\s*=/.test(line) && !/=\s*(async\s*)?\(/.test(line) && !line.includes("=>"),
  },
];

/* ── Which files end up in the browser ─────────────────────────────────── */

/**
 * Every file that runs in the browser.
 *
 * A file is in the browser if it says "use client" — or if a file that does
 * imports it, at any depth. That second half is the part people miss:
 * components/price.tsx had no "use client" of its own, but a client component
 * imported it, and that was enough to break the build.
 *
 * Worked out once and reused, because it walks every file.
 */
let cachedGraph: Set<string> | null = null;

function clientGraph(): Set<string> {
  if (cachedGraph) return cachedGraph;

  const all = [...sourceFiles("components"), ...sourceFiles("app"), ...sourceFiles("lib")];
  const sources = new Map<string, string>();

  for (const file of all) {
    const path = relative(process.cwd(), file).replace(/\\/g, "/");
    sources.set(path, readFileSync(file, "utf8"));
  }

  /* Start from the files that declare themselves client components. */
  const inBrowser = new Set<string>();
  for (const [path, source] of sources) {
    if (/^\s*["']use client["']/m.test(source)) inBrowser.add(path);
  }

  /* Then follow their imports until nothing new is found. */
  let grew = true;
  while (grew) {
    grew = false;

    for (const path of [...inBrowser]) {
      const source = sources.get(path);
      if (!source) continue;

      for (const match of source.matchAll(/from ["']@\/([^"']+)["']/g)) {
        const target = resolveImport(match[1], sources);
        if (target && !inBrowser.has(target)) {
          inBrowser.add(target);
          grew = true;
        }
      }
    }
  }

  cachedGraph = inBrowser;
  return inBrowser;
}

/** "@/components/price" → "components/price.tsx", if that file exists. */
function resolveImport(specifier: string, sources: Map<string, string>): string | null {
  for (const suffix of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    const candidate = `${specifier}${suffix}`;
    if (sources.has(candidate)) return candidate;
  }
  return null;
}

/* ── Walking the files ─────────────────────────────────────────────────── */

function sourceFiles(root: string): string[] {
  const found: string[] = [];

  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry === "node_modules" || entry.startsWith(".next")) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry)) found.push(full);
    }
  };

  walk(root);
  return found;
}

function main() {
  let failures = 0;
  console.log();

  for (const rule of RULES) {
    const violations: Violation[] = [];

    for (const root of rule.roots) {
      for (const file of sourceFiles(root)) {
        const path = relative(process.cwd(), file).replace(/\\/g, "/");
        if (ALLOWED.has(path)) continue;

        const source = readFileSync(file, "utf8");
        if (rule.applies && !rule.applies(path, source)) continue;

        const lines = source.split("\n");

        /* A whole-file rule reports once, at line 1. */
        if (rule.offends("", path, source) && !lines.some((l) => rule.offends(l, path, source))) {
          violations.push({ file: path, line: 1, text: "(whole file)" });
          continue;
        }

        lines.forEach((line, index) => {
          if (rule.offends(line, path, source)) {
            violations.push({ file: path, line: index + 1, text: line.trim().slice(0, 78) });
          }
        });
      }
    }

    if (violations.length === 0) {
      console.log(`  OK    ${rule.name}`);
      continue;
    }

    failures += violations.length;
    console.log(`  FAIL  ${rule.name} — ${violations.length} place(s)`);
    console.log(`        ${rule.why}`);
    console.log(`        Fix: ${rule.fix}`);
    for (const v of violations.slice(0, 6)) {
      console.log(`          ${v.file}:${v.line}  ${v.text}`);
    }
    if (violations.length > 6) console.log(`          …and ${violations.length - 6} more`);
    console.log();
  }

  console.log(
    failures === 0
      ? "\n  Every documented rule is followed.\n"
      : `\n  ${failures} violation(s). Fix them, or if a rule is wrong, change the rule.\n`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main();
