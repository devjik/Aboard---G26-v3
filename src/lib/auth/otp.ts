// In-memory OTP store using a globalThis singleton so it survives Next dev
// re-evaluations. This is intentionally NOT persisted to disk — OTPs are
// short-lived (5 min) and intended for development/pilot use. SMS/Email
// providers should be wired in production.

export type OtpPurpose =
  | "register"
  | "login"
  | "reset_password"
  | "verify_phone";

interface OtpRecord {
  code: string;
  purpose: OtpPurpose;
  attempts: number;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const globalForOtp = globalThis as unknown as {
  __aboardOtpStore?: Map<string, OtpRecord>;
};

if (!globalForOtp.__aboardOtpStore) {
  globalForOtp.__aboardOtpStore = new Map();
}

const store = globalForOtp.__aboardOtpStore!;

function genCode(): string {
  // 6-digit code, leading zeros preserved
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

export interface CreateOtpResult {
  code: string;
  expiresAt: number;
}

export function createOtp(
  key: string,
  purpose: OtpPurpose = "register",
): CreateOtpResult {
  const code = genCode();
  const expiresAt = Date.now() + TTL_MS;
  store.set(key, { code, purpose, attempts: 0, expiresAt });
  return { code, expiresAt };
}

export interface VerifyResult {
  ok: boolean;
  reason?: "expired" | "not_found" | "max_attempts" | "mismatch";
  remainingAttempts?: number;
}

export function verifyOtp(key: string, code: string): VerifyResult {
  const rec = store.get(key);
  if (!rec) return { ok: false, reason: "not_found" };
  if (Date.now() > rec.expiresAt) {
    store.delete(key);
    return { ok: false, reason: "expired" };
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    store.delete(key);
    return { ok: false, reason: "max_attempts" };
  }
  if (rec.code !== code) {
    rec.attempts += 1;
    return {
      ok: false,
      reason: "mismatch",
      remainingAttempts: MAX_ATTEMPTS - rec.attempts,
    };
  }
  store.delete(key);
  return { ok: true };
}

export function peekOtp(key: string): string | null {
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() > rec.expiresAt) return null;
  return rec.code;
}

export function clearOtp(key: string): void {
  store.delete(key);
}
