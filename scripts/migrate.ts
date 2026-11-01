import "./env";
import { closeDb, databaseLabel, getDb, usingEmbeddedDatabase } from "../src/lib/db";
import { runMigrations } from "../src/lib/db/migrations";

async function main() {
  const client = await getDb();
  const applied = await runMigrations(client);
  console.info(`[db:migrate] ${databaseLabel()}`);
  console.info(
    applied.length > 0
      ? `[db:migrate] applied: ${applied.join(", ")}`
      : "[db:migrate] database is up to date",
  );
  if (usingEmbeddedDatabase()) {
    console.info(
      "[db:migrate] using the embedded development database — set DATABASE_URL for a real PostgreSQL instance",
    );
  }
}

main()
  .catch((error) => {
    console.error("[db:migrate] failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
