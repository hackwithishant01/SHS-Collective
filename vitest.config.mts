import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit and integration tests share one embedded PostgreSQL database per run.
 * `tests/global-setup.ts` deletes it before the first test, and the app's
 * migration runner creates the schema on first query, using exactly the same
 * SQL that production uses.
 */
const testDbDir = path.join(process.cwd(), ".data", "vitest-db");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // PGlite is a single-connection, in-process database: keep one worker and
    // run files sequentially so transactions never interleave.
    fileParallelism: false,
    maxWorkers: 1,
    isolate: false,
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      SHS_DB_DIR: testDbDir,
    },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
