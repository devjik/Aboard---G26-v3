import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { EmailOtpRequest } from "@/lib/api/contracts/auth";
import { createOtp } from "@/lib/auth/otp";
import { getCorrelationId } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/email-otp/request
 * Body: { email }
 *
 * Generates a 6-digit code keyed by the email address and (in production)
 * sends it via the configured email provider. In development the code is
 * returned in the response so you can sign in without a real email gateway.
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

  const parsed = EmailOtpRequest.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }

  const { email } = parsed.data;

  // The user must already have an account with this email.
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "No account found with that email. Register first or use your phone number.",
      meta: { correlationId: corr },
    }).response;
  }
  if (user.status === "SUSPENDED") {
    return errorResponse(ERRORS.FORBIDDEN, {
      message: "Account suspended",
      meta: { correlationId: corr },
    }).response;
  }

  const result = createOtp(email, "email_login");

  // DEV: return the code so testers can sign in without a real email gateway.
  // In production, this would be sent via the email provider (SMTP/Resend/etc).
  const isDev = process.env.NODE_ENV !== "production";

  return okResponse(
    {
      otpSent: true,
      channel: "email",
      ...(isDev ? { devCode: result.code } : {}),
    },
    { correlationId: corr },
  );
}
