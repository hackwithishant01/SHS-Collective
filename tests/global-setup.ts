import { rmSync } from "node:fs";
import path from "node:path";

const testDbDir = path.join(process.cwd(), ".data", "vitest-db");

/**
 * Starts every test run from an empty embedded database. The schema is created
 * by the normal migration runner on the first query, so tests exercise the
 * production SQL rather than a hand-maintained fixture.
 */
export default function setup(): () => void {
  rmSync(testDbDir, { recursive: true, force: true });

  return () => {
    try {
      rmSync(testDbDir, { recursive: true, force: true });
    } catch {
      // Windows may still hold a file handle after the worker exits; the next
      // run removes the directory anyway.
    }
  };
}
