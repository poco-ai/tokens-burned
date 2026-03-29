"use client";

import { useLocale, useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatDuration } from "@/lib/usage/format";
import type { UsageSessionRow } from "@/lib/usage/types";
import { CollapsibleSection } from "./collapsible-section";

type SessionsSectionProps = {
  sessions: UsageSessionRow[];
  timezone: string;
  defaultOpen?: boolean;
};

export function SessionsSection({
  sessions,
  timezone,
  defaultOpen = false,
}: SessionsSectionProps) {
  const locale = useLocale();
  const t = useTranslations("usage.sessions");

  return (
    <CollapsibleSection
      title={t("title")}
      description={t("description")}
      countLabel={t("count", { count: sessions.length })}
      defaultOpen={defaultOpen}
      contentClassName="pt-4"
    >
      {sessions.length === 0 ? (
        <div className="flex min-h-32 items-center rounded-xl border border-dashed px-4 text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.startedAt")}</TableHead>
                <TableHead>{t("table.tool")}</TableHead>
                <TableHead>{t("table.project")}</TableHead>
                <TableHead>{t("table.device")}</TableHead>
                <TableHead>{t("table.duration")}</TableHead>
                <TableHead className="text-right">
                  {t("table.messages")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="align-top">
                    <div className="font-medium">
                      {formatDateTime(session.firstMessageAt, timezone, locale)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("table.endedAt", {
                        value: formatDateTime(
                          session.lastMessageAt,
                          timezone,
                          locale,
                        ),
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="align-top font-medium">
                    {session.source}
                  </TableCell>
                  <TableCell
                    className="max-w-[220px] align-top"
                    title={session.projectLabel}
                  >
                    <div className="truncate font-medium">
                      {session.projectLabel}
                    </div>
                  </TableCell>
                  <TableCell
                    className="max-w-[200px] align-top"
                    title={session.deviceLabel}
                  >
                    <div className="truncate">{session.deviceLabel}</div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="font-medium">
                      {formatDuration(session.activeSeconds, { compact: true })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("table.totalDuration", {
                        value: formatDuration(session.durationSeconds, {
                          compact: true,
                        }),
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-right">
                    <div className="font-medium">
                      {session.messageCount.toLocaleString(locale)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("table.userMessages", {
                        value: session.userMessageCount.toLocaleString(locale),
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CollapsibleSection>
  );
}
