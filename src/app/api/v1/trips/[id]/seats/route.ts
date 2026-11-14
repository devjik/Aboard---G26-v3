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
    select: {
      id: true,
      basePricePesewa: true,
      bus: { select: { seatLayout: true } },
      seats: {
        select: {
          id: true,
          label: true,
          row: true,
          col: true,
          status: true,
          pricePesewa: true,
        },
        orderBy: [{ row: "asc" }, { col: "asc" }],
      },
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
      tripId: trip.id,
      basePricePesewa: trip.basePricePesewa,
      layout: trip.bus?.seatLayout
        ? {
            name: trip.bus.seatLayout.name,
            rows: trip.bus.seatLayout.rows,
            cols: trip.bus.seatLayout.cols,
          }
        : null,
      seats: trip.seats,
    },
    { correlationId: corr },
  );
}
