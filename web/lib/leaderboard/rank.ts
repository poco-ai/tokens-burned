import { prisma } from "@/lib/prisma";
import { Prisma } from "../../generated/prisma/client";
import { resolveLeaderboardWindow } from "./date";
import type { LeaderboardPeriod } from "./types";

function windowClause(window: ReturnType<typeof resolveLeaderboardWindow>) {
  if (!window.start || !window.end) {
    return Prisma.empty;
  }

  return Prisma.sql`AND l."statDate" >= ${window.start} AND l."statDate" < ${window.end}`;
}

async function fetchGlobalRankByTotalTokens(
  userId: string,
  period: LeaderboardPeriod,
  now: Date,
): Promise<number | null> {
  const window = resolveLeaderboardWindow(period, now);
  const dateFilter = windowClause(window);

  const rows = await prisma.$queryRaw<[{ rank: bigint | null }]>(
    Prisma.sql`
      WITH sums AS (
        SELECT l."userId", SUM(l."totalTokens")::bigint AS total
        FROM leaderboard_user_day l
        INNER JOIN "UsagePreference" up ON up."userId" = l."userId"
        WHERE up."publicProfileEnabled" = true
        ${dateFilter}
        GROUP BY l."userId"
        HAVING SUM(l."totalTokens") > 0
      ),
      ranked AS (
        SELECT
          "userId",
          ROW_NUMBER() OVER (ORDER BY total DESC, "userId" ASC) AS rank
        FROM sums
      )
      SELECT rank FROM ranked WHERE "userId" = ${userId}
    `,
  );

  const rank = rows[0]?.rank;

  return rank != null ? Number(rank) : null;
}

export type UserGlobalLeaderboardRanks = {
  day: number | null;
  week: number | null;
  month: number | null;
  all_time: number | null;
};

/** Global leaderboard rank by summed total tokens for each period (same sort as the board). */
export async function getUserGlobalLeaderboardRanksByTotalTokens(
  userId: string,
  now = new Date(),
): Promise<UserGlobalLeaderboardRanks> {
  const [day, week, month, all_time] = await Promise.all([
    fetchGlobalRankByTotalTokens(userId, "day", now),
    fetchGlobalRankByTotalTokens(userId, "week", now),
    fetchGlobalRankByTotalTokens(userId, "month", now),
    fetchGlobalRankByTotalTokens(userId, "all_time", now),
  ]);

  return { day, week, month, all_time };
}
