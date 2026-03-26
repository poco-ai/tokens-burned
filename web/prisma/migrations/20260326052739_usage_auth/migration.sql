-- CreateEnum
CREATE TYPE "UsageApiKeyStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "ProjectMode" AS ENUM ('hashed', 'raw', 'disabled');

-- CreateTable
CREATE TABLE "UsagePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "projectMode" "ProjectMode" NOT NULL DEFAULT 'hashed',
    "projectHashSalt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsagePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "status" "UsageApiKeyStatus" NOT NULL DEFAULT 'active',
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageBucket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "deviceId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "projectLabel" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "cachedTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "deviceId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "projectLabel" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "firstMessageAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "activeSeconds" INTEGER NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "userMessageCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsagePreference_userId_key" ON "UsagePreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageApiKey_keyHash_key" ON "UsageApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "UsageApiKey_userId_status_idx" ON "UsageApiKey"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Device_userId_deviceId_key" ON "Device"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "UsageBucket_userId_bucketStart_idx" ON "UsageBucket"("userId", "bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "UsageBucket_userId_deviceId_source_model_projectKey_bucketS_key" ON "UsageBucket"("userId", "deviceId", "source", "model", "projectKey", "bucketStart");

-- CreateIndex
CREATE INDEX "UsageSession_userId_firstMessageAt_idx" ON "UsageSession"("userId", "firstMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "UsageSession_userId_deviceId_source_sessionHash_key" ON "UsageSession"("userId", "deviceId", "source", "sessionHash");

-- AddForeignKey
ALTER TABLE "UsagePreference" ADD CONSTRAINT "UsagePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageApiKey" ADD CONSTRAINT "UsageApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageBucket" ADD CONSTRAINT "UsageBucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageSession" ADD CONSTRAINT "UsageSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
