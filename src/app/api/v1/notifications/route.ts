import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { okResponse, errorResponse } from "@/lib/api/envelope";
import { requireAuth } from "@/lib/auth/guard";
import { getCorrelationId } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

const Query = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  const correlationId = getCorrelationId(req);
  const r = await requireAuth();
  if (!r.ok) return r.response;

  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = Query.safeParse(params);
  if (!parsed.success) {
    return errorResponse("VALIDATION", { details: parsed.error.flatten(), correlationId });
  }
  const { page, pageSize } = parsed.data;
  const userId = r.ctx.userId;

  const [total, unread, items] = await Promise.all([
    db.notification.count({ where: { userId } }),
    db.notification.count({ where: { userId, status: { not: "READ" } } }),
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return okResponse(
    {
      items: items.map((n) => ({
        id: n.id,
        channel: n.channel,
        type: n.type,
        title: n.title,
        body: n.body,
        payload: n.payload,
        status: n.status,
        createdAt: n.createdAt.toISOString(),
        readAt: n.readAt?.toISOString() ?? null,
      })),
      unreadCount: unread,
      total,
      page,
      pageSize,
    },
    { correlationId }
  );
}
