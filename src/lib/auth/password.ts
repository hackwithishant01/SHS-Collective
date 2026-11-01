import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

function scrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

const PARAMS = { N: 16384, r: 8, p: 1, keyLength: 64 };
const PREFIX = "scrypt";

/**
 * Hashes a password with scrypt. Format:
 * scrypt$N$r$p$<salt base64>$<hash base64>
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) {
    throw new Error("Administrator passwords must be at least 12 characters.");
  }
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, PARAMS.keyLength, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
  });

  return [
    PREFIX,
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== PREFIX) return false;
    const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
    const N = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

    const salt = Buffer.from(saltRaw, "base64");
    const expected = Buffer.from(hashRaw, "base64");
    const actual = await scrypt(password, salt, expected.length, { N, r, p });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Constant-ish work factor for unknown accounts, to reduce timing differences. */
export async function fakeVerify(): Promise<void> {
  await scrypt("not-a-real-password", randomBytes(16), PARAMS.keyLength, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
  });
}
