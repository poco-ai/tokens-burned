"use client";

import { Copy, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UsageApiKeyStatus } from "@/lib/usage/types";
import { cn } from "@/lib/utils";
import { KeyDialog } from "./key-dialog";

type UsageKeyRecord = {
  id: string;
  name: string;
  prefix: string;
  status: UsageApiKeyStatus;
  lastUsedAt: string | null;
  createdAt: string;
};

export type { UsageKeyRecord };

type KeyManagerProps = {
  initialKeys: UsageKeyRecord[];
  variant?: "page" | "dialog";
  /** Hide the card title when the parent already shows a section heading (e.g. settings layout). */
  omitCardTitle?: boolean;
  /** Settings page: title + create button on one row, description below. */
  sectionHeading?: {
    title: string;
    description: string;
  };
};

const mutedControlClassName =
  "border-border/60 bg-background hover:bg-muted/40";

const summaryBadgeClassName =
  "border-border/60 bg-background text-muted-foreground";

const activeBadgeClassName =
  "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-300";

export function KeyManager({
  initialKeys,
  variant = "page",
  omitCardTitle = false,
  sectionHeading,
}: KeyManagerProps) {
  const t = useTranslations("usage.keys");
  const locale = useLocale();
  const [keys, setKeys] = useState(initialKeys);
  const [error, setError] = useState<string | null>(null);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<UsageKeyRecord | null>(null);
  const [pendingKeyId, setPendingKeyId] = useState<string | null>(null);
  const [isDialogPending, setIsDialogPending] = useState(false);
  const isDialog = variant === "dialog";

  const request = async <T,>(
    input: RequestInfo,
    init?: RequestInit,
  ): Promise<T> => {
    const response = await fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? t("requestFailed"));
    }

    return payload as T;
  };

  const copyRawKey = async () => {
    if (!rawKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(rawKey);
    } catch {
      setError(t("copyFailed"));
    }
  };

  const toggleStatus = async (key: UsageKeyRecord) => {
    setPendingKeyId(key.id);
    setError(null);

    try {
      const nextStatus: UsageApiKeyStatus =
        key.status === "active" ? "disabled" : "active";
      const response = await request<{ key: UsageKeyRecord }>(
        `/api/usage/keys/${key.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      setKeys((current) =>
        current.map((item) => (item.id === key.id ? response.key : item)),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("updateFailed"),
      );
    } finally {
      setPendingKeyId(null);
    }
  };

  const deleteKey = async (key: UsageKeyRecord) => {
    setPendingKeyId(key.id);
    setError(null);

    try {
      await request<{ success: true }>(`/api/usage/keys/${key.id}`, {
        method: "DELETE",
      });

      setKeys((current) => current.filter((item) => item.id !== key.id));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("deleteFailed"),
      );
    } finally {
      setPendingKeyId(null);
    }
  };

  const createKey = async (name: string) => {
    setIsDialogPending(true);
    setError(null);

    try {
      const response = await request<{ key: UsageKeyRecord; rawKey: string }>(
        "/api/usage/keys",
        {
          method: "POST",
          body: JSON.stringify({ name }),
        },
      );

      setKeys((current) => [response.key, ...current]);
      setRawKey(response.rawKey);
      setIsCreateOpen(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("createFailed"),
      );
    } finally {
      setIsDialogPending(false);
    }
  };

  const renameKey = async (name: string) => {
    if (!renameTarget) {
      return;
    }

    setIsDialogPending(true);
    setError(null);

    try {
      const response = await request<{ key: UsageKeyRecord }>(
        `/api/usage/keys/${renameTarget.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name }),
        },
      );

      setKeys((current) =>
        current.map((item) =>
          item.id === renameTarget.id ? response.key : item,
        ),
      );
      setRenameTarget(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("renameFailed"),
      );
    } finally {
      setIsDialogPending(false);
    }
  };

  const formatTimestamp = (value: string | null) =>
    value ? new Date(value).toLocaleString(locale) : t("table.never");

  const createKeyButton = (
    <Button
      type="button"
      variant="outline"
      size={isDialog ? "sm" : "default"}
      className={cn("shrink-0", mutedControlClassName)}
      onClick={() => setIsCreateOpen(true)}
    >
      <Plus />
      {t("createKey")}
    </Button>
  );

  return (
    <>
      <div className="space-y-3">
        {sectionHeading ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="min-w-0 text-xl font-semibold tracking-tight text-foreground">
                {sectionHeading.title}
              </h2>
              {createKeyButton}
            </div>
            <p className="text-sm text-muted-foreground">
              {sectionHeading.description}
            </p>
          </>
        ) : (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              omitCardTitle ? "justify-end" : "justify-between",
            )}
          >
            {omitCardTitle ? null : (
              <h3 className="text-lg font-semibold leading-none tracking-tight text-foreground">
                {isDialog ? t("dialogTitle") : t("pageTitle")}
              </h3>
            )}
            {createKeyButton}
          </div>
        )}

        {error ? (
          <Alert variant="destructive" className="border-destructive/20">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {rawKey ? (
          <div className="space-y-3 rounded-lg bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 text-sm text-muted-foreground">
                {t("copyShownOnce")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn("shrink-0", mutedControlClassName)}
                onClick={copyRawKey}
              >
                <Copy />
                {t("copyKey")}
              </Button>
            </div>
            <code className="block overflow-x-auto rounded-lg border border-border/60 bg-background px-3 py-2 text-xs text-foreground">
              {rawKey}
            </code>
          </div>
        ) : null}

        {keys.length === 0 ? (
          <div className="py-1 text-left text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
            <Table className={cn(isDialog ? "min-w-[760px]" : undefined)}>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="h-8 px-3 text-center text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    {t("table.name")}
                  </TableHead>
                  <TableHead className="h-8 px-3 text-center text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    {t("table.prefix")}
                  </TableHead>
                  <TableHead className="h-8 px-3 text-center text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    {t("table.status")}
                  </TableHead>
                  <TableHead className="h-8 px-3 text-center text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    {t("table.lastUsed")}
                  </TableHead>
                  <TableHead className="h-8 px-3 text-center text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    {t("table.created")}
                  </TableHead>
                  <TableHead className="h-8 px-3 text-center text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    {t("table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id} className="border-border/50">
                    <TableCell className="px-3 py-2.5 text-center font-medium">
                      {key.name}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-center">
                      <code className="inline-block rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-[12px] text-foreground/80">
                        {key.prefix}
                      </code>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-center">
                      <Badge
                        variant="outline"
                        className={
                          key.status === "active"
                            ? activeBadgeClassName
                            : summaryBadgeClassName
                        }
                      >
                        {t(`status.${key.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-center text-muted-foreground">
                      {formatTimestamp(key.lastUsedAt)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-center text-muted-foreground">
                      {formatTimestamp(key.createdAt)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={t("actions.rename")}
                          aria-label={t("actions.rename")}
                          onClick={() => setRenameTarget(key)}
                          disabled={pendingKeyId === key.id}
                        >
                          <Pencil />
                          <span className="sr-only">{t("actions.rename")}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={
                            key.status === "active"
                              ? t("actions.disable")
                              : t("actions.enable")
                          }
                          aria-label={
                            key.status === "active"
                              ? t("actions.disable")
                              : t("actions.enable")
                          }
                          onClick={() => toggleStatus(key)}
                          disabled={pendingKeyId === key.id}
                        >
                          <Power />
                          <span className="sr-only">
                            {key.status === "active"
                              ? t("actions.disable")
                              : t("actions.enable")}
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title={t("actions.delete")}
                          aria-label={t("actions.delete")}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteKey(key)}
                          disabled={pendingKeyId === key.id}
                        >
                          <Trash2 />
                          <span className="sr-only">{t("actions.delete")}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <KeyDialog
        mode="create"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        pending={isDialogPending}
        onSubmit={createKey}
      />
      <KeyDialog
        mode="rename"
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null);
          }
        }}
        initialName={renameTarget?.name}
        pending={isDialogPending}
        onSubmit={renameKey}
      />
    </>
  );
}
