import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Rows coming back from the database. Typed row objects are declared as
 * interfaces, which do not have implicit index signatures, so the constraint
 * stays at `object` and each caller supplies its own row type.
 */
export type DbRow = object;

export interface Queryable {
  query<T extends DbRow = DbRow>(text: string, params?: readonly unknown[]): Promise<T[]>;
  /** Executes one or more statements without parameters. Used for migrations. */
  exec(sql: string): Promise<void>;
}

export interface DatabaseClient extends Queryable {
  /**
   * Runs a callback inside a single database transaction. The callback receives
   * a client scoped to that transaction. Nested transactions are not supported.
   */
  tx<T>(fn: (client: Queryable) => Promise<T>): Promise<T>;
}

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

export async function runMigrations(client: DatabaseClient): Promise<string[]> {
  await client.query(
    `create table if not exists schema_migrations (
       version text primary key,
       applied_at timestamptz not null default now()
     )`,
  );

  let files: string[];
  try {
    files = (await readdir(MIGRATIONS_DIR))
      .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
      .sort();
  } catch {
    throw new Error(
      `Migration directory not found at ${MIGRATIONS_DIR}. Run commands from the project root.`,
    );
  }

  const appliedRows = await client.query<{ version: string }>(
    `select version from schema_migrations order by version`,
  );
  const applied = new Set(appliedRows.map((row) => row.version));
  const ran: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");

    await client.tx(async (tx) => {
      await tx.exec(sql);
      await tx.query(`insert into schema_migrations (version) values ($1)`, [file]);
    });

    ran.push(file);
  }

  return ran;
}
