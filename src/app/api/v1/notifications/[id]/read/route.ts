import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { okResponse, errorResponse } from "@/lib/api/envelope";
import { requireAuth } from "@/lib/auth/guard";
import { getCorrelationId } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = getCorrelationId(req);
  const r = await requireAuth();
  if (!r.ok) return r.response;

  const { id } = await params;

  // Only mark as read if it belongs to the authenticated user
  const notif = await db.notification.findUnique({ where: { id } });
  if (!notif || notif.userId !== r.ctx.userId) {
    return errorResponse("NOT_FOUND", { correlationId });
  }

  const updated = await db.notification.update({
    where: { id },
    data: { status: "READ", readAt: new Date() },
  });

  return okResponse(
    {
      id: updated.id,
      status: updated.status,
      readAt: updated.readAt?.toISOString() ?? null,
    },
    { correlationId }
  );
}
