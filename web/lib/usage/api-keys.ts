import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { UsageApiKeyStatus } from "./types";

export function hashUsageApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function splitApiKeyPrefix(raw: string) {
  return raw.slice(0, 12);
}

export function generateUsageApiKey() {
  const raw = `vbu_${randomBytes(24).toString("hex")}`;

  return {
    raw,
    prefix: splitApiKeyPrefix(raw),
    keyHash: hashUsageApiKey(raw),
  };
}

export async function createUsageApiKey(userId: string, name: string) {
  const nextKey = generateUsageApiKey();
  const apiKey = await prisma.usageApiKey.create({
    data: {
      userId,
      name: name.trim(),
      prefix: nextKey.prefix,
      keyHash: nextKey.keyHash,
    },
  });

  return {
    rawKey: nextKey.raw,
    apiKey,
  };
}

export async function listUsageApiKeys(userId: string) {
  return prisma.usageApiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateUsageApiKey(
  userId: string,
  id: string,
  input: {
    name?: string;
    status?: UsageApiKeyStatus;
  },
) {
  const existing = await prisma.usageApiKey.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return null;
  }

  return prisma.usageApiKey.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      status: input.status,
    },
  });
}

export async function deleteUsageApiKey(userId: string, id: string) {
  const existing = await prisma.usageApiKey.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return false;
  }

  await prisma.usageApiKey.delete({
    where: { id },
  });

  return true;
}

export async function findUsageApiKeyByRaw(rawKey: string) {
  if (!rawKey.startsWith("vbu_")) {
    return null;
  }

  const apiKey = await prisma.usageApiKey.findUnique({
    where: {
      keyHash: hashUsageApiKey(rawKey),
    },
  });

  if (!apiKey || apiKey.status === "disabled") {
    return null;
  }

  return apiKey;
}
