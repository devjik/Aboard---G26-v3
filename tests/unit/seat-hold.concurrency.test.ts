import { describe, it, expect, beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/**
 * Seat hold concurrency test.
 *
 * The brief mandates: "Two students must never get the same seat."
 * This test fires N simultaneous hold attempts on the same seat and
 * proves exactly one succeeds via the @@unique([seatId, tripId])
 * constraint on SeatLock.
 *
 * The local SQLite stack enforces this at the Prisma transaction level
 * (see src/app/api/v1/trips/hold/route.ts). For production with
 * Postgres, the same guarantee holds via SELECT ... FOR UPDATE in a
 * hold_seat() RPC function.
 */
describe("Seat hold concurrency", () => {
  let tripId: string;
  let seatId: string;
  let seatLabel: string;

  beforeAll(async () => {
    // Find a scheduled trip with at least one available seat
    const trip = await db.trip.findFirst({
      where: { status: "SCHEDULED" },
      include: { seats: { where: { status: "AVAILABLE" }, take: 1 } },
    });
    if (!trip || trip.seats.length === 0) {
      throw new Error("No scheduled trip with available seats — run `bun run db:seed` first");
    }
    tripId = trip.id;
    seatId = trip.seats[0].id;
    seatLabel = trip.seats[0].label;

    // Clean any existing lock on this seat from prior test runs
    await db.seatLock.deleteMany({ where: { seatId } });
    await db.seat.update({ where: { id: seatId }, data: { status: "AVAILABLE" } });
  });

  it("exactly one of N concurrent holds succeeds (N=20)", async () => {
    const N = 20;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Fire N concurrent hold attempts. Each mirrors the route's logic:
    // create a SeatLock row + flip seat status to HELD, in a transaction.
    const attempts = Array.from({ length: N }, (_, i) =>
      db
        .$transaction([
          db.seatLock.create({
            data: {
              tripId,
              seatId,
              seatLabel,
              holderUserId: `test-student-${i}`,
              bookingIntentId: `intent_concurrent_${i}`,
              expiresAt,
            },
          }),
          db.seat.update({
            where: { id: seatId },
            data: { status: "HELD" },
          }),
        ])
        .then(() => ({ ok: true as const, i }))
        .catch((err: any) => ({
          ok: false as const,
          i,
          code: err?.code ?? "UNKNOWN",
        })),
    );

    const results = await Promise.all(attempts);
    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);

    // The brief's invariant: exactly one succeeds
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(N - 1);

    // All failures must be unique constraint violations (P2002)
    for (const f of failures) {
      expect(f.code).toBe("P2002");
    }
  });

  it("after a successful hold, the seat is marked HELD", async () => {
    const seat = await db.seat.findUnique({ where: { id: seatId } });
    expect(seat?.status).toBe("HELD");
  });

  it("a second hold on the same seat after release succeeds", async () => {
    // Release the existing lock
    await db.seatLock.deleteMany({ where: { seatId } });
    await db.seat.update({ where: { id: seatId }, data: { status: "AVAILABLE" } });

    // Now a fresh hold should succeed
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const result = await db
      .$transaction([
        db.seatLock.create({
          data: {
            tripId,
            seatId,
            seatLabel,
            holderUserId: "test-student-second",
            bookingIntentId: "intent_second",
            expiresAt,
          },
        }),
        db.seat.update({
          where: { id: seatId },
          data: { status: "HELD" },
        }),
      ])
      .then(() => true)
      .catch(() => false);

    expect(result).toBe(true);

    // Cleanup
    await db.seatLock.deleteMany({ where: { seatId } });
    await db.seat.update({ where: { id: seatId }, data: { status: "AVAILABLE" } });
  });

  it("expired holds don't block a fresh hold (cleanup path)", async () => {
    // Create an expired lock
    const pastExpiry = new Date(Date.now() - 1000);
    await db.seatLock.create({
      data: {
        tripId,
        seatId,
        seatLabel,
        holderUserId: "test-student-expired",
        bookingIntentId: "intent_expired",
        expiresAt: pastExpiry,
      },
    });
    await db.seat.update({ where: { id: seatId }, data: { status: "HELD" } });

    // A fresh hold should succeed because the route cleans up expired locks
    // before creating a new one. Here we simulate the cleanup path.
    const existing = await db.seatLock.findUnique({
      where: { seatId_tripId: { seatId, tripId } },
    });
    if (existing && existing.expiresAt < new Date()) {
      await db.seatLock.delete({ where: { id: existing.id } });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const result = await db
      .$transaction([
        db.seatLock.create({
          data: {
            tripId,
            seatId,
            seatLabel,
            holderUserId: "test-student-fresh",
            bookingIntentId: "intent_fresh",
            expiresAt,
          },
        }),
        db.seat.update({
          where: { id: seatId },
          data: { status: "HELD" },
        }),
      ])
      .then(() => true)
      .catch(() => false);

    expect(result).toBe(true);

    // Cleanup
    await db.seatLock.deleteMany({ where: { seatId } });
    await db.seat.update({ where: { id: seatId }, data: { status: "AVAILABLE" } });
  });
});
