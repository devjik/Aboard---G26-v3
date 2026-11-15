import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_TTL_MS, REFRESH_TTL_MS } from "@/lib/config/app";
import { db } from "@/lib/db";

const SECRET =
  process.env.ABOARD_SESSION_SECRET ||
  "aboard-dev-fallback-secret-change-me-32chars";
const ACCESS_TTL_SEC = Math.floor(SESSION_TTL_MS / 1000);
const REFRESH_TTL_SEC = Math.floor(REFRESH_TTL_MS / 1000);

const ACCESS_COOKIE = "aboard_access";
const REFRESH_COOKIE = "aboard_refresh";

export interface AccessTokenPayload {
  sub: string;
  role: string;
  status: string;
  iat: number;
  exp: number;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(
    input.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64",
  );
}

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex");
}

/**
 * Sign a JWT-style access token (HMAC-SHA256).
 */
export function signAccessToken(payload: {
  sub: string;
  role: string;
  status: string;
}): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body: AccessTokenPayload = {
    sub: payload.sub,
    role: payload.role,
    status: payload.status,
    iat: now,
    exp: now + ACCESS_TTL_SEC,
  };
  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(body));
  const data = `${headerB64}.${payloadB64}`;
  const signature = sign(data);
  return `${data}.${signature}`;
}

/**
 * Verify a JWT-style access token. Returns the payload or null.
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signature] = parts;
  const expected = sign(`${headerB64}.${payloadB64}`);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  let payload: AccessTokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) return null;
  return payload;
}

/**
 * Generate a refresh token (opaque). Returns [token, hash].
 */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  const hash = hashRefresh(token);
  return { token, hash };
}

export function hashRefresh(token: string): string {
  return createHmac("sha256", SECRET).update(token).digest("hex");
}

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

interface SetSessionOptions {
  userId: string;
  role: string;
  status: string;
  userAgent?: string;
  ip?: string;
  persistRefresh?: boolean;
}

export interface SetSessionResult {
  refreshToken: string;
  refreshHash: string;
  sessionId?: string;
}

/**
 * Set access + refresh cookies. If persistRefresh is true (default), a
 * Session row is created so the refresh token can be rotated/revoked.
 */
export async function setSessionCookies(
  opts: SetSessionOptions,
): Promise<SetSessionResult> {
  const access = signAccessToken({
    sub: opts.userId,
    role: opts.role,
    status: opts.status,
  });
  const refresh = generateRefreshToken();
  const c = await cookies();
  c.set(ACCESS_COOKIE, access, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    path: "/",
    maxAge: ACCESS_TTL_SEC,
  });
  c.set(REFRESH_COOKIE, refresh.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    path: "/",
    maxAge: REFRESH_TTL_SEC,
  });
  let session: { id: string } | null = null;
  if (opts.persistRefresh !== false) {
    try {
      session = await db.session.create({
        data: {
          userId: opts.userId,
          refreshHash: refresh.hash,
          userAgent: opts.userAgent ?? null,
          ip: opts.ip ?? null,
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        },
        select: { id: true },
      });
    } catch {
      // ignore DB persistence failure in dev when DB unavailable
    }
  }
  return {
    refreshToken: refresh.token,
    refreshHash: refresh.hash,
    sessionId: session?.id,
  };
}

export async function clearSessionCookies(): Promise<void> {
  const c = await cookies();
  c.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  c.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function getAccessTokenFromCookies(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(ACCESS_COOKIE)?.value;
}

export async function getRefreshTokenFromCookies(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(REFRESH_COOKIE)?.value;
}

export {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ACCESS_TTL_SEC,
  REFRESH_TTL_SEC,
};
