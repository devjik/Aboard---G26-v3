import { NextRequest } from "next/server";
import { z } from "zod";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { requireAuth, getCorrelationId } from "@/lib/auth/guard";
import { activePaymentProvider } from "@/lib/payments/provider";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const InitiateBody = z.object({
  bookingIntentId: z.string().min(1),
  tripId: z.string().min(1),
  seatLabel: z.string().min(1),
  amountPesewa: z.number().int().positive(),
  payerRole: z.enum(["STUDENT", "PARENT"]).default("STUDENT"),
  idempotencyKey: z.string().min(8),
});

function isDevBypass(): boolean {
  return process.env.NODE_ENV === "development";
}

export async function POST(req: NextRequest) {
  const corr = getCorrelationId(req);

  let userId: string | undefined;
  if (isDevBypass()) {
    const auth = await requireAuth();
    if (auth.ok) userId = auth.ctx.userId;
  } else {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    userId = auth.ctx.userId;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(ERRORS.BAD_REQUEST, {
      message: "Invalid JSON body",
      meta: { correlationId: corr },
    }).response;
  }
  const parsed = InitiateBody.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }
  const { bookingIntentId, tripId, seatLabel, amountPesewa, idempotencyKey } =
    parsed.data;

  // Idempotency check
  const existing = await db.payment.findUnique({
    where: { idempotencyKey },
    select: { id: true, providerRef: true, status: true },
  });
  if (existing) {
    return okResponse(
      {
        paymentId: existing.id,
        providerRef: existing.providerRef ?? "",
        status: existing.status,
      },
      { correlationId: corr },
    );
  }

  // Find the seat/booking tied to the intent
  const seat = await db.seat.findUnique({
    where: { tripId_label: { tripId, label: seatLabel } },
    include: { booking: true },
  });
  if (!seat) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "Seat not found",
      meta: { correlationId: corr },
    }).response;
  }

  // Resolve the student record for this booking.
  // In dev (no auth) we fall back to the first seeded student so the flow works.
  let studentId: string;
  if (userId) {
    const student = await db.student.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      return errorResponse(ERRORS.NOT_FOUND, {
        message: "Student profile not found for this user",
        meta: { correlationId: corr },
      }).response;
    }
    studentId = student.id;
  } else {
    // Dev fallback: use the first available student
    const fallback = await db.student.findFirst({ select: { id: true } });
    if (!fallback) {
      return errorResponse(ERRORS.NOT_FOUND, {
        message: "No student records in the database",
        meta: { correlationId: corr },
      }).response;
    }
    studentId = fallback.id;
  }

  const bookingId =
    seat.booking?.id ??
    (
      await db.booking.create({
        data: {
          studentId,
          tripId,
          seatId: seat.id,
          status: "HELD",
          payerRole: parsed.data.payerRole,
          payerId: userId ?? studentId,
          amountPesewa,
          idempotencyKey: bookingIntentId,
        },
      })
    ).id;

  const result = await activePaymentProvider.initiate({
    bookingId,
    amountPesewa,
    idempotencyKey,
    payerUserId: userId ?? bookingIntentId,
    payerRole: parsed.data.payerRole,
  });
  return okResponse(result, { correlationId: corr });
}
