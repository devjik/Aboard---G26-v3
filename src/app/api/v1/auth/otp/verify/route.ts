import { NextRequest } from "next/server";
import { OtpVerify } from "@/lib/api/contracts/auth";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { verifyOtp } from "@/lib/auth/otp";
import { buildAuthUser } from "@/lib/auth/current-user";
import { setSessionCookies } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getCorrelationId } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

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
  const parsed = OtpVerify.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }
  const { phone, code } = parsed.data;

  const result = verifyOtp(phone, code);
  if (!result.ok) {
    const def =
      result.reason === "max_attempts"
        ? ERRORS.RATE_LIMITED
        : result.reason === "not_found" || result.reason === "expired"
          ? ERRORS.UNAUTHENTICATED
          : ERRORS.UNAUTHENTICATED;
    return errorResponse(def, {
      message: `OTP verification failed: ${result.reason}`,
      details: { remainingAttempts: result.remainingAttempts },
      meta: { correlationId: corr },
    }).response;
  }

  const user = await db.user.findUnique({ where: { phone } });
  if (!user) {
    return errorResponse(ERRORS.NOT_FOUND, {
      message: "No account found for this phone — please register first",
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
  const authUser = await buildAuthUser(user);
  return okResponse({ user: authUser }, { correlationId: corr });
}
