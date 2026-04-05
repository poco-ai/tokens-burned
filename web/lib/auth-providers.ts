import type { OAuth2Tokens, OAuth2UserInfo } from "better-auth/oauth2";
import type { GenericOAuthConfig } from "better-auth/plugins/generic-oauth";

type ProviderEnvName =
  | "DISCORD_CLIENT_ID"
  | "DISCORD_CLIENT_SECRET"
  | "GITHUB_CLIENT_ID"
  | "GITHUB_CLIENT_SECRET"
  | "GOOGLE_CLIENT_ID"
  | "GOOGLE_CLIENT_SECRET"
  | "LINUXDO_CLIENT_ID"
  | "LINUXDO_CLIENT_SECRET"
  | "WATCHA_CLIENT_ID"
  | "WATCHA_CLIENT_SECRET";

type ProviderCredentials = {
  clientId: ProviderEnvName;
  clientSecret: ProviderEnvName;
};

type ProviderBase = {
  label: string;
  credentials: ProviderCredentials;
};

type SocialProviderDefinition = ProviderBase & {
  id: "discord" | "github" | "google";
  kind: "social";
};

type OAuth2ProviderDefinition = ProviderBase & {
  id: "linuxdo" | "watcha";
  kind: "oauth2";
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  redirectURI?: string;
  pkce?: boolean;
  getUserInfo?: (tokens: OAuth2Tokens) => Promise<OAuth2UserInfo | null>;
};

export type LoginProvider = Pick<
  SocialProviderDefinition | OAuth2ProviderDefinition,
  "id" | "kind" | "label"
>;

async function getWatchaUserInfo(tokens: OAuth2Tokens) {
  const response = await fetch(
    `https://watcha.cn/oauth/api/userinfo?access_token=${tokens.accessToken}`,
  );
  const data = (await response.json()) as {
    statusCode: number;
    data?: {
      user_id: number;
      nickname: string;
      avatar_url?: string;
    };
  };

  if (!data.data || data.statusCode !== 200) {
    return null;
  }

  return {
    id: String(data.data.user_id),
    name: data.data.nickname,
    image: data.data.avatar_url || undefined,
    email: `${data.data.user_id}@watcha.local`,
    emailVerified: true,
  };
}

const socialProviderDefinitions: readonly SocialProviderDefinition[] = [
  {
    id: "discord",
    kind: "social",
    label: "Discord",
    credentials: {
      clientId: "DISCORD_CLIENT_ID",
      clientSecret: "DISCORD_CLIENT_SECRET",
    },
  },
  {
    id: "github",
    kind: "social",
    label: "GitHub",
    credentials: {
      clientId: "GITHUB_CLIENT_ID",
      clientSecret: "GITHUB_CLIENT_SECRET",
    },
  },
  {
    id: "google",
    kind: "social",
    label: "Google",
    credentials: {
      clientId: "GOOGLE_CLIENT_ID",
      clientSecret: "GOOGLE_CLIENT_SECRET",
    },
  },
] as const;

const oauth2ProviderDefinitions: readonly OAuth2ProviderDefinition[] = [
  {
    id: "linuxdo",
    kind: "oauth2",
    label: "Linux.do",
    credentials: {
      clientId: "LINUXDO_CLIENT_ID",
      clientSecret: "LINUXDO_CLIENT_SECRET",
    },
    authorizationUrl: "https://connect.linux.do/oauth2/authorize",
    tokenUrl: "https://connect.linux.do/oauth2/token",
    userInfoUrl: "https://connect.linux.do/api/user",
    scopes: ["read"],
  },
  {
    id: "watcha",
    kind: "oauth2",
    label: "Watcha",
    credentials: {
      clientId: "WATCHA_CLIENT_ID",
      clientSecret: "WATCHA_CLIENT_SECRET",
    },
    authorizationUrl: "https://watcha.cn/oauth/authorize",
    tokenUrl: "https://watcha.cn/oauth/api/token",
    userInfoUrl: "https://watcha.cn/oauth/api/userinfo",
    scopes: ["read"],
    getUserInfo: getWatchaUserInfo,
  },
] as const;

const providerDefinitions = [
  ...socialProviderDefinitions,
  ...oauth2ProviderDefinitions,
] as const;

function getEnvValue(
  name: ProviderEnvName,
  env = process.env,
): string | undefined {
  return env[name];
}

function hasProviderCredentials(
  credentials: ProviderCredentials,
  env = process.env,
): boolean {
  return Boolean(
    getEnvValue(credentials.clientId, env) &&
      getEnvValue(credentials.clientSecret, env),
  );
}

function getProviderCredentials(
  credentials: ProviderCredentials,
  env = process.env,
): { clientId: string; clientSecret: string } | null {
  const clientId = getEnvValue(credentials.clientId, env);
  const clientSecret = getEnvValue(credentials.clientSecret, env);

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
  };
}

export function getEnabledLoginProviders(env = process.env): LoginProvider[] {
  return providerDefinitions
    .filter((provider) => hasProviderCredentials(provider.credentials, env))
    .map(({ id, kind, label }) => ({
      id,
      kind,
      label,
    }));
}

export function isSocialProviderEnabled(
  providerId: "discord" | "github" | "google",
  env = process.env,
): boolean {
  const provider = socialProviderDefinitions.find(
    (candidate) => candidate.id === providerId,
  );

  return provider ? hasProviderCredentials(provider.credentials, env) : false;
}

export function getEnabledOAuth2ProviderConfigs(
  env = process.env,
): GenericOAuthConfig[] {
  return oauth2ProviderDefinitions.flatMap((provider) => {
    const credentials = getProviderCredentials(provider.credentials, env);

    if (!credentials) {
      return [];
    }

    return [
      {
        providerId: provider.id,
        authorizationUrl: provider.authorizationUrl,
        tokenUrl: provider.tokenUrl,
        userInfoUrl: provider.userInfoUrl,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        scopes: provider.scopes,
        redirectURI: provider.redirectURI,
        pkce: provider.pkce,
        getUserInfo: provider.getUserInfo,
      } satisfies GenericOAuthConfig,
    ];
  });
}
