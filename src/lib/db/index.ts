import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { runMigrations, type DatabaseClient, type DbRow, type Queryable } from "./migrations";

export type { DatabaseClient, DbRow, Queryable } from "./migrations";

type GlobalDbState = {
  client?: Promise<DatabaseClient>;
  mode?: "postgres" | "embedded";
  pool?: Pool;
  pglite?: PGlite;
};

const globalState = globalThis as typeof globalThis & {
  __shsDbState?: GlobalDbState;
};

function state(): GlobalDbState {
  globalState.__shsDbState ??= {};
  return globalState.__shsDbState;
}

export function usingEmbeddedDatabase(): boolean {
  return !process.env.DATABASE_URL;
}

export function databaseLabel(): string {
  return usingEmbeddedDatabase() ? "Embedded development database" : "PostgreSQL";
}

function embeddedDir(): string {
  const configured = process.env.SHS_DB_DIR?.trim() || ".data/pglite";
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

function createPostgresClient(pool: Pool): DatabaseClient {
  const query = async <T extends DbRow = DbRow>(
    text: string,
    params?: readonly unknown[],
  ): Promise<T[]> => {
    const result = await pool.query(text, params ? [...params] : undefined);
    return result.rows as T[];
  };

  return {
    query,
    async exec(sql: string): Promise<void> {
      await pool.query(sql);
    },
    async tx<T>(fn: (client: Queryable) => Promise<T>): Promise<T> {
      const connection = await pool.connect();
      try {
        await connection.query("begin");
        const result = await fn({
          query: async <R extends DbRow = DbRow>(text: string, params?: readonly unknown[]) => {
            const res = await connection.query(text, params ? [...params] : undefined);
            return res.rows as R[];
          },
          exec: async (sql: string) => {
            await connection.query(sql);
          },
        });
        await connection.query("commit");
        return result;
      } catch (error) {
        try {
          await connection.query("rollback");
        } catch {
          // The connection is already broken; releasing it below discards it.
        }
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}

function createEmbeddedClient(pglite: PGlite): DatabaseClient {
  // PGlite has a single connection. Serialise every statement and transaction so
  // one request's transaction can never interleave with another request's query.
  let queue: Promise<unknown> = Promise.resolve();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = queue.then(task, task);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  const rawQuery = async <T extends DbRow = DbRow>(
    text: string,
    params?: readonly unknown[],
  ): Promise<T[]> => {
    const result = await pglite.query<T>(text, params ? [...params] : undefined);
    return result.rows;
  };

  const exec = async (sql: string): Promise<void> => {
    await pglite.exec(sql);
  };

  return {
    query: (text, params) => enqueue(() => rawQuery(text, params)),
    exec: (sql) => enqueue(() => exec(sql)),
    tx<T>(fn: (client: Queryable) => Promise<T>): Promise<T> {
      return enqueue(async () => {
        await pglite.exec("begin");
        try {
          const result = await fn({ query: rawQuery, exec });
          await pglite.exec("commit");
          return result;
        } catch (error) {
          try {
            await pglite.exec("rollback");
          } catch {
            // Ignore rollback failures; the original error is more useful.
          }
          throw error;
        }
      });
    },
  };
}

async function initialise(): Promise<DatabaseClient> {
  const current = state();

  if (process.env.DATABASE_URL) {
    current.mode = "postgres";
    const sslDisabled = process.env.DATABASE_SSL?.toLowerCase() === "false";
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      ...(sslDisabled ? { ssl: false } : {}),
    });
    pool.on("error", (error) => {
      console.error("[db] idle PostgreSQL client error", error.message);
    });
    current.pool = pool;
    current.mode = "postgres";
    return createPostgresClient(pool);
  }

  current.mode = "embedded";
  const dir = embeddedDir();
  await mkdir(dir, { recursive: true });
  const pglite = new PGlite(dir);
  await pglite.waitReady;
  current.pglite = pglite;
  const client = createEmbeddedClient(pglite);

  // Development convenience: keep the embedded database schema current.
  // Production migrations are applied explicitly with `npm run db:migrate`.
  const ran = await runMigrations(client);
  if (ran.length > 0 && process.env.NODE_ENV !== "test") {
    console.info(`[db] applied local migrations: ${ran.join(", ")}`);
  }

  return client;
}

export async function getDb(): Promise<DatabaseClient> {
  const current = state();
  current.client ??= initialise().catch((error) => {
    // Allow a later call to retry after a transient start-up failure.
    current.client = undefined;
    throw error;
  });
  return current.client;
}

/** Test helper: closes the active pool/embedded instance. */
export async function closeDb(): Promise<void> {
  const current = state();
  const client = current.client;
  current.client = undefined;
  if (current.pool) {
    await current.pool.end();
    current.pool = undefined;
  }
  if (current.pglite) {
    await current.pglite.close();
    current.pglite = undefined;
  }
  await client?.catch(() => undefined);
}

/**
 * Under Cache Components, database calls are not automatically treated as
 * request-time work. `connection()` marks the subtree as dynamic, which lets
 * Next.js stream it behind Suspense instead of trying to prerender the query.
 * Scripts run outside the Next.js runtime, so they skip this.
 */
async function markRequestTime(): Promise<void> {
  if (!process.env.NEXT_RUNTIME) return;
  const { connection } = await import("next/server");
  await connection();
}

export async function query<T extends DbRow = DbRow>(
  text: string,
  params?: readonly unknown[],
): Promise<T[]> {
  await markRequestTime();
  return (await getDb()).query<T>(text, params);
}

export async function tx<T>(fn: (client: Queryable) => Promise<T>): Promise<T> {
  await markRequestTime();
  return (await getDb()).tx(fn);
}
