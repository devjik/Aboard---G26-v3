import { NextRequest } from "next/server";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { requireRole, getCorrelationId } from "@/lib/auth/guard";
import { db } from "@/lib/db";

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

  const routes = await db.route.findMany({
    where: { active: true },
    include: {
      stops: { orderBy: { sequence: "asc" } },
      trips: {
        where: { status: { in: ["SCHEDULED", "ACTIVE"] } },
        select: { id: true },
      },
      operator: { select: { companyName: true } },
    },
    orderBy: { originName: "asc" },
  });

  return okResponse(
    {
      items: routes.map((r) => ({
        id: r.id,
        originName: r.originName,
        originRegion: r.originRegion,
        destName: r.destName,
        destRegion: r.destRegion,
        distanceKm: r.distanceKm,
        durationMin: r.durationMin,
        active: r.active,
        operatorName: r.operator?.companyName ?? "Unknown",
        stops: r.stops.map((s) => ({
          name: s.name,
          region: s.region,
          type: s.type,
        })),
        tripCount: r.trips.length,
      })),
    },
    { correlationId: corr },
  );
}
