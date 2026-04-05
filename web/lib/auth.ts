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
  USERNAME_TAKEN_ERROR_MESSAGE,
} from "./auth-username";
import { resolveCreatedUsername } from "./auth-username.server";
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
      usernameAutoAdjusted: {
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
            typeof user.username === "string" ? user.username : undefined;
          const { username, usernameNeedsSetup, usernameAutoAdjusted } =
            await resolveCreatedUsername({
              providedUsername,
              seed: user.email?.split("@")[0] || user.name || "user",
              findUserByUsername: async (candidate) =>
                prisma.user.findUnique({
                  where: { username: candidate },
                  select: { id: true },
                }),
            });

          return {
            data: {
              ...user,
              username,
              usernameNeedsSetup,
              usernameAutoAdjusted,
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
              usernameAutoAdjusted: false,
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
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      scope: ["identify", "email"],
      enabled: isProduction && isSocialProviderEnabled("discord"),
    },
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
