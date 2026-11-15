import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { requireAuth, getCorrelationId } from "@/lib/auth/guard";
import { issueTicket } from "@/lib/tickets/signer";
import { activeNotificationProvider } from "@/lib/notifications/provider";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/payments/[id]/confirm
 *
 * Confirms a (sandbox) payment — marks it SUCCESS, confirms the booking,
 * marks the seat BOOKED, issues a signed Ticket, and notifies the student.
 *
 * In production this would be triggered by the payment provider's webhook.
 * For the sandbox pilot, the student taps "Confirm payment" to simulate
 * the mobile money confirmation.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const corr = getCorrelationId(req);
  const r = await requireAuth();
  if (!r.ok) return r.response;

  const { id } = await params;

  const payment = await db.payment.findUnique({
    where: { id },
    include: { booking: { include: { trip: { include: { route: true } }, seat: true, student: { include: { user: { select: { id: true, name: true } } } } } } },
  });
  if (!payment) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "Payment not found",
      meta: { correlationId: corr },
    }).response;
  }

  // Idempotent: if already SUCCESS, return the existing ticket
  if (payment.status === "SUCCESS") {
    const existingTicket = await db.ticket.findUnique({
      where: { bookingId: payment.bookingId },
    });
    if (existingTicket) {
      return okResponse(
        {
          ok: true,
          alreadyConfirmed: true,
          ticketId: existingTicket.id,
          ticketToken: existingTicket.payloadSigned,
          message: "Payment was already confirmed",
        },
        { correlationId: corr },
      );
    }
  }

  // 1. Mark payment SUCCESS
  await db.payment.update({
    where: { id },
    data: { status: "SUCCESS" },
  });

  // 2. Confirm the booking + mark seat BOOKED
  await db.$transaction([
    db.booking.update({
      where: { id: payment.bookingId },
      data: { status: "CONFIRMED" },
    }),
    db.seat.update({
      where: { id: payment.booking.seatId },
      data: { status: "BOOKED" },
    }),
    // Decrement available seats on the trip
    db.trip.update({
      where: { id: payment.booking.tripId },
      data: { seatsAvailable: { decrement: 1 } },
    }),
  ]);

  // 3. Issue the signed ticket
  const ticket = await issueTicket(payment.bookingId);

  // 4. Notify the student
  const routeLabel = `${payment.booking.trip.route.originName} → ${payment.booking.trip.route.destName}`;
  const seatLabel = payment.booking.seat?.label ?? "—";
  const depTime = payment.booking.trip.departureAt.toLocaleString("en-GH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  await activeNotificationProvider.send({
    userId: payment.booking.student.user.id,
    channel: "IN_APP",
    type: "BOOKING_CONFIRMED",
    title: "Ticket issued — you're booked!",
    body: `Your ticket for ${routeLabel} on ${depTime} is confirmed. Seat ${seatLabel}. Reference: ${ticket.ref}. Show the QR at boarding.`,
    payload: {
      kind: "TICKET_ISSUED",
      ticketId: ticket.id,
      ref: ticket.ref,
      route: routeLabel,
      seat: seatLabel,
      departureAt: payment.booking.trip.departureAt.toISOString(),
      ts: Date.now(),
    },
  });

  return okResponse(
    {
      ok: true,
      paymentStatus: "SUCCESS",
      bookingStatus: "CONFIRMED",
      ticketId: ticket.id,
      ticketToken: ticket.token,
      ref: ticket.ref,
      route: routeLabel,
      seat: seatLabel,
      departureAt: payment.booking.trip.departureAt.toISOString(),
      studentName: payment.booking.student.user.name,
    },
    { correlationId: corr },
  );
}
