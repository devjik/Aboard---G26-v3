import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  type BinaryLike,
} from "node:crypto";

const KEY_LEN = 64;
const N = 16384;
const R = 8;
const P = 1;

function hashHex(input: BinaryLike, salt: Buffer): string {
  const derived = scryptSync(input, salt, KEY_LEN, { N, r: R, p: P });
  return derived.toString("hex");
}

/**
 * Hash a password using scrypt (salt:hash hex format).
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = hashHex(password, salt);
  return `${salt.toString("hex")}:${hash}`;
}

/**
 * Verify a password against a stored salt:hash. Constant-time comparison.
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [saltHex, hashHexStr] = stored.split(":");
  if (!saltHex || !hashHexStr) return false;
  let salt: Buffer;
  let storedHash: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    storedHash = Buffer.from(hashHexStr, "hex");
  } catch {
    return false;
  }
  if (storedHash.length !== KEY_LEN) return false;
  const derived = scryptSync(password, salt, KEY_LEN, { N, r: R, p: P });
  if (derived.length !== storedHash.length) return false;
  return timingSafeEqual(derived, storedHash);
}
