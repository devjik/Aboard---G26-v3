import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { requireAuth, getCorrelationId } from "@/lib/auth/guard";
import { verifyTicket } from "@/lib/tickets/signer";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/tickets/[bookingId]
 *
 * Returns the ticket for a booking, including:
 * - The signed ticket token (for the driver to scan/verify offline)
 * - A QR code data URL (rendered in the UI for scanning)
 * - The decoded payload (seat, route, student, departure)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const corr = getCorrelationId(req);
  const r = await requireAuth();
  if (!r.ok) return r.response;

  const { bookingId } = await params;

  // The param can be either a bookingId or a ticketId — try both.
  let ticket = await db.ticket.findUnique({
    where: { bookingId },
    include: {
      booking: {
        include: {
          trip: { include: { route: true } },
          seat: { select: { label: true } },
          student: { include: { user: { select: { name: true } } } },
          payments: { select: { id: true, status: true } },
        },
      },
    },
  });

  // If not found by bookingId, try by ticket id
  if (!ticket) {
    ticket = await db.ticket.findUnique({
      where: { id: bookingId },
      include: {
        booking: {
          include: {
            trip: { include: { route: true } },
            seat: { select: { label: true } },
            student: { include: { user: { select: { name: true } } } },
            payments: { select: { id: true, status: true } },
          },
        },
      },
    });
  }

  if (!ticket) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "Ticket not found",
      meta: { correlationId: corr },
    }).response;
  }

  const payload = verifyTicket(ticket.payloadSigned);
  if (!payload) {
    return errorResponse(ERRORS.INTERNAL, {
      message: "Ticket signature invalid",
      meta: { correlationId: corr },
    }).response;
  }

  // Generate QR code as a data URL
  const qrDataUrl = await QRCode.toDataURL(ticket.payloadSigned, {
    width: 256,
    margin: 1,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });

  const booking = ticket.booking;
  const route = `${booking.trip.route.originName} → ${booking.trip.route.destName}`;
  const payment = booking.payments[0];

  return okResponse(
    {
      ticketId: ticket.id,
      status: ticket.status,
      version: ticket.version,
      issuedAt: ticket.issuedAt.toISOString(),
      token: ticket.payloadSigned,
      qr: qrDataUrl,
      ref: `AB-${new Date(ticket.issuedAt).getFullYear()}-${ticket.id.slice(-6).toUpperCase()}`,
      payload,
      route,
      seatLabel: booking.seat?.label ?? "—",
      studentName: booking.student?.user?.name ?? "Passenger",
      departureAt: booking.trip.departureAt.toISOString(),
      departureFormatted: booking.trip.departureAt.toLocaleString("en-GH", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      operatorName: "Central Connect Ltd",
      paymentStatus: payment?.status ?? "UNKNOWN",
      approved: ticket.status === "VALID",
    },
    { correlationId: corr },
  );
}
