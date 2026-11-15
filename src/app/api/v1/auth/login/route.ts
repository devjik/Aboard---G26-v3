import { NextRequest } from "next/server";
import { PasswordLogin } from "@/lib/api/contracts/auth";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { verifyPassword } from "@/lib/auth/password";
import { buildAuthUser } from "@/lib/auth/current-user";
import { setSessionCookies } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getCorrelationId } from "@/lib/auth/guard";
import { notifySignIn } from "@/lib/auth/notify-sign-in";

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
  const parsed = PasswordLogin.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }
  const { phone, password } = parsed.data;

  const user = await db.user.findUnique({ where: { phone } });
  if (!user || !user.passwordHash) {
    return errorResponse(ERRORS.UNAUTHENTICATED, {
      message: "Invalid credentials",
      meta: { correlationId: corr },
    }).response;
  }
  if (user.status === "SUSPENDED") {
    return errorResponse(ERRORS.FORBIDDEN, {
      message: "Account suspended",
      meta: { correlationId: corr },
    }).response;
  }
  const ok = verifyPassword(password, user.passwordHash);
  if (!ok) {
    return errorResponse(ERRORS.UNAUTHENTICATED, {
      message: "Invalid credentials",
      meta: { correlationId: corr },
    }).response;
  }

  await setSessionCookies({
    userId: user.id,
    role: user.role,
    status: user.status,
  });

  // persist + emit a real sign-in notification (so tracking unlocks visibly)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await notifySignIn({
    userId: user.id,
    name: user.name,
    role: user.role,
    method: "password",
    ip,
  });

  const authUser = await buildAuthUser(user);
  return okResponse({ user: authUser }, { correlationId: corr });
}
