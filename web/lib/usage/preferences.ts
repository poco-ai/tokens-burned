import { randomBytes } from "node:crypto";

import type { AppLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import type { ThemeMode } from "@/lib/theme";
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
    locale?: AppLocale;
    theme?: ThemeMode;
    timezone?: string;
    projectMode?: ProjectMode;
    publicProfileEnabled?: boolean;
    bio?: string | null;
  },
) {
  await ensureUsagePreference(userId);

  return prisma.usagePreference.update({
    where: { userId },
    data: {
      locale: input.locale,
      theme: input.theme,
      timezone: input.timezone,
      projectMode: input.projectMode,
      publicProfileEnabled: input.publicProfileEnabled,
      bio: input.bio,
    },
  });
}
