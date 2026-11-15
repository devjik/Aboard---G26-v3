import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { requireAuth, getCorrelationId } from "@/lib/auth/guard";
import { activeNotificationProvider } from "@/lib/notifications/provider";

export const dynamic = "force-dynamic";

const BoardingBody = z.object({
  tripId: z.string().min(1),
  studentId: z.string().min(1),
  distanceMeters: z.number(),
  driverLat: z.number(),
  driverLng: z.number(),
  studentLat: z.number(),
  studentLng: z.number(),
});

/**
 * POST /api/v1/notifications/boarding
 *
 * Called by the student app when it detects the student is within the
 * boarding threshold of the driver. Creates a real BOARDING_VERIFIED
 * notification for the linked parent ("Your ward has boarded the bus")
 * and a confirmation notification for the student.
 *
 * Deduped: only fires once per (tripId, studentId) — a flag in the
 * Notification payload prevents repeat alerts.
 */
export async function POST(req: NextRequest) {
  const corr = getCorrelationId(req);
  const r = await requireAuth();
  if (!r.ok) return r.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(ERRORS.BAD_REQUEST, {
      message: "Invalid JSON body",
      meta: { correlationId: corr },
    }).response;
  }

  const parsed = BoardingBody.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }

  const { tripId, studentId, distanceMeters, driverLat, driverLng, studentLat, studentLng } = parsed.data;

  // 1. Verify the student exists + find their linked + accepted parent
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { id: true, name: true } },
      parentLinks: { where: { consentStatus: "ACCEPTED" }, include: { parent: { include: { user: { select: { id: true, name: true } } } } } },
    },
  });
  if (!student) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "Student not found",
      meta: { correlationId: corr },
    }).response;
  }

  // 2. Check we haven't already sent a boarding notification for this trip+student
  // (prevents duplicate alerts on every GPS tick)
  // SQLite doesn't support JSON path filters, so fetch + filter in JS.
  const existingNotifs = await db.notification.findMany({
    where: { type: "BOARDING_VERIFIED" },
    select: { id: true, payload: true },
  });
  const alreadySent = existingNotifs.some((n) => {
    const p = n.payload as any;
    return p?.tripId === tripId;
  });
  if (alreadySent) {
    return okResponse(
      { ok: true, alreadyNotified: true, message: "Boarding notification already sent" },
      { correlationId: corr },
    );
  }

  // 3. Get trip details for the notification body
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: { route: true },
  });

  const routeLabel = trip ? `${trip.route.originName} → ${trip.route.destName}` : "your trip";
  const time = new Date().toLocaleString("en-GH", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
    hour12: false,
  });

  // 4. Notify each linked + accepted parent
  const parentNotifs: string[] = [];
  for (const link of student.parentLinks) {
    const parentId = link.parent.user.id;
    await activeNotificationProvider.send({
      userId: parentId,
      channel: "IN_APP",
      type: "BOARDING_VERIFIED",
      title: "Your ward has boarded the bus",
      body: `${student.user.name} boarded the bus on ${routeLabel} at ${time}. Distance to driver: ${Math.round(distanceMeters)}m. You can track the trip live.`,
      payload: {
        kind: "BOARDING",
        tripId,
        studentId,
        studentName: student.user.name,
        distanceMeters,
        driverPos: { lat: driverLat, lng: driverLng },
        studentPos: { lat: studentLat, lng: studentLng },
        ts: Date.now(),
      },
    });
    parentNotifs.push(parentId);
  }

  // 5. Notify the student too (confirmation)
  await activeNotificationProvider.send({
    userId: student.user.id,
    channel: "IN_APP",
    type: "BOARDING_VERIFIED",
    title: "Boarding verified",
    body: `You're aboard the bus on ${routeLabel} at ${time}. Your parent${parentNotifs.length > 1 ? "s have" : " has"} been notified you're safe.`,
    payload: {
      kind: "BOARDING_CONFIRMATION",
      tripId,
      distanceMeters,
      parentsNotified: parentNotifs.length,
      ts: Date.now(),
    },
  });

  return okResponse(
    {
      ok: true,
      parentsNotified: parentNotifs.length,
      studentNotified: true,
      distanceMeters,
    },
    { correlationId: corr },
  );
}
