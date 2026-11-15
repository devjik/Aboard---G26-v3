import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { EmailOtpVerify } from "@/lib/api/contracts/auth";
import { verifyOtp } from "@/lib/auth/otp";
import { buildAuthUser } from "@/lib/auth/current-user";
import { setSessionCookies } from "@/lib/auth/session";
import { getCorrelationId } from "@/lib/auth/guard";
import { notifySignIn } from "@/lib/auth/notify-sign-in";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/email-otp/verify
 * Body: { email, code }
 *
 * Verifies the 6-digit code, sets session cookies, persists a real sign-in
 * notification, and returns the authenticated user.
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

  const parsed = EmailOtpVerify.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }

  const { email, code } = parsed.data;

  const result = verifyOtp(email, code);
  if (!result.ok) {
    const def = result.reason === "max_attempts" ? ERRORS.RATE_LIMITED : ERRORS.UNAUTHENTICATED;
    return errorResponse(def, {
      message: `Email verification failed: ${result.reason}`,
      details: { remainingAttempts: result.remainingAttempts },
      meta: { correlationId: corr },
    }).response;
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "No account found with that email",
      meta: { correlationId: corr },
    }).response;
  }
  if (user.status === "SUSPENDED") {
    return errorResponse(ERRORS.FORBIDDEN, {
      message: "Account suspended",
      meta: { correlationId: corr },
    }).response;
  }

  await setSessionCookies({
    userId: user.id,
    role: user.role,
    status: user.status,
  });

  // persist + emit a real sign-in notification
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await notifySignIn({
    userId: user.id,
    name: user.name,
    role: user.role,
    method: "otp" as const,
    ip,
  });

  const authUser = await buildAuthUser(user);
  return okResponse({ user: authUser }, { correlationId: corr });
}
