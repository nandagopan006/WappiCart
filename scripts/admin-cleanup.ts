/**
 * Remove every leftover test account.
 *
 *   npm run admin:cleanup
 *
 * The check scripts call the same routine on the way in, so this is only
 * needed when you want to tidy up without running one.
 */
import { purgeTestUsers } from "./test-users";
import { connect } from "./db-connect";

async function main() {
  const { db, close } = connect();
  try {
    const removed = await purgeTestUsers(db, true);
    console.log(
      removed === 0
        ? "\n  No leftover test accounts.\n"
        : `\n  Removed ${removed} leftover test account(s).\n`,
    );
  } finally {
    await close();
  }
}
main().catch((e) => { console.error("Failed:", (e as Error).message); process.exit(1); });
