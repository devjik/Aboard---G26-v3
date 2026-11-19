import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { requireAuth, getCorrelationId } from "@/lib/auth/guard";
import { activeNotificationProvider } from "@/lib/notifications/provider";

export const dynamic = "force-dynamic";

const TripStartedBody = z.object({
  tripId: z.string().min(1),
});

/**
 * POST /api/v1/notifications/trip-started
 *
 * Driver taps "Bus moving" → this notifies all students booked on that trip,
 * their linked parents, and all admins that the bus is now moving.
 *
 * The driver triggers this manually with one tap from DriverMode.
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

  const parsed = TripStartedBody.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }

  const { tripId } = parsed.data;

  // Find all confirmed bookings on this trip
  const bookings = await db.booking.findMany({
    where: { tripId, status: { in: ["CONFIRMED", "HELD"] } },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true } },
          parentLinks: {
            where: { consentStatus: "ACCEPTED" },
            include: { parent: { include: { user: { select: { id: true, name: true } } } } },
          },
        },
      },
      trip: { include: { route: true, driver: { include: { user: { select: { id: true, name: true } } } } } },
    },
  });

  const trip = bookings[0]?.trip;
  const routeLabel = trip ? `${trip.route.originName} → ${trip.route.destName}` : "the trip";
  const driverName = trip?.driver?.user?.name ?? "your driver";
  const time = new Date().toLocaleString("en-GH", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
    hour12: false,
  });

  let studentsNotified = 0;
  let parentsNotified = 0;

  // Notify each student + their parents
  for (const booking of bookings) {
    const student = booking.student;
    if (!student?.user) continue;

    // Notify the student
    await activeNotificationProvider.send({
      userId: student.user.id,
      channel: "IN_APP",
      type: "TRIP_STARTED",
      title: "Bus is moving!",
      body: `Your bus on ${routeLabel} has started moving at ${time}. Driver: ${driverName}. Track it live on your map.`,
      payload: { kind: "BUS_MOVING", tripId, driverName, route: routeLabel, ts: Date.now() },
    });
    studentsNotified++;

    // Notify each linked parent
    for (const link of student.parentLinks) {
      await activeNotificationProvider.send({
        userId: link.parent.user.id,
        channel: "IN_APP",
        type: "TRIP_STARTED",
        title: "The bus is moving",
        body: `${student.user.name}'s bus on ${routeLabel} has started moving at ${time}. Driver: ${driverName}. Track the journey live.`,
        payload: { kind: "BUS_MOVING", tripId, studentName: student.user.name, driverName, route: routeLabel, ts: Date.now() },
      });
      parentsNotified++;
    }
  }

  // Notify all admins
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    await activeNotificationProvider.send({
      userId: admin.id,
      channel: "IN_APP",
      type: "TRIP_STARTED",
      title: "Bus moving — trip started",
      body: `Driver ${driverName} has started the bus on ${routeLabel} at ${time}. ${studentsNotified} student(s) on board. ${parentsNotified} parent(s) notified.`,
      payload: { kind: "BUS_MOVING", tripId, driverName, route: routeLabel, studentsNotified, parentsNotified, ts: Date.now() },
    });
  }

  return okResponse(
    {
      ok: true,
      studentsNotified,
      parentsNotified,
      adminsNotified: admins.length,
      message: "Trip started notifications sent to all students, parents, and admins",
    },
    { correlationId: corr },
  );
}
