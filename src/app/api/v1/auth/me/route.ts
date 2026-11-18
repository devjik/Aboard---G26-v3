import { NextRequest } from "next/server";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { requireAuth, getCorrelationId } from "@/lib/auth/guard";
import { buildAuthUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const corr = getCorrelationId(req);
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = await db.user.findUnique({ where: { id: auth.ctx.userId } });
  if (!user) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "User not found",
      meta: { correlationId: corr },
    }).response;
  }

  // Update lastSeenAt on the user's active session(s) so the admin
  // "Live Users" view shows who's actually online right now.
  // This runs on every page load (via the session restore useEffect).
  await db.session.updateMany({
    where: {
      userId: user.id,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { lastSeenAt: new Date() },
  }).catch(() => undefined); // non-critical — don't fail the request

  const authUser = await buildAuthUser(user);
  return okResponse({ user: authUser }, { correlationId: corr });
}
