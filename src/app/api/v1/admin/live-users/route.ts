import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { getCorrelationId } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

// A user is considered "live" if their session was seen within this window.
const LIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/v1/admin/live-users
 *
 * Returns users who are currently online — their session's lastSeenAt
 * was updated within the last 5 minutes (via /api/v1/auth/me which
 * runs on every page load).
 *
 * Dev bypass: no auth required in development.
 */
export async function GET(req: NextRequest) {
  const corr = getCorrelationId(req);

  if (process.env.NODE_ENV !== "development") {
    const { requireRole } = await import("@/lib/auth/guard");
    const r = await requireRole("ADMIN");
    if (!r.ok) return r.response;
  }

  const now = new Date();
  const liveThreshold = new Date(now.getTime() - LIVE_THRESHOLD_MS);

  // Find sessions seen within the last 5 minutes (truly live users)
  const sessions = await db.session.findMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: now },
      lastSeenAt: { gt: liveThreshold },
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
    orderBy: { lastSeenAt: "desc" },
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
      lastSeenAt: s.lastSeenAt.toISOString(),
    }));

  return okResponse(
    {
      users,
      count: users.length,
      threshold: "5 minutes",
    },
    { correlationId: corr },
  );
}
