import { NextRequest } from "next/server";
import { OtpRequest } from "@/lib/api/contracts/auth";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { createOtp } from "@/lib/auth/otp";
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
  const parsed = OtpRequest.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }
  const { phone, purpose } = parsed.data;

  if (purpose === "register") {
    const existing = await db.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (existing) {
      return errorResponse(ERRORS.CONFLICT, {
        code: "PHONE_TAKEN",
        message: "Phone number already registered",
        meta: { correlationId: corr },
      }).response;
    }
  }

  const { code } = createOtp(phone, purpose);
  // In production: dispatch SMS/Email. In dev: return code.
  const isDev = process.env.NODE_ENV !== "production";
  return okResponse(
    {
      otpSent: true,
      ...(isDev ? { devCode: code } : {}),
    },
    { correlationId: corr },
  );
}
