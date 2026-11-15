import { db } from "@/lib/db";
import { activeNotificationProvider } from "@/lib/notifications/provider";

/**
 * Persist + emit a real sign-in notification when a user authenticates.
 * This makes the sign-in tangible: a record is written to the database
 * and delivered in-app (visible in the notifications bell + as a toast).
 */
export async function notifySignIn(opts: {
  userId: string;
  name: string;
  role: string;
  method: "password" | "otp";
  ip?: string;
}) {
  const time = new Date().toLocaleString("en-GH", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour12: false,
  });

  const title = "New sign-in";
  const body = `Signed in as ${opts.role.toLowerCase()} via ${opts.method === "otp" ? "OTP" : "password"} at ${time}.${opts.ip ? ` From ${opts.ip}.` : ""} Live tracking is now active.`;

  try {
    await activeNotificationProvider.send({
      userId: opts.userId,
      channel: "IN_APP",
      type: "BOOKING_CONFIRMED" as any, // reuse; add SIGN_IN type when schema extended
      title,
      body,
      payload: {
        kind: "SIGN_IN",
        method: opts.method,
        name: opts.name,
        role: opts.role,
        ts: Date.now(),
      },
    });
  } catch (err) {
    // never block sign-in on a notification failure
    console.error("[notifySignIn] failed to persist notification:", err);
  }
}
