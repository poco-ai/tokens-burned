ALTER TABLE "Device"
ADD COLUMN "deviceFingerprint" TEXT;

CREATE INDEX "Device_userId_deviceFingerprint_idx"
ON "Device"("userId", "deviceFingerprint");
