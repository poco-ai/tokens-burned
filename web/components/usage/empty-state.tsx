import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  USAGE_EMPTY_INIT_COMMAND,
  USAGE_EMPTY_INSTALL_COMMAND,
} from "@/lib/usage/usage-empty-guide";

import { UsageEmptyCopyableCommand } from "./usage-empty-copyable-command";

type EmptyStateProps = {
  /** Placed after step 1 copy (e.g. create API key CTA). */
  step1Action: ReactNode;
};

export async function EmptyState({ step1Action }: EmptyStateProps) {
  const t = await getTranslations("usage.emptyState");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
        <ol className="list-inside list-decimal space-y-3 pl-6 sm:pl-8">
          <li className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="min-w-0 flex-1">{t("step1")}</span>
              <div className="shrink-0 [&_a]:inline-flex">{step1Action}</div>
            </div>
          </li>

          <li className="space-y-2">
            <div>{t("step2")}</div>
            <UsageEmptyCopyableCommand command={USAGE_EMPTY_INSTALL_COMMAND} />
          </li>

          <li className="space-y-2">
            <div>{t("step3")}</div>
            <UsageEmptyCopyableCommand command={USAGE_EMPTY_INIT_COMMAND} />
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
