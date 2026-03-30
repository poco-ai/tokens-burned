export type AuthMode = "self-hosted" | "production";

/**
 * Authentication mode configuration.
 *
 * - `self-hosted`: Email/password authentication only, for self-deployed instances
 * - `production`: OAuth-only authentication (GitHub/Google/Linux.do/Watcha), for cloud-hosted service
 *
 * Defaults to `self-hosted` if not set.
 */
export const authMode: AuthMode =
  (process.env.AUTH_MODE as AuthMode) || "self-hosted";

export const isSelfHosted = authMode === "self-hosted";
export const isProduction = authMode === "production";

export const authConfig = {
  mode: authMode,
  isSelfHosted,
  isProduction,
  emailAndPasswordEnabled: isSelfHosted,
  socialProvidersEnabled: isProduction,
} as const;
