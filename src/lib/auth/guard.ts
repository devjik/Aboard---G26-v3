import { cookies } from "next/headers";
import { verifyAccessToken, getAccessTokenFromCookies } from "./session";
import type { NextRequest } from "next/server";
import { ERRORS, errorResponse } from "@/lib/api/envelope";

export type Role = "STUDENT" | "DRIVER" | "OPERATOR" | "PARENT" | "ADMIN";

export interface AuthContext {
  userId: string;
  role: Role;
  status: string;
}

export interface AuthSuccess {
  ok: true;
  ctx: AuthContext;
}

export interface AuthFailure {
  ok: false;
  response: Response;
}

export function getCorrelationId(req?: NextRequest | Request): string {
  const fromHeader = req?.headers?.get("x-correlation-id");
  if (fromHeader) return fromHeader;
  return `corr_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
  const token = await getAccessTokenFromCookies();
  if (!token) {
    return {
      ok: false,
      response: errorResponse(ERRORS.UNAUTHENTICATED).response,
    };
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    return {
      ok: false,
      response: errorResponse(ERRORS.UNAUTHENTICATED).response,
    };
  }
  if (payload.status === "SUSPENDED") {
    return {
      ok: false,
      response: errorResponse(ERRORS.FORBIDDEN, {
        message: "Account suspended",
      }).response,
    };
  }
  return {
    ok: true,
    ctx: {
      userId: payload.sub,
      role: payload.role as Role,
      status: payload.status,
    },
  };
}

export async function requireRole(
  ...roles: Role[]
): Promise<AuthSuccess | AuthFailure> {
  const result = await requireAuth();
  if (!result.ok) return result;
  if (!roles.includes(result.ctx.role)) {
    return {
      ok: false,
      response: errorResponse(ERRORS.FORBIDDEN, {
        message: "Insufficient role",
      }).response,
    };
  }
  return result;
}

// Silence unused import in some builds
export const _cookies = cookies;
