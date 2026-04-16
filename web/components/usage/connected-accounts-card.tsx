"use client";

import { Mail } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { SiDiscord, SiGithub, SiGitlab, SiGoogle } from "react-icons/si";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import type { LoginProvider } from "@/lib/auth-providers";

type ConnectedAccountRecord = {
  id: string;
  providerId: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;
  scopes: string[];
};

type ConnectedAccountsCardProps = {
  accounts?: ConnectedAccountRecord[];
  availableProviders?: LoginProvider[];
};

async function postAuthAction(
  path: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/auth${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!response.ok) {
    throw payload ?? new Error("Request failed.");
  }

  return payload ?? {};
}

function ProviderIcon({
  providerId,
}: {
  providerId: "credential" | LoginProvider["id"];
}): ReactNode {
  if (providerId === "credential") {
    return <Mail className="h-5 w-5" aria-hidden />;
  }

  switch (providerId) {
    case "discord":
      return <SiDiscord className="h-5 w-5 shrink-0" aria-hidden />;
    case "github":
      return <SiGithub className="h-5 w-5 shrink-0" aria-hidden />;
    case "gitlab":
      return <SiGitlab className="h-5 w-5 shrink-0" aria-hidden />;
    case "google":
      return <SiGoogle className="h-5 w-5 shrink-0" aria-hidden />;
    case "linuxdo":
      return (
        <Image
          src="https://linux.do/logo-128.svg"
          alt=""
          width={20}
          height={20}
          className="shrink-0"
        />
      );
    case "watcha":
      return (
        <Image
          src="https://watcha.tos-cn-beijing.volces.com/products/logo/1752064513_guan-cha-insights.png?x-tos-process=image/resize,w_72/format,webp"
          alt=""
          width={20}
          height={20}
          className="shrink-0"
        />
      );
    default:
      return <Mail className="h-5 w-5" aria-hidden />;
  }
}

export function ConnectedAccountsCard({
  accounts = [],
  availableProviders = [],
}: ConnectedAccountsCardProps) {
  const router = useRouter();
  const t = useTranslations("usage.settings.connectedAccounts");
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const rows = useMemo(() => {
    const credentialAccounts = accounts.filter(
      (a) => a.providerId === "credential",
    );

    const credentialRows = credentialAccounts.map((account) => ({
      kind: "credential" as const,
      key: account.id,
      account,
    }));

    const oauthRows = availableProviders.map((provider) => {
      const account = accounts.find((a) => a.providerId === provider.id);
      return {
        kind: "oauth" as const,
        key: `oauth:${provider.id}`,
        provider,
        account,
      };
    });

    return [...credentialRows, ...oauthRows];
  }, [accounts, availableProviders]);

  const handleConnect = async (provider: LoginProvider) => {
    const actionKey = `connect:${provider.id}`;
    setBusyKey(actionKey);
    setError(null);

    try {
      const payload =
        provider.kind === "social"
          ? await postAuthAction("/link-social", {
              provider: provider.id,
              callbackURL: "/settings/authentication",
              errorCallbackURL: "/settings/authentication",
            })
          : await postAuthAction("/oauth2/link", {
              providerId: provider.id,
              callbackURL: "/settings/authentication",
              errorCallbackURL: "/settings/authentication",
            });

      if (typeof payload.url === "string" && payload.url) {
        window.location.assign(payload.url);
        return;
      }
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, t("errors.connect")));
      setBusyKey(null);
    }
  };

  const handleDisconnect = async (account: ConnectedAccountRecord) => {
    const actionKey = `disconnect:${account.id}`;
    setBusyKey(actionKey);
    setError(null);

    try {
      const payload = await postAuthAction("/unlink-account", {
        providerId: account.providerId,
        accountId: account.accountId,
      });

      if (payload.status !== true) {
        throw payload;
      }

      router.refresh();
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, t("errors.disconnect")));
    } finally {
      setBusyKey(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/50">
        {rows.map((row) => {
          if (row.kind === "credential") {
            return (
              <div key={row.key} className="flex items-center gap-4 px-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center text-foreground">
                  <ProviderIcon providerId="credential" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">
                    {t("credentialLabel")}
                  </div>
                </div>
              </div>
            );
          }

          const { provider, account } = row;
          const connectKey = `connect:${provider.id}`;
          const disconnectKey = account ? `disconnect:${account.id}` : null;
          const canDisconnect =
            account &&
            account.providerId !== "credential" &&
            accounts.length > 1;

          if (account) {
            return (
              <div key={row.key} className="flex items-center gap-4 px-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center text-foreground">
                  <ProviderIcon providerId={provider.id} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">
                    {provider.label}
                  </div>
                </div>
                <div className="flex shrink-0 justify-end">
                  {canDisconnect ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDisconnect(account)}
                      disabled={busyKey === disconnectKey}
                    >
                      {busyKey === disconnectKey
                        ? t("disconnecting")
                        : t("disconnect")}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          }

          return (
            <div key={row.key} className="flex items-center gap-4 px-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center text-foreground">
                <ProviderIcon providerId={provider.id} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">
                  {provider.label}
                </div>
              </div>
              <div className="flex shrink-0 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleConnect(provider)}
                  disabled={busyKey === connectKey}
                >
                  {busyKey === connectKey ? t("connecting") : t("connect")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
