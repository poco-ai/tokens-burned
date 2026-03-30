import { randomUUID } from "node:crypto";
import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { isProduction, isSelfHosted } from "./auth-config";
import {
  getEnabledOAuth2ProviderConfigs,
  isSocialProviderEnabled,
} from "./auth-providers";
import {
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_TAKEN_ERROR_MESSAGE,
} from "./auth-username";
import { prisma } from "./prisma";
import { usernameSchema } from "./validators/auth";

function getRequiredEnv(
  name: "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL",
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to web/.env.`,
    );
  }

  return value;
}

function createUsernameCandidateBase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]+/g, ".")
    .replace(/[.]{2,}/g, ".")
    .replace(/^[._]+|[._]+$/g, "");
}

async function generateUniqueUsername(seed: string) {
  const fallbackBase = "user";
  const normalizedBase = createUsernameCandidateBase(seed);
  const base =
    normalizedBase.length >= USERNAME_MIN_LENGTH
      ? normalizedBase
      : fallbackBase;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = attempt === 0 ? "" : `.${randomUUID().slice(0, 6)}`;
    const maxBaseLength = USERNAME_MAX_LENGTH - suffix.length;
    const candidateBase = base.slice(0, Math.max(maxBaseLength, 0)).trim();
    const candidate = `${candidateBase || fallbackBase}${suffix}`;
    const existingUser = await prisma.user.findUnique({
      where: { username: candidate },
    });

    if (!existingUser) {
      return candidate;
    }
  }

  return `user.${randomUUID().replace(/-/g, "").slice(0, 6)}`;
}

export const auth = betterAuth({
  baseURL: getRequiredEnv("BETTER_AUTH_URL"),
  secret: getRequiredEnv("BETTER_AUTH_SECRET"),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
        returned: true,
        unique: true,
        sortable: true,
        validator: {
          input: usernameSchema,
        },
        transform: {
          input(value) {
            return typeof value === "string" ? normalizeUsername(value) : value;
          },
        },
      },
      usernameNeedsSetup: {
        type: "boolean",
        required: false,
        returned: true,
        defaultValue: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const providedUsername =
            typeof user.username === "string"
              ? normalizeUsername(user.username)
              : "";
          const usernameNeedsSetup = !providedUsername;
          const username = providedUsername
            ? providedUsername
            : await generateUniqueUsername(
                user.email?.split("@")[0] || user.name || "user",
              );

          if (providedUsername) {
            const existingUser = await prisma.user.findUnique({
              where: { username },
            });

            if (existingUser) {
              throw APIError.from("BAD_REQUEST", {
                code: "USERNAME_IS_ALREADY_TAKEN",
                message: USERNAME_TAKEN_ERROR_MESSAGE,
              });
            }
          }

          return {
            data: {
              ...user,
              username,
              usernameNeedsSetup,
            },
          };
        },
      },
      update: {
        before: async (user, context) => {
          if (typeof user.username !== "string") {
            return;
          }

          const username = normalizeUsername(user.username);
          const existingUser = await prisma.user.findUnique({
            where: { username },
          });
          const currentUserId = context?.context.session?.session.userId;

          if (existingUser && existingUser.id !== currentUserId) {
            throw APIError.from("BAD_REQUEST", {
              code: "USERNAME_IS_ALREADY_TAKEN",
              message: USERNAME_TAKEN_ERROR_MESSAGE,
            });
          }

          return {
            data: {
              ...user,
              username,
              usernameNeedsSetup: false,
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: isSelfHosted,
  },
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: isProduction && isSocialProviderEnabled("github"),
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: isProduction && isSocialProviderEnabled("google"),
    },
  },
  plugins: [
    nextCookies(),
    genericOAuth({
      config: isProduction ? getEnabledOAuth2ProviderConfigs() : [],
    }),
  ],
});
