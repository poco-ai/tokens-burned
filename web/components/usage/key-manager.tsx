"use client";

import { Copy, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { summarizeUsageKeys } from "@/lib/usage/settings-view";
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
};

export function KeyManager({ initialKeys, variant = "page" }: KeyManagerProps) {
  const [keys, setKeys] = useState(initialKeys);
  const [error, setError] = useState<string | null>(null);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<UsageKeyRecord | null>(null);
  const [pendingKeyId, setPendingKeyId] = useState<string | null>(null);
  const [isDialogPending, setIsDialogPending] = useState(false);
  const summary = summarizeUsageKeys(keys);
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
      throw new Error(payload.error ?? "Request failed.");
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
      setError(
        "Unable to copy the key automatically. Please copy it manually.",
      );
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
          : "Unable to update the key.",
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
          : "Unable to delete the key.",
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
          : "Unable to create the key.",
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
          : "Unable to rename the key.",
      );
    } finally {
      setIsDialogPending(false);
    }
  };

  const formatTimestamp = (value: string | null) =>
    value ? new Date(value).toLocaleString() : "Never";

  return (
    <>
      <Card
        size="sm"
        className="gap-0 bg-background/90 shadow-sm ring-1 ring-border/60"
      >
        <CardHeader className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-2">
          <CardTitle>{isDialog ? "API Keys" : "CLI API Keys"}</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-1.5">
            <Badge
              variant="outline"
              className="border-border/70 bg-background/70 text-muted-foreground"
            >
              {summary.total} total
            </Badge>
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            >
              {summary.active} active
            </Badge>
          </div>
          <Button
            type="button"
            size={isDialog ? "sm" : "default"}
            className="ml-auto"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus />
            Create key
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          {error ? (
            <Alert variant="destructive" className="border-destructive/20">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {rawKey ? (
            <Alert className="border-amber-500/20 bg-amber-500/5">
              <AlertDescription className="space-y-3">
                <div className="space-y-1">
                  <div className="font-medium text-foreground">New key</div>
                  <div>Copy it now. It will only be shown once.</div>
                </div>
                <code className="block overflow-x-auto rounded-lg border border-border/60 bg-background/90 px-3 py-2 text-xs text-foreground">
                  {rawKey}
                </code>
                <Button type="button" variant="outline" onClick={copyRawKey}>
                  <Copy />
                  Copy key
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border/60 bg-background/70">
            <Table className={cn(isDialog ? "min-w-[760px]" : undefined)}>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="h-8 px-3 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Name
                  </TableHead>
                  <TableHead className="h-8 px-3 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Prefix
                  </TableHead>
                  <TableHead className="h-8 px-3 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Status
                  </TableHead>
                  <TableHead className="h-8 px-3 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Last Used
                  </TableHead>
                  <TableHead className="h-8 px-3 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Created
                  </TableHead>
                  <TableHead className="h-8 px-3 text-right text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id} className="border-border/50">
                    <TableCell className="px-3 py-2.5 font-medium">
                      {key.name}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <code className="rounded-md border border-border/50 bg-muted/35 px-2 py-1 text-[12px] text-foreground/80">
                        {key.prefix}
                      </code>
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <Badge
                        variant={
                          key.status === "active" ? "secondary" : "outline"
                        }
                        className={
                          key.status === "active"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-border/70 text-muted-foreground"
                        }
                      >
                        {key.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-muted-foreground">
                      {formatTimestamp(key.lastUsedAt)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-muted-foreground">
                      {formatTimestamp(key.createdAt)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="Rename key"
                          aria-label="Rename key"
                          onClick={() => setRenameTarget(key)}
                          disabled={pendingKeyId === key.id}
                        >
                          <Pencil />
                          <span className="sr-only">Rename key</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title={
                            key.status === "active"
                              ? "Disable key"
                              : "Enable key"
                          }
                          aria-label={
                            key.status === "active"
                              ? "Disable key"
                              : "Enable key"
                          }
                          onClick={() => toggleStatus(key)}
                          disabled={pendingKeyId === key.id}
                        >
                          <Power />
                          <span className="sr-only">
                            {key.status === "active"
                              ? "Disable key"
                              : "Enable key"}
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="Delete key"
                          aria-label="Delete key"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteKey(key)}
                          disabled={pendingKeyId === key.id}
                        >
                          <Trash2 />
                          <span className="sr-only">Delete key</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
