import { NextRequest } from "next/server";
import { okResponse } from "@/lib/api/envelope";
import { clearSessionCookies, getRefreshTokenFromCookies, hashRefresh } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getCorrelationId } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const corr = getCorrelationId(req);
  const refreshToken = await getRefreshTokenFromCookies();
  if (refreshToken) {
    const refreshHash = hashRefresh(refreshToken);
    try {
      await db.session.update({
        where: { refreshHash },
        data: { revokedAt: new Date() },
      });
    } catch {
      // ignore
    }
  }
  await clearSessionCookies();
  return okResponse({ ok: true }, { correlationId: corr });
}
