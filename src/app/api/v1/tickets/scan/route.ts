import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { getCorrelationId } from "@/lib/auth/guard";
import { verifyTicket } from "@/lib/tickets/signer";

export const dynamic = "force-dynamic";

const ScanBody = z.object({
  ref: z.string().min(4, "Missing ticket reference").optional(),
  token: z.string().min(10, "Missing ticket token").optional(),
}).refine((d) => d.ref || d.token, {
  message: "Provide either a ref or a token",
});

/**
 * POST /api/v1/tickets/scan
 *
 * Driver scans a QR code (or types the ref code). Accepts either:
 * - `ref` (short, e.g. "AB-2026-A02BY3") — looks up the ticket in the DB
 * - `token` (the signed payload) — verifies the HMAC signature offline
 *
 * Returns the ticket details and marks it as USED on first valid scan.
 * Rejects duplicates, expired, and cancelled tickets.
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

  const { ref, token } = parsed.data;

  let ticket: any = null;

  // If a token is provided, verify the signature (offline-capable)
  if (token) {
    const payload = verifyTicket(token);
    if (!payload) {
      return errorResponse(ERRORS.SEAT_UNAVAILABLE, {
        message: "Invalid ticket — signature verification failed.",
        meta: { correlationId: corr },
      }).response;
    }
    ticket = await db.ticket.findUnique({
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
  }

  // If only a ref is provided, look up by ticket ID suffix
  if (!ticket && ref) {
    // The ref format is AB-YYYY-XXXXXX where XXXXXX is the last 6 chars of the ticket ID
    const match = ref.match(/^AB-\d{4}-(.+)$/);
    const suffix = match?.[1];
    if (suffix) {
      // Find tickets whose ID ends with this suffix (case-insensitive)
      const allTickets = await db.ticket.findMany({
        where: { status: { in: ["VALID", "USED", "CANCELLED"] } },
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
      ticket = allTickets.find((t: any) =>
        t.id.slice(-6).toUpperCase() === suffix.toUpperCase()
      );
    }
  }

  if (!ticket) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "Ticket not found. Check the reference code and try again.",
      meta: { correlationId: corr },
    }).response;
  }

  const ticketRef = `AB-${new Date(ticket.issuedAt).getFullYear()}-${ticket.id.slice(-6).toUpperCase()}`;
  const route = `${ticket.booking.trip.route.originName} → ${ticket.booking.trip.route.destName}`;
  const studentName = ticket.booking.student?.user?.name ?? "Passenger";
  const seat = ticket.booking.seat?.label ?? "—";
  const departure = ticket.booking.trip.departureAt.toLocaleString("en-GH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Check expiry
  if (ticket.booking.trip.departureAt < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    return errorResponse(ERRORS.LOCK_EXPIRED, {
      message: `Ticket expired. Departure was ${departure}.`,
      meta: { correlationId: corr },
    }).response;
  }

  if (ticket.status === "USED") {
    return errorResponse(ERRORS.CONFLICT, {
      message: `Ticket already used. Passenger: ${studentName}, Seat: ${seat}.`,
      meta: { correlationId: corr },
    }).response;
  }

  if (ticket.status === "CANCELLED") {
    return errorResponse(ERRORS.CONFLICT, {
      message: "Ticket has been cancelled.",
      meta: { correlationId: corr },
    }).response;
  }

  // Mark as USED
  await db.ticket.update({
    where: { id: ticket.id },
    data: { status: "USED", usedAt: new Date() },
  });

  return okResponse(
    {
      valid: true,
      alreadyUsed: false,
      ref: ticketRef,
      passengerName: studentName,
      route,
      seat,
      departure,
      message: "Boarding verified — ticket is valid.",
    },
    { correlationId: corr },
  );
}
