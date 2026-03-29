-- CreateEnum
CREATE TYPE "FollowTag" AS ENUM ('coworker', 'friend', 'peer', 'inspiration');

-- AlterTable
ALTER TABLE "Follow"
ADD COLUMN "tag" "FollowTag";

-- CreateIndex
CREATE INDEX "Follow_followerId_tag_createdAt_idx" ON "Follow"("followerId", "tag", "createdAt");
