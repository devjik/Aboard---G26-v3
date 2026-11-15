import { NextRequest } from "next/server";
import { TripSearchQuery, TIME_WINDOWS, type TimeWindowKey } from "@/lib/api/contracts/trips";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { db } from "@/lib/db";
import { getCorrelationId } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req: NextRequest) {
  const corr = getCorrelationId(req);
  const url = new URL(req.url);
  const query: Record<string, unknown> = {};
  for (const [k, v] of url.searchParams.entries()) query[k] = v;
  const parsed = TripSearchQuery.safeParse(query);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }
  const {
    from,
    to,
    date,
    maxPrice,
    timeWindow,
    minSeats,
    page,
    pageSize,
  } = parsed.data;

  const where: any = {
    status: { in: ["SCHEDULED", "ACTIVE"] },
    route: { active: true },
  };
  if (from) {
    where.route = {
      ...where.route,
      OR: [
        { originName: { contains: from } },
        { originRegion: { contains: from } },
      ],
    };
  }
  if (to) {
    where.route = {
      ...where.route,
      AND: [
        where.route,
        {
          OR: [
            { destName: { contains: to } },
            { destRegion: { contains: to } },
          ],
        },
      ],
    };
  }
  if (typeof maxPrice === "number") {
    where.basePricePesewa = { lte: maxPrice };
  }
  if (typeof minSeats === "number") {
    where.seatsAvailable = { gte: minSeats };
  }
  if (date) {
    const day = new Date(date);
    if (!isNaN(day.getTime())) {
      const start = startOfDay(day);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.departureAt = { gte: start, lt: end };
    }
  }

  const [total, trips] = await Promise.all([
    db.trip.count({ where }),
    db.trip.findMany({
      where,
      include: {
        route: true,
        bus: { include: { operator: true } },
      },
      orderBy: { departureAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  let filtered = trips;
  if (timeWindow) {
    const window = TIME_WINDOWS[timeWindow as TimeWindowKey];
    filtered = trips.filter((t) => {
      const h = t.departureAt.getHours();
      // night wraps past midnight
      if (window.start > window.end) {
        return h >= window.start || h < window.end - 24;
      }
      return h >= window.start && h < window.end;
    });
  }

  const items = filtered.map((t) => ({
    id: t.id,
    departureAt: t.departureAt.toISOString(),
    arrivalAt: t.arrivalAt?.toISOString() ?? null,
    status: t.status,
    basePricePesewa: t.basePricePesewa,
    seatsAvailable: t.seatsAvailable,
    originName: t.route.originName,
    originRegion: t.route.originRegion,
    destName: t.route.destName,
    destRegion: t.route.destRegion,
    durationMin: t.route.durationMin,
    distanceKm: t.route.distanceKm,
    busPlateNumber: t.bus?.plateNumber ?? null,
    operatorName: t.bus?.operator?.companyName ?? "Unknown",
    operatorId: t.operatorId,
  }));

  return okResponse({ items, total }, { correlationId: corr, page, pageSize });
}
