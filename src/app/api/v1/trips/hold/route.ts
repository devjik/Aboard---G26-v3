import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { getCorrelationId } from "@/lib/auth/guard";
import { SEAT_HOLD_TTL_MS } from "@/lib/config/app";

export const dynamic = "force-dynamic";

const HoldBody = z.object({
  tripId: z.string().min(1),
  seatLabel: z.string().min(1),
});

/**
 * POST /api/v1/trips/hold
 * Body: { tripId, seatLabel }
 *
 * Atomically holds a seat for 5 minutes while payment is in progress.
 * Uses a DB transaction + the SeatLock unique constraint on [seatId, tripId]
 * to guarantee two students can never hold the same seat simultaneously.
 *
 * On conflict (seat already held/booked) returns SEAT_UNAVAILABLE (409).
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

  const parsed = HoldBody.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }

  const { tripId, seatLabel } = parsed.data;

  // 1. Verify trip exists + is bookable
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { id: true, status: true, basePricePesewa: true, departureAt: true },
  });
  if (!trip) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "Trip not found",
      meta: { correlationId: corr },
    }).response;
  }
  if (trip.status !== "SCHEDULED") {
    return errorResponse(ERRORS.CONFLICT, {
      message: `Trip is ${trip.status.toLowerCase()} — cannot book`,
      meta: { correlationId: corr },
    }).response;
  }

  // 2. Find the seat
  const seat = await db.seat.findUnique({
    where: { tripId_label: { tripId, label: seatLabel } },
  });
  if (!seat) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: `Seat ${seatLabel} not found on this trip`,
      meta: { correlationId: corr },
    }).response;
  }

  // 3. If seat is already BOOKED, reject
  if (seat.status === "BOOKED") {
    return errorResponse(ERRORS.SEAT_UNAVAILABLE, {
      message: `Seat ${seatLabel} is already booked`,
      meta: { correlationId: corr },
    }).response;
  }

  // 4. Check for an existing active lock on this seat
  const now = new Date();
  const existingLock = await db.seatLock.findUnique({
    where: { seatId_tripId: { seatId: seat.id, tripId } },
  });

  if (existingLock) {
    // If the lock is still active (not expired, not released) → seat unavailable
    if (existingLock.releasedAt === null && existingLock.expiresAt > now) {
      return errorResponse(ERRORS.SEAT_UNAVAILABLE, {
        message: `Seat ${seatLabel} is currently held by another passenger. Try another seat.`,
        meta: { correlationId: corr },
      }).response;
    }
    // Lock expired or was released — clean it up so we can create a fresh one
    await db.seatLock.delete({ where: { id: existingLock.id } });
  }

  // 5. Create the lock atomically. The unique constraint [seatId, tripId]
  //    is the concurrency guard: if two requests race here, only one wins.
  const expiresAt = new Date(now.getTime() + SEAT_HOLD_TTL_MS);
  const bookingIntentId = `intent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    // Transaction: create lock + mark seat HELD
    const [lock] = await db.$transaction([
      db.seatLock.create({
        data: {
          tripId,
          seatId: seat.id,
          seatLabel,
          holderUserId: "anon", // TODO: replace with authenticated user id
          bookingIntentId,
          expiresAt,
        },
      }),
      db.seat.update({
        where: { id: seat.id },
        data: { status: "HELD" },
      }),
    ]);

    return okResponse(
      {
        lockId: lock.id,
        seatLabel,
        expiresAt: expiresAt.toISOString(),
        pricePesewa: seat.pricePesewa,
      },
      { correlationId: corr },
    );
  } catch (err: any) {
    // Unique constraint violation = another request won the race
    if (err?.code === "P2002") {
      return errorResponse(ERRORS.SEAT_UNAVAILABLE, {
        message: `Seat ${seatLabel} was just taken. Try another seat.`,
        meta: { correlationId: corr },
      }).response;
    }
    throw err;
  }
}
