import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { getCorrelationId } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/tickets
 *
 * Lists all tickets for admin oversight.
 * Supports filtering by status (VALID, USED, CANCELLED, EXPIRED).
 * Dev bypass: no auth required in development.
 */
export async function GET(req: NextRequest) {
  const corr = getCorrelationId(req);

  if (process.env.NODE_ENV !== "development") {
    // In production, require ADMIN role
    const { requireRole } = await import("@/lib/auth/guard");
    const r = await requireRole("ADMIN", "OPERATOR");
    if (!r.ok) return r.response;
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "all";

  const where: any = {};
  if (status !== "all") where.status = status.toUpperCase();

  const tickets = await db.ticket.findMany({
    where,
    include: {
      booking: {
        include: {
          trip: { include: { route: true } },
          seat: { select: { label: true } },
          student: { include: { user: { select: { name: true, phone: true } } } },
          payments: { select: { id: true, status: true, amountPesewa: true } },
        },
      },
    },
    orderBy: { issuedAt: "desc" },
    take: 50,
  });

  const items = tickets.map((t) => ({
    id: t.id,
    status: t.status,
    version: t.version,
    issuedAt: t.issuedAt.toISOString(),
    usedAt: t.usedAt?.toISOString() ?? null,
    ref: `AB-${new Date(t.issuedAt).getFullYear()}-${t.id.slice(-6).toUpperCase()}`,
    route: `${t.booking.trip.route.originName} → ${t.booking.trip.route.destName}`,
    seat: t.booking.seat?.label ?? "—",
    studentName: t.booking.student?.user?.name ?? "—",
    studentPhone: t.booking.student?.user?.phone ?? "—",
    departureAt: t.booking.trip.departureAt.toISOString(),
    paymentStatus: t.booking.payments[0]?.status ?? "UNKNOWN",
    amountPesewa: t.booking.payments[0]?.amountPesewa ?? 0,
  }));

  // counts by status
  const all = await db.ticket.groupBy({ by: ["status"], _count: true });
  const counts: Record<string, number> = {};
  for (const g of all) counts[g.status] = g._count;
  counts.all = Object.values(counts).reduce((a, b) => a + b, 0);

  return okResponse({ items, counts }, { correlationId: corr });
}
