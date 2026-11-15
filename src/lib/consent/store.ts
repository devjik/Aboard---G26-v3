// In-memory consent code store (globalThis singleton so it survives Next dev re-eval).

interface ConsentRecord {
  code: string;
  guardianId: string;
  guardianName: string;
  studentId: string;
  studentName: string;
  tripId: string;
  ref: string;
  seat: string;
  createdAt: number;
  expiresAt: number;
  verified: boolean;
}

const TTL_MS = 10 * 60 * 1000;

const globalForConsent = globalThis as unknown as {
  __aboardConsentStore?: Map<string, ConsentRecord>;
};
if (!globalForConsent.__aboardConsentStore) {
  globalForConsent.__aboardConsentStore = new Map();
}
const store = globalForConsent.__aboardConsentStore!;

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createConsent(input: {
  guardianId: string;
  guardianName: string;
  studentId: string;
  studentName: string;
  tripId: string;
  ref: string;
  seat: string;
}): { code: string; consentId: string } {
  for (const [k, v] of store) {
    if (v.studentId === input.studentId && v.guardianId === input.guardianId && !v.verified) {
      store.delete(k);
    }
  }
  const code = genCode();
  const consentId = `consent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  store.set(consentId, {
    ...input,
    code,
    consentId,
    createdAt: now,
    expiresAt: now + TTL_MS,
    verified: false,
  });
  return { code, consentId };
}

export function verifyConsentCode(studentId: string, code: string): {
  ok: boolean;
  consent?: ConsentRecord;
  reason?: string;
} {
  for (const [, rec] of store) {
    if (rec.studentId === studentId && rec.code === code) {
      if (Date.now() > rec.expiresAt) {
        return { ok: false, reason: "expired" };
      }
      rec.verified = true;
      return { ok: true, consent: rec };
    }
  }
  return { ok: false, reason: "not_found" };
}

export function hasConsent(guardianId: string, studentId: string): boolean {
  for (const [, rec] of store) {
    if (
      rec.guardianId === guardianId &&
      rec.studentId === studentId &&
      rec.verified &&
      Date.now() <= rec.expiresAt + 60 * 60 * 1000
    ) {
      return true;
    }
  }
  return false;
}
