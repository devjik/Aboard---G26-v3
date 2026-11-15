import { createHmac } from "node:crypto";
import { db } from "@/lib/db";

const SECRET =
  process.env.ABOARD_SESSION_SECRET ??
  "aboard-dev-secret-change-me-in-production-please-32chars";

export interface TicketPayload {
  bookingId: string;
  tripId: string;
  seatLabel: string;
  studentId: string;
  studentName: string;
  route: string;
  departureAt: string;
  expiry: string;
  version: number;
}

export function signTicket(payload: TicketPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyTicket(token: string): TicketPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", SECRET).update(body).digest("base64url");
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TicketPayload;
  } catch {
    return null;
  }
}

export function generateBookingRef(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AB-${year}-${rand}`;
}

export async function issueTicket(bookingId: string): Promise<{
  id: string;
  token: string;
  ref: string;
  payload: TicketPayload;
}> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      trip: { include: { route: true } },
      seat: { select: { label: true } },
      student: { include: { user: { select: { name: true } } } },
    },
  });
  if (!booking) throw new Error("Booking not found");

  const payload: TicketPayload = {
    bookingId: booking.id,
    tripId: booking.tripId,
    seatLabel: booking.seat?.label ?? "—",
    studentId: booking.studentId,
    studentName: booking.student?.user?.name ?? "Passenger",
    route: `${booking.trip.route.originName} → ${booking.trip.route.destName}`,
    departureAt: booking.trip.departureAt.toISOString(),
    expiry: new Date(booking.trip.departureAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    version: 1,
  };

  const token = signTicket(payload);
  const ref = generateBookingRef();

  const ticket = await db.ticket.upsert({
    where: { bookingId: booking.id },
    create: {
      bookingId: booking.id,
      payloadSigned: token,
      version: 1,
      status: "VALID",
    },
    update: {
      payloadSigned: token,
      version: { increment: 1 },
      status: "VALID",
    },
  });

  return { id: ticket.id, token, ref, payload };
}
