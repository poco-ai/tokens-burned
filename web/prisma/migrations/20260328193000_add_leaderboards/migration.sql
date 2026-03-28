-- CreateEnum
CREATE TYPE "LeaderboardSnapshotPeriod" AS ENUM ('day', 'week', 'month', 'all_time');

-- CreateTable
CREATE TABLE "leaderboard_user_day" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "statDate" TIMESTAMP(3) NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "userMessages" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_user_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_snapshot" (
    "id" TEXT NOT NULL,
    "period" "LeaderboardSnapshotPeriod" NOT NULL,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_snapshot_entry" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_snapshot_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_user_day_userId_statDate_key" ON "leaderboard_user_day"("userId", "statDate");

-- CreateIndex
CREATE INDEX "leaderboard_user_day_statDate_userId_idx" ON "leaderboard_user_day"("statDate", "userId");

-- CreateIndex
CREATE INDEX "leaderboard_user_day_userId_statDate_idx" ON "leaderboard_user_day"("userId", "statDate");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_snapshot_period_key" ON "leaderboard_snapshot"("period");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_snapshot_entry_snapshotId_userId_key" ON "leaderboard_snapshot_entry"("snapshotId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_snapshot_entry_snapshotId_rank_key" ON "leaderboard_snapshot_entry"("snapshotId", "rank");

-- CreateIndex
CREATE INDEX "leaderboard_snapshot_entry_snapshotId_rank_idx" ON "leaderboard_snapshot_entry"("snapshotId", "rank");

-- CreateIndex
CREATE INDEX "leaderboard_snapshot_entry_userId_rank_idx" ON "leaderboard_snapshot_entry"("userId", "rank");

-- AddForeignKey
ALTER TABLE "leaderboard_user_day" ADD CONSTRAINT "leaderboard_user_day_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_snapshot_entry" ADD CONSTRAINT "leaderboard_snapshot_entry_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "leaderboard_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_snapshot_entry" ADD CONSTRAINT "leaderboard_snapshot_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
