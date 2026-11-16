import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { getCorrelationId } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/live-users
 *
 * Returns all users with active (non-expired, non-revoked) sessions.
 * Dev bypass: no auth required in development.
 * Includes role, name, phone, and login time.
 */
export async function GET(req: NextRequest) {
  const corr = getCorrelationId(req);

  if (process.env.NODE_ENV !== "development") {
    const { requireRole } = await import("@/lib/auth/guard");
    const r = await requireRole("ADMIN");
    if (!r.ok) return r.response;
  }

  const now = new Date();

  // Find all active sessions
  const sessions = await db.session.findMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: now },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Deduplicate by user (one user may have multiple sessions)
  const seen = new Set<string>();
  const users = sessions
    .filter((s) => {
      if (seen.has(s.userId)) return false;
      seen.add(s.userId);
      return true;
    })
    .map((s) => ({
      userId: s.userId,
      name: s.user.name,
      phone: s.user.phone,
      email: s.user.email,
      role: s.user.role,
      status: s.user.status,
      loggedInAt: s.createdAt.toISOString(),
    }));

  return okResponse(
    {
      users,
      count: users.length,
    },
    { correlationId: corr },
  );
}
