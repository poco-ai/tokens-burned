export const LINKED_PROFILE_PROVIDER_IDS = [
  "github",
  "linuxdo",
  "watcha",
] as const;

export type LinkedProfileProviderId =
  (typeof LINKED_PROFILE_PROVIDER_IDS)[number];

export function pickLinkedAccount(
  accounts: Array<{
    providerId: string;
    accountId: string;
    accessToken?: string | null;
  }>,
): {
  providerId: LinkedProfileProviderId;
  accountId: string;
  accessToken?: string | null;
} | null {
  const order: LinkedProfileProviderId[] = ["github", "linuxdo", "watcha"];

  for (const providerId of order) {
    const found = accounts.find((a) => a.providerId === providerId);
    if (found?.accountId?.trim()) {
      return {
        providerId,
        accountId: found.accountId,
        accessToken: found.accessToken,
      };
    }
  }

  return null;
}

async function resolveGithubProfileUrl(
  accountId: string,
): Promise<string | null> {
  const trimmed = accountId.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d+$/.test(trimmed)) {
    return `https://github.com/${encodeURIComponent(trimmed)}`;
  }

  try {
    const response = await fetch(`https://api.github.com/user/${trimmed}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "tokenarena-web",
      },
      next: { revalidate: 86_400 },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { html_url?: string };
    return typeof data.html_url === "string" ? data.html_url : null;
  } catch {
    return null;
  }
}

async function resolveLinuxdoUsernameFromAccessToken(
  accessToken?: string | null,
): Promise<string | null> {
  const trimmedToken = accessToken?.trim();

  if (!trimmedToken) {
    return null;
  }

  try {
    const response = await fetch("https://connect.linux.do/api/user", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${trimmedToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { username?: string };
    const username =
      typeof data.username === "string" ? data.username.trim() : "";

    return username || null;
  } catch {
    return null;
  }
}

async function resolveLinuxdoProfileUrl(
  accountId: string,
  accessToken?: string | null,
): Promise<string | null> {
  const trimmed = accountId.trim();

  if (!trimmed) {
    return null;
  }

  const slug = /^\d+$/.test(trimmed)
    ? await resolveLinuxdoUsernameFromAccessToken(accessToken)
    : trimmed;

  return slug ? `https://linux.do/u/${encodeURIComponent(slug)}/summary` : null;
}

function resolveWatchaProfileUrl(accountId: string): string {
  return `https://watcha.cn/user/${encodeURIComponent(accountId.trim())}`;
}

export async function resolveLinkedProfileUrl(
  providerId: string,
  accountId: string,
  accessToken?: string | null,
): Promise<string | null> {
  switch (providerId) {
    case "github":
      return resolveGithubProfileUrl(accountId);
    case "linuxdo":
      return resolveLinuxdoProfileUrl(accountId, accessToken);
    case "watcha":
      return resolveWatchaProfileUrl(accountId);
    default:
      return null;
  }
}
