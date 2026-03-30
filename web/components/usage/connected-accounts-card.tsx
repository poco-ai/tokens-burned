"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const providerLabels: Record<string, string> = {
  credential: "Email & Password",
  github: "GitHub",
  google: "Google",
  linuxdo: "Linux.do",
  watcha: "Watcha",
};

function getProviderLabel(
  providerId: string,
  providers: LoginProvider[],
  tCredential: string,
) {
  if (providerId === "credential") {
    return tCredential;
  }

  return (
    providers.find((provider) => provider.id === providerId)?.label ??
    providerLabels[providerId] ??
    providerId
  );
}

function formatAccountId(accountId: string) {
  if (accountId.length <= 12) {
    return accountId;
  }

  return `${accountId.slice(0, 6)}…${accountId.slice(-4)}`;
}

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

export function ConnectedAccountsCard({
  accounts = [],
  availableProviders = [],
}: ConnectedAccountsCardProps) {
  const router = useRouter();
  const t = useTranslations("usage.settings");
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const linkedProviderIds = useMemo(
    () => new Set(accounts.map((account) => account.providerId)),
    [accounts],
  );

  const connectableProviders = availableProviders.filter(
    (provider) => !linkedProviderIds.has(provider.id),
  );

  const handleConnect = async (provider: LoginProvider) => {
    const actionKey = `connect:${provider.id}`;
    setBusyKey(actionKey);
    setError(null);

    try {
      const payload =
        provider.kind === "social"
          ? await postAuthAction("/link-social", {
              provider: provider.id,
              callbackURL: "/settings",
              errorCallbackURL: "/settings",
            })
          : await postAuthAction("/oauth2/link", {
              providerId: provider.id,
              callbackURL: "/settings",
              errorCallbackURL: "/settings",
            });

      if (typeof payload.url === "string" && payload.url) {
        window.location.assign(payload.url);
        return;
      }
    } catch (requestError) {
      setError(
        getAuthErrorMessage(
          requestError,
          t("connectedAccounts.errors.connect"),
        ),
      );
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
      setError(
        getAuthErrorMessage(
          requestError,
          t("connectedAccounts.errors.disconnect"),
        ),
      );
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Card size="sm" className="gap-0 bg-card shadow-sm ring-1 ring-border/60">
      <CardHeader className="border-b border-border/50 bg-card pb-2">
        <CardTitle>{t("connectedAccounts.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        <p className="text-sm text-muted-foreground">
          {t("connectedAccounts.description")}
        </p>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          {accounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
              {t("connectedAccounts.empty")}
            </div>
          ) : (
            accounts.map((account) => {
              const canDisconnect =
                account.providerId !== "credential" && accounts.length > 1;
              const disconnectKey = `disconnect:${account.id}`;

              return (
                <div
                  key={account.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {getProviderLabel(
                          account.providerId,
                          availableProviders,
                          t("connectedAccounts.credentialLabel"),
                        )}
                      </span>
                      <Badge variant="secondary">
                        {t("connectedAccounts.connected")}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("connectedAccounts.accountId", {
                        value: formatAccountId(account.accountId),
                      })}
                    </div>
                  </div>

                  {canDisconnect ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(account)}
                      disabled={busyKey === disconnectKey}
                    >
                      {busyKey === disconnectKey
                        ? t("connectedAccounts.disconnecting")
                        : t("connectedAccounts.disconnect")}
                    </Button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {connectableProviders.length > 0 ? (
          <div className="space-y-2 border-t border-border/60 pt-3">
            <p className="text-sm font-medium text-foreground">
              {t("connectedAccounts.available")}
            </p>
            <div className="flex flex-wrap gap-2">
              {connectableProviders.map((provider) => {
                const connectKey = `connect:${provider.id}`;

                return (
                  <Button
                    key={provider.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleConnect(provider)}
                    disabled={busyKey === connectKey}
                  >
                    {busyKey === connectKey
                      ? t("connectedAccounts.connecting")
                      : t("connectedAccounts.connectAction", {
                          provider: provider.label,
                        })}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
