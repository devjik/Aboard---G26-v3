import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { requireAuth, getCorrelationId } from "@/lib/auth/guard";
import { verifyConsentCode } from "@/lib/consent/store";
import { activeNotificationProvider } from "@/lib/notifications/provider";

export const dynamic = "force-dynamic";

const VerifyBody = z.object({
  studentName: z.string().min(2),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

/**
 * POST /api/v1/consent/verify
 *
 * Guardian enters the 6-digit consent code that the student shared with
 * them personally. If correct, consent is granted and the guardian can
 * now see the student's location + the bus on the map.
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

  const parsed = VerifyBody.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }

  const { studentName, code } = parsed.data;

  // Find the student by name
  const student = await db.student.findFirst({
    where: { user: { name: { contains: studentName } } },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!student) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "Student not found",
      meta: { correlationId: corr },
    }).response;
  }

  const result = verifyConsentCode(student.id, code);
  if (!result.ok) {
    return errorResponse(ERRORS.VALIDATION, {
      message: result.reason === "expired"
        ? "The consent code has expired. Ask the student for a new one."
        : "Invalid consent code. Check with the student and try again.",
      meta: { correlationId: corr },
    }).response;
  }

  const consent = result.consent!;

  // Notify the student that consent was granted
  await activeNotificationProvider.send({
    userId: student.user.id,
    channel: "IN_APP",
    type: "BOOKING_CONFIRMED",
    title: "Guardian tracking enabled",
    body: `Your guardian has entered the consent code. They can now see your location and the bus on their map for this trip.`,
    payload: {
      kind: "CONSENT_GRANTED",
      guardianId: r.ctx.userId,
      tripId: consent.tripId,
      ts: Date.now(),
    },
  });

  // Return the tripId so the guardian's map can subscribe to it
  const trip = await db.trip.findUnique({
    where: { id: consent.tripId },
    include: { route: true },
  });

  return okResponse(
    {
      ok: true,
      granted: true,
      tripId: consent.tripId,
      route: trip ? `${trip.route.originName} → ${trip.route.destName}` : "",
      studentName: student.user.name,
      message: "Consent verified! You can now see the student's location and the bus.",
    },
    { correlationId: corr },
  );
}
