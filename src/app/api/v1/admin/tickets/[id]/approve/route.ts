import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { getCorrelationId } from "@/lib/auth/guard";
import { activeNotificationProvider } from "@/lib/notifications/provider";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/tickets/[id]/approve
 *
 * Admin approves a ticket — marks it as VALID (approved).
 * Sends a notification to the student: "Your ticket has been approved".
 * In dev, tickets are auto-VALID on issue; this endpoint is for the
 * admin workflow where they review and explicitly approve.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const corr = getCorrelationId(req);

  if (process.env.NODE_ENV !== "development") {
    const { requireRole } = await import("@/lib/auth/guard");
    const r = await requireRole("ADMIN");
    if (!r.ok) return r.response;
  }

  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          trip: { include: { route: true } },
          seat: { select: { label: true } },
          student: { include: { user: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  if (!ticket) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "Ticket not found",
      meta: { correlationId: corr },
    }).response;
  }

  // Mark as VALID (approved)
  await db.ticket.update({
    where: { id },
    data: { status: "VALID" },
  });

  // Notify the student
  if (ticket.booking.student?.user) {
    const route = `${ticket.booking.trip.route.originName} → ${ticket.booking.trip.route.destName}`;
    const seat = ticket.booking.seat?.label ?? "—";
    await activeNotificationProvider.send({
      userId: ticket.booking.student.user.id,
      channel: "IN_APP",
      type: "BOOKING_CONFIRMED",
      title: "Ticket approved by admin",
      body: `Your ticket for ${route}, seat ${seat}, has been approved. Show the QR code at boarding.`,
      payload: {
        kind: "TICKET_APPROVED",
        ticketId: ticket.id,
        route,
        seat,
        ts: Date.now(),
      },
    });
  }

  return okResponse(
    {
      ok: true,
      ticketId: ticket.id,
      status: "VALID",
      approved: true,
      message: "Ticket approved — student notified",
    },
    { correlationId: corr },
  );
}
