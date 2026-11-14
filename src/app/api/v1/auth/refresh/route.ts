import { NextRequest } from "next/server";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { buildAuthUser } from "@/lib/auth/current-user";
import {
  getRefreshTokenFromCookies,
  hashRefresh,
  setSessionCookies,
} from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getCorrelationId } from "@/lib/auth/guard";
import { REFRESH_TTL_MS } from "@/lib/config/app";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const corr = getCorrelationId(req);
  const refreshToken = await getRefreshTokenFromCookies();
  if (!refreshToken) {
    return errorResponse(ERRORS.UNAUTHENTICATED, {
      message: "No refresh token",
      meta: { correlationId: corr },
    }).response;
  }
  const refreshHash = hashRefresh(refreshToken);
  const session = await db.session.findUnique({
    where: { refreshHash },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    if (session) {
      await db.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }).catch(() => undefined);
    }
    return errorResponse(ERRORS.UNAUTHENTICATED, {
      message: "Refresh token invalid or expired",
      meta: { correlationId: corr },
    }).response;
  }
  // Rotate: revoke old, issue new.
  await db.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });
  await setSessionCookies({
    userId: session.user.id,
    role: session.user.role,
    status: session.user.status,
  });
  await db.session.updateMany({
    where: { userId: session.user.id, revokedAt: null },
    data: { expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
  });
  const authUser = await buildAuthUser(session.user);
  return okResponse({ user: authUser }, { correlationId: corr });
}
