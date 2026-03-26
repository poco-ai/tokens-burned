import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { ProjectMode } from "./types";

function createProjectHashSalt() {
  return randomBytes(16).toString("hex");
}

export async function ensureUsagePreference(userId: string) {
  return prisma.usagePreference.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      projectHashSalt: createProjectHashSalt(),
    },
  });
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
