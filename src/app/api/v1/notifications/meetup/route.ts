import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { requireAuth, getCorrelationId } from "@/lib/auth/guard";
import { activeNotificationProvider } from "@/lib/notifications/provider";

export const dynamic = "force-dynamic";

const MeetupBody = z.object({
  tripId: z.string().min(1),
  studentId: z.string().min(1),
  distanceMeters: z.number(),
  driverLat: z.number(),
  driverLng: z.number(),
  studentLat: z.number(),
  studentLng: z.number(),
});

/**
 * POST /api/v1/notifications/meetup
 *
 * When the student app detects the student is within the meetup threshold
 * of the driver, this fires. It sends notifications to:
 * 1. The student — "Meetup detected, journey starting"
 * 2. The linked parent — "Your ward has met the bus, journey started"
 * 3. The admin — "Meetup detected: student X and driver on trip Y"
 *
 * Deduped per trip — only fires once.
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

  const parsed = MeetupBody.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }

  const { tripId, studentId, distanceMeters, driverLat, driverLng, studentLat, studentLng } = parsed.data;

  // Dedupe: check if a meetup notification was already sent for this trip
  const existing = await db.notification.findMany({
    where: { type: "TRIP_STARTED" },
    select: { id: true, payload: true },
  });
  const alreadySent = existing.some((n) => {
    const p = n.payload as any;
    return p?.tripId === tripId && p?.kind === "MEETUP";
  });

  if (alreadySent) {
    return okResponse(
      { ok: true, alreadyNotified: true, message: "Meetup notification already sent" },
      { correlationId: corr },
    );
  }

  // Find the student + their linked parents + trip info
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { id: true, name: true } },
      parentLinks: {
        where: { consentStatus: "ACCEPTED" },
        include: { parent: { include: { user: { select: { id: true, name: true } } } } },
      },
    },
  });

  if (!student) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "Student not found",
      meta: { correlationId: corr },
    }).response;
  }

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: { route: true, driver: { include: { user: { select: { id: true, name: true } } } } },
  });

  const routeLabel = trip ? `${trip.route.originName} → ${trip.route.destName}` : "their trip";
  const driverName = trip?.driver?.user?.name ?? "the driver";
  const time = new Date().toLocaleString("en-GH", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
    hour12: false,
  });

  // 1. Notify the student
  await activeNotificationProvider.send({
    userId: student.user.id,
    channel: "IN_APP",
    type: "TRIP_STARTED",
    title: "Meetup detected — journey starting",
    body: `You've met the bus on ${routeLabel}. Distance to driver: ${Math.round(distanceMeters)}m. The journey is about to begin.`,
    payload: { kind: "MEETUP", tripId, distanceMeters, ts: Date.now() },
  });

  // 2. Notify each linked parent
  for (const link of student.parentLinks) {
    await activeNotificationProvider.send({
      userId: link.parent.user.id,
      channel: "IN_APP",
      type: "TRIP_STARTED",
      title: "Your ward has met the bus",
      body: `${student.user.name} has met the bus with ${driverName} on ${routeLabel} at ${time}. The journey has started. You can track the trip live.`,
      payload: { kind: "MEETUP", tripId, studentName: student.user.name, distanceMeters, ts: Date.now() },
    });
  }

  // 3. Notify all admins
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    await activeNotificationProvider.send({
      userId: admin.id,
      channel: "IN_APP",
      type: "TRIP_STARTED",
      title: "Meetup detected — journey started",
      body: `Student ${student.user.name} and driver ${driverName} have met on ${routeLabel} at ${time}. Distance: ${Math.round(distanceMeters)}m. The journey has started.`,
      payload: {
        kind: "MEETUP",
        tripId,
        studentName: student.user.name,
        driverName,
        route: routeLabel,
        distanceMeters,
        driverPos: { lat: driverLat, lng: driverLng },
        studentPos: { lat: studentLat, lng: studentLng },
        ts: Date.now(),
      },
    });
  }

  return okResponse(
    {
      ok: true,
      studentsNotified: 1,
      parentsNotified: student.parentLinks.length,
      adminsNotified: admins.length,
      message: "Meetup notifications sent to student, parents, and admins",
    },
    { correlationId: corr },
  );
}
