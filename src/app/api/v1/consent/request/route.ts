import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { getCorrelationId } from "@/lib/auth/guard";
import { createConsent } from "@/lib/consent/store";
import { activeNotificationProvider } from "@/lib/notifications/provider";

export const dynamic = "force-dynamic";

const RequestBody = z.object({
  studentName: z.string().min(2, "Student name is required"),
  ref: z.string().min(1, "Booking reference is required"),
  seat: z.string().min(1, "Seat is required"),
  guardianName: z.string().min(2, "Your name is required").optional(),
});

/**
 * POST /api/v1/consent/request
 *
 * Guardian (not signed in — no account needed) submits the student's name +
 * booking reference + seat. The server finds the matching booking, generates
 * a 6-digit consent code, and sends a notification to the student:
 * "Your guardian wants to track your trip. Share this code with them: 482910".
 *
 * The consent code IS the guardian's "auth" — no password required.
 */
export async function POST(req: NextRequest) {
  const corr = getCorrelationId(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(ERRORS.BAD_REQUEST, {
      message: "Invalid JSON body",
      meta: { correlationId: corr },
    }).response;
  }

  const parsed = RequestBody.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }

  const { studentName, ref, seat, guardianName } = parsed.data;

  // Find the booking by matching student name + seat label.
  // The ref is informational (we match on name + seat for the pilot).
  // SQLite doesn't support `mode: "insensitive"`, so we use a case-insensitive
  // contains without the mode flag.
  const booking = await db.booking.findFirst({
    where: {
      seat: { label: seat },
      status: { in: ["CONFIRMED", "HELD"] },
      student: {
        user: {
          name: { contains: studentName },
        },
      },
    },
    include: {
      trip: { include: { route: true } },
      seat: { select: { label: true } },
      student: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  if (!booking) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "No booking found matching that student name and seat. Check the details and try again.",
      meta: { correlationId: corr },
    }).response;
  }

  // Generate the consent code — the guardian doesn't have an account,
  // so we use a session-less identifier. The consent code IS their auth.
  const { code, consentId } = createConsent({
    guardianId: `anon_${Date.now()}`,
    guardianName: guardianName || "Your guardian",
    studentId: booking.studentId,
    studentName: booking.student?.user?.name ?? "Student",
    tripId: booking.tripId,
    ref,
    seat,
  });

  // Notify the student with the consent code
  const routeLabel = `${booking.trip.route.originName} → ${booking.trip.route.destName}`;
  await activeNotificationProvider.send({
    userId: booking.student!.user.id,
    channel: "IN_APP",
    type: "PARENT_LINK_REQUEST",
    title: "Guardian wants to track your trip",
    body: `${guardianName || "Your guardian"} wants to follow your trip on ${routeLabel} (seat ${seat}). Share this code with them personally to give consent: ${code}`,
    payload: {
      kind: "CONSENT_REQUEST",
      consentId,
      code,
      guardianId: `anon_${Date.now()}`,
      route: routeLabel,
      seat,
      ts: Date.now(),
    },
  });

  return okResponse(
    {
      ok: true,
      consentId,
      message: "Consent request sent. The student has been notified with a code — ask them to share it with you.",
      studentName: booking.student?.user?.name,
      route: routeLabel,
      seat,
    },
    { correlationId: corr },
  );
}
