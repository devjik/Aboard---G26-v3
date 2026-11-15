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

  const booking = ticket.booking;
  const route = `${booking.trip.route.originName} → ${booking.trip.route.destName}`;
  const payment = booking.payments[0];
  const ref = `AB-${new Date(ticket.issuedAt).getFullYear()}-${ticket.id.slice(-6).toUpperCase()}`;

  // Build a PLAIN TEXT QR payload — not JSON, not base64.
  // When scanned by ANY phone camera, this shows up as readable text
  // immediately (no Google search, no internet needed). The driver
  // app can extract the token from the last line to verify offline.
  const depStr = booking.trip.departureAt.toLocaleString("en-GH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const qrPayload = [
    "ABOARD BOARDING PASS",
    `Ref: ${ref}`,
    `Passenger: ${booking.student?.user?.name ?? "Passenger"}`,
    `Route: ${route}`,
    `Seat: ${booking.seat?.label ?? "—"}`,
    `Departure: ${depStr}`,
    `Status: ${ticket.status}`,
    "",
    `ABOARD_VERIFY:${ticket.payloadSigned}`,
  ].join("\n");

  // Generate QR code as a data URL — high error correction (H) so it
  // still scans even if partially damaged/dirty/angled. Larger size
  // + more margin for reliable scanning from phone cameras.
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });

  return okResponse(
    {
      ticketId: ticket.id,
      status: ticket.status,
      version: ticket.version,
      issuedAt: ticket.issuedAt.toISOString(),
      token: ticket.payloadSigned,
      qr: qrDataUrl,
      ref,
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
