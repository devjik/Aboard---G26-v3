import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { getCorrelationId } from "@/lib/auth/guard";
import { verifyTicket } from "@/lib/tickets/signer";

export const dynamic = "force-dynamic";

const ScanBody = z.object({
  token: z.string().min(10, "Missing ticket token"),
});

/**
 * POST /api/v1/tickets/scan
 *
 * Driver scans a QR code → sends the token here → server verifies the
 * HMAC signature (offline-capable: the signature is checked locally,
 * no external call needed). Returns the decoded ticket details:
 * passenger name, route, seat, departure, and whether it's already been used.
 *
 * Marks the ticket as USED on first valid scan. Rejects duplicates.
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

  const parsed = ScanBody.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }

  const { token } = parsed.data;

  // Verify the HMAC signature locally — no network needed.
  // This is what makes it "offline": the signature proves the ticket
  // was issued by our server and hasn't been tampered with.
  const payload = verifyTicket(token);
  if (!payload) {
    return errorResponse(ERRORS.SEAT_UNAVAILABLE, {
      message: "Invalid ticket — signature verification failed. This ticket may be forged or corrupted.",
      meta: { correlationId: corr },
    }).response;
  }

  // Check if the ticket has expired
  if (new Date(payload.expiry) < new Date()) {
    return errorResponse(ERRORS.LOCK_EXPIRED, {
      message: `Ticket expired. Departure was ${new Date(payload.departureAt).toLocaleString("en-GH")}.`,
      meta: { correlationId: corr },
    }).response;
  }

  // Look up the ticket in the DB to check if it's already been used
  const ticket = await db.ticket.findUnique({
    where: { bookingId: payload.bookingId },
    include: {
      booking: {
        include: {
          trip: { include: { route: true } },
          seat: { select: { label: true } },
          student: { include: { user: { select: { name: true } } } },
        },
      },
    },
  });

  if (!ticket) {
    // Signature is valid but no DB record — still return the decoded info
    // (the driver can still verify offline even if the DB is unreachable)
    return okResponse(
      {
        valid: true,
        alreadyUsed: false,
        ticketId: null,
        payload,
        message: "Ticket signature valid (offline verification). No DB record found.",
      },
      { correlationId: corr },
    );
  }

  if (ticket.status === "USED") {
    return errorResponse(ERRORS.CONFLICT, {
      message: `Ticket already used. Scanned at ${ticket.usedAt?.toLocaleString("en-GH")}. Passenger: ${payload.studentName}, Seat: ${payload.seatLabel}.`,
      meta: { correlationId: corr },
    }).response;
  }

  if (ticket.status === "CANCELLED") {
    return errorResponse(ERRORS.CONFLICT, {
      message: "Ticket has been cancelled.",
      meta: { correlationId: corr },
    }).response;
  }

  // Mark as USED on first valid scan
  await db.ticket.update({
    where: { id: ticket.id },
    data: { status: "USED", usedAt: new Date() },
  });

  return okResponse(
    {
      valid: true,
      alreadyUsed: false,
      ticketId: ticket.id,
      payload,
      passengerName: payload.studentName,
      route: payload.route,
      seat: payload.seatLabel,
      departure: new Date(payload.departureAt).toLocaleString("en-GH", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      ref: `AB-${new Date(ticket.issuedAt).getFullYear()}-${ticket.id.slice(-6).toUpperCase()}`,
      message: "Boarding verified — ticket is valid and has been marked as used.",
    },
    { correlationId: corr },
  );
}
