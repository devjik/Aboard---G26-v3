import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { getCorrelationId } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/trips/hold/:lockId/release
 * Releases a held seat so it returns to the available pool.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lockId: string }> },
) {
  const corr = getCorrelationId(req);
  const { lockId } = await params;

  const lock = await db.seatLock.findUnique({ where: { id: lockId } });
  if (!lock) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "Lock not found",
      meta: { correlationId: corr },
    }).response;
  }

  await db.$transaction([
    db.seatLock.update({
      where: { id: lockId },
      data: { releasedAt: new Date() },
    }),
    db.seat.update({
      where: { id: lock.seatId },
      data: { status: "AVAILABLE" },
    }),
  ]);

  return okResponse({ ok: true }, { correlationId: corr });
}
