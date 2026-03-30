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
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const username = normalizeUsername(String(user.username ?? ""));
          const existingUser = await prisma.user.findUnique({
            where: { username },
          });

          if (existingUser) {
            throw APIError.from("BAD_REQUEST", {
              code: "USERNAME_IS_ALREADY_TAKEN",
              message: USERNAME_TAKEN_ERROR_MESSAGE,
            });
          }

          return {
            data: {
              ...user,
              username,
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
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: isSelfHosted,
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
