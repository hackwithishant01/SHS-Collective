import "./env";
import { createInterface } from "node:readline/promises";
import { closeDb, query, databaseLabel, usingEmbeddedDatabase } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";

async function askHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      return await rl.question(question);
    } finally {
      rl.close();
    }
  }

  process.stdout.write(question);
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise<string>((resolve, reject) => {
    let value = "";

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      process.stdout.write("\n");
    };

    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Cancelled."));
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (character >= " ") {
          value += character;
          process.stdout.write("*");
        }
      }
    };

    stdin.on("data", onData);
  });
}

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

async function main() {
  let email = env("ADMIN_EMAIL");
  let name = env("ADMIN_NAME") || "Owner";
  let password = env("ADMIN_PASSWORD");

  if (!email || !password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      if (!email) {
        email = (await rl.question("Admin email: ")).trim();
      }
      if (!name) {
        name = (await rl.question("Display name [Owner]: ")).trim() || "Owner";
      }
    } finally {
      rl.close();
    }
    if (!password) password = await askHidden("Password (12+ characters, hidden): ");
    password = password.trim();
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (password.length < 12) {
    throw new Error("Administrator passwords must be at least 12 characters.");
  }

  const existing = await query<{ id: string; role: string }>(
    `select id, role from admin_users where lower(email) = lower($1) limit 1`,
    [email],
  );
  const passwordHash = await hashPassword(password);
  const reset = env("ADMIN_RESET") === "1";

  if (existing[0] && !reset) {
    console.info(
      `[admin:create] an account for ${email} already exists. Set ADMIN_RESET=1 to replace its password.`,
    );
    return;
  }

  if (existing[0]) {
    await query(
      `update admin_users
       set password_hash = $2, name = $3, role = 'owner', is_active = true
       where id = $1`,
      [existing[0].id, passwordHash, name],
    );
    await query(`delete from admin_sessions where admin_id = $1`, [existing[0].id]);
    console.info(`[admin:create] password reset for ${email}. Other sessions were signed out.`);
  } else {
    const rows = await query<{ id: string }>(
      `insert into admin_users (email, name, password_hash, role, is_active)
       values (lower($1), $2, $3, 'owner', true)
       returning id`,
      [email, name, passwordHash],
    );
    console.info(`[admin:create] owner account created for ${email} (${rows[0]?.id}).`);
  }

  console.info(`[admin:create] ${databaseLabel()}`);
  if (usingEmbeddedDatabase()) {
    console.info("[admin:create] local embedded database — remember to create the production owner separately.");
  }
}

main()
  .catch((error) => {
    console.error("[admin:create] failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
