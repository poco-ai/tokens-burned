import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import type { ProjectMode } from "./types";

type UsagePreferenceClient = Pick<typeof prisma, "usagePreference">;

function createProjectHashSalt() {
  return randomBytes(16).toString("hex");
}

function isUsagePreferenceUniqueConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function ensureUsagePreferenceWithDb(
  db: UsagePreferenceClient,
  userId: string,
) {
  const existing = await db.usagePreference.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  try {
    return await db.usagePreference.create({
      data: {
        userId,
        projectHashSalt: createProjectHashSalt(),
      },
    });
  } catch (error) {
    if (!isUsagePreferenceUniqueConflict(error)) {
      throw error;
    }

    return db.usagePreference.findUniqueOrThrow({
      where: { userId },
    });
  }
}

export async function ensureUsagePreference(userId: string) {
  return ensureUsagePreferenceWithDb(prisma, userId);
}

export async function getUsagePreference(userId: string) {
  return ensureUsagePreference(userId);
}

export async function updateUsagePreference(
  userId: string,
  input: {
    timezone?: string;
    projectMode?: ProjectMode;
  },
) {
  await ensureUsagePreference(userId);

  return prisma.usagePreference.update({
    where: { userId },
    data: {
      timezone: input.timezone,
      projectMode: input.projectMode,
    },
  });
}
