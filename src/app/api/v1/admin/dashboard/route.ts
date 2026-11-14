import { NextRequest } from "next/server";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { requireRole, getCorrelationId } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { formatGHSPlain } from "@/lib/config/app";

export const dynamic = "force-dynamic";

function isDevBypass(): boolean {
  return process.env.NODE_ENV === "development";
}

export async function GET(req: NextRequest) {
  const corr = getCorrelationId(req);

  if (!isDevBypass()) {
    const auth = await requireRole("ADMIN", "OPERATOR");
    if (!auth.ok) return auth.response;
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalBookings,
    revenueAgg,
    activeRoutes,
    confirmedToday,
    recentBookingsRaw,
    chartDaysRaw,
    upcomingTripsRaw,
  ] = await Promise.all([
    db.booking.count({ where: { status: { not: "CANCELLED" } } }),
    db.payment.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amountPesewa: true },
    }),
    db.route.count({ where: { active: true } }),
    db.booking.count({
      where: {
        status: "CONFIRMED",
        createdAt: { gte: new Date(now.setHours(0, 0, 0, 0)) },
      },
    }),
    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        trip: { include: { route: true } },
        student: { include: { user: true } },
        seat: true,
      },
    }),
    db.booking.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, amountPesewa: true },
    }),
    db.trip.findMany({
      where: {
        status: { in: ["SCHEDULED", "ACTIVE"] },
        departureAt: { gte: now },
      },
      include: { route: true, bus: true },
      orderBy: { departureAt: "asc" },
      take: 10,
    }),
  ]);

  // Build 7-day chart data
  const chartData: Array<{ label: string; bookings: number; revenue: number }> =
    [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(sevenDaysAgo);
    day.setDate(day.getDate() + (6 - i));
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const dayBookings = chartDaysRaw.filter(
      (b) => b.createdAt >= day && b.createdAt < next,
    );
    chartData.push({
      label: day.toLocaleDateString("en-GH", {
        weekday: "short",
      }),
      bookings: dayBookings.length,
      revenue: dayBookings.reduce((s, b) => s + b.amountPesewa, 0),
    });
  }

  const recentBookings = recentBookingsRaw.map((b) => ({
    id: b.id,
    amountPesewa: b.amountPesewa,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    studentName: b.student?.user?.name ?? "—",
    seatLabel: b.seat?.label ?? "—",
    routeLabel: `${b.trip?.route?.originName ?? "?"} → ${b.trip?.route?.destName ?? "?"}`,
    departureAt: b.trip?.departureAt?.toISOString() ?? null,
  }));

  const routesFill = await Promise.all(
    upcomingTripsRaw.map(async (t) => {
      const booked = await db.seat.count({
        where: { tripId: t.id, status: "BOOKED" },
      });
      const capacity = t.bus?.capacity ?? 32;
      const fillPct = capacity > 0 ? Math.round((booked / capacity) * 100) : 0;
      return {
        tripId: t.id,
        routeLabel: `${t.route.originName} → ${t.route.destName}`,
        departureAt: t.departureAt.toISOString(),
        capacity,
        booked,
        fillPct,
      };
    }),
  );

  return okResponse(
    {
      totalBookings,
      totalRevenue: formatGHSPlain(revenueAgg._sum.amountPesewa ?? 0),
      activeRoutes,
      confirmedToday,
      chartData,
      recentBookings,
      routesFill,
    },
    { correlationId: corr },
  );
}
