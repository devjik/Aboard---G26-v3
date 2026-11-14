import { okResponse, ERRORS, errorResponse } from "@/lib/api/envelope";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    return errorResponse(ERRORS.INTERNAL, {
      status: 503,
      message: "Service unavailable",
    }).response;
  }
  return okResponse({ status: "ready" });
}
