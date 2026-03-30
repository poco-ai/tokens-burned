"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UsageEmptyCopyableCommandProps = {
  command: string;
};

export function UsageEmptyCopyableCommand({
  command,
}: UsageEmptyCopyableCommandProps) {
  const t = useTranslations("usage.emptyState");
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [command]);

  return (
    <div
      className={cn(
        "flex min-h-[2.75rem] items-stretch overflow-hidden rounded-lg border border-border/60 bg-muted/50",
        "ring-offset-background focus-within:ring-2 focus-within:ring-ring/50 focus-within:ring-offset-2",
      )}
    >
      <button
        type="button"
        onClick={copy}
        className="min-w-0 flex-1 px-3 py-2.5 text-left font-mono text-xs leading-relaxed text-foreground transition-colors hover:bg-muted/80"
        aria-label={t("copyCommand")}
      >
        <code className="block whitespace-pre-wrap break-all">{command}</code>
      </button>
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        onClick={copy}
        className="h-auto shrink-0 rounded-none border-l border-border/60 bg-muted/50 px-2.5 hover:bg-muted"
        aria-label={t("copyCommand")}
        title={t("copyCommand")}
      >
        {copied ? (
          <Check
            className="size-4 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}
