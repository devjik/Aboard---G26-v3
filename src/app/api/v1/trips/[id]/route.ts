import { NextRequest } from "next/server";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { db } from "@/lib/db";
import { getCorrelationId } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const corr = getCorrelationId(req);
  const { id } = await ctx.params;
  const trip = await db.trip.findUnique({
    where: { id },
    include: {
      route: { include: { stops: { orderBy: { sequence: "asc" } } } },
      bus: { include: { operator: true, seatLayout: true } },
      driver: { include: { user: true } },
    },
  });
  if (!trip) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "Trip not found",
      meta: { correlationId: corr },
    }).response;
  }
  return okResponse(
    {
      id: trip.id,
      routeId: trip.routeId,
      departureAt: trip.departureAt.toISOString(),
      arrivalAt: trip.arrivalAt?.toISOString() ?? null,
      status: trip.status,
      basePricePesewa: trip.basePricePesewa,
      seatsAvailable: trip.seatsAvailable,
      originName: trip.route.originName,
      originRegion: trip.route.originRegion,
      destName: trip.route.destName,
      destRegion: trip.route.destRegion,
      durationMin: trip.route.durationMin,
      distanceKm: trip.route.distanceKm,
      busPlateNumber: trip.bus?.plateNumber ?? null,
      busCapacity: trip.bus?.capacity ?? 0,
      operatorName: trip.bus?.operator?.companyName ?? "Unknown",
      operatorId: trip.operatorId,
      driverName: trip.driver?.user?.name ?? null,
      driverRating:
        trip.driver && trip.driver.ratingCount > 0
          ? trip.driver.ratingAvg
          : null,
      stops: trip.route.stops.map((s) => ({
        id: s.id,
        sequence: s.sequence,
        name: s.name,
        region: s.region,
        lat: s.lat,
        lng: s.lng,
        expectedOffsetMin: s.expectedOffsetMin,
        type: s.type,
      })),
    },
    { correlationId: corr },
  );
}
