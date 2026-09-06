/**
 * Drives the product lifecycle probe and prints what it found.
 *
 * The probe itself is a route inside the app — see
 * app/admin/(protected)/lifecycle-probe/route.ts. It has to live there
 * because the Server Actions it tests are server-only and cannot be imported
 * by a plain script.
 */
import { withTestAdmin } from "./test-session";

async function main() {
  await withTestAdmin(async ({ get }) => {
    const response = await get("/admin/lifecycle-probe");

    let parsed: { out?: string[] };
    try {
      parsed = JSON.parse(response.body);
    } catch {
      console.log(`  the probe returned ${response.status}:\n${response.body.slice(0, 500)}`);
      process.exitCode = 1;
      return;
    }

    const lines = parsed.out ?? [];
    for (const line of lines) console.log(`  ${line}`);

    const failures = lines.filter((line) => line.startsWith("FAIL")).length;
    console.log(
      failures === 0 ? "\n  Product lifecycle verified.\n" : `\n  ${failures} failure(s).\n`,
    );
    process.exitCode = failures === 0 ? 0 : 1;
  });
}

main().catch((error) => {
  console.error("Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
