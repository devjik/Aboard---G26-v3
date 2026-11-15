import { NextRequest } from "next/server";
import { z } from "zod";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { requireRole, getCorrelationId } from "@/lib/auth/guard";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const BookingStatusEnum = z.enum([
  "ALL",
  "HELD",
  "CONFIRMED",
  "CANCELLED",
  "REFUNDED",
  "COMPLETED",
]);

const QuerySchema = z.object({
  status: BookingStatusEnum.default("ALL"),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

function isDevBypass(): boolean {
  return process.env.NODE_ENV === "development";
}

export async function GET(req: NextRequest) {
  const corr = getCorrelationId(req);

  if (!isDevBypass()) {
    const auth = await requireRole("ADMIN", "OPERATOR");
    if (!auth.ok) return auth.response;
  }

  const url = new URL(req.url);
  const query: Record<string, unknown> = {};
  for (const [k, v] of url.searchParams.entries()) query[k] = v;
  const parsed = QuerySchema.safeParse(query);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }
  const { status, search, page, pageSize } = parsed.data;

  const where: any = {};
  if (status !== "ALL") where.status = status;
  if (search) {
    where.OR = [
      { id: { contains: search } },
      { student: { user: { name: { contains: search } } } },
      { student: { user: { phone: { contains: search } } } },
      { seat: { label: { contains: search } } },
      { trip: { route: { originName: { contains: search } } } },
      { trip: { route: { destName: { contains: search } } } },
    ];
  }

  const [total, items, statusGroups] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      include: {
        trip: { include: { route: true } },
        student: { include: { user: true } },
        seat: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.booking.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const counts: Record<string, number> = { ALL: total };
  for (const g of statusGroups) counts[g.status] = g._count;

  return okResponse(
    {
      items: items.map((b) => ({
        id: b.id,
        status: b.status,
        amountPesewa: b.amountPesewa,
        createdAt: b.createdAt.toISOString(),
        payerRole: b.payerRole,
        trip: b.trip
          ? {
              id: b.trip.id,
              departureAt: b.trip.departureAt.toISOString(),
              route: {
                originName: b.trip.route.originName,
                destName: b.trip.route.destName,
              },
            }
          : undefined,
        student: b.student
          ? {
              user: {
                name: b.student.user?.name ?? "—",
                phone: b.student.user?.phone ?? "—",
              },
            }
          : undefined,
        seat: b.seat ? { label: b.seat.label } : undefined,
      })),
      counts,
      page,
      pageSize,
      total,
    },
    { correlationId: corr },
  );
}
