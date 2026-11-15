import { okResponse, ERRORS, errorResponse } from "@/lib/api/envelope";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus: "ok" | "error" = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }
  if (dbStatus === "error") {
    return errorResponse(ERRORS.INTERNAL, {
      message: "Database unreachable",
      details: { db: dbStatus },
    }).response;
  }
  return okResponse({
    status: "ok",
    db: dbStatus,
    ts: new Date().toISOString(),
  });
}
