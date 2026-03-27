import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type EmptyStateProps = {
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
};

export async function EmptyState({
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  const t = await getTranslations("usage.emptyState");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
        <ol className="list-decimal space-y-2 pl-5">
          <li>{t("step1")}</li>
          <li>{t("step2", { command: "tokens-burned init" })}</li>
          <li>{t("step3")}</li>
        </ol>

        <div className="flex flex-wrap gap-2">
          {primaryAction}
          {secondaryAction}
        </div>
      </CardContent>
    </Card>
  );
}
