"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatDateTime,
  formatTokenCount,
  formatUsdAmount,
} from "@/lib/usage/format";
import type { UsageSessionRow } from "@/lib/usage/types";
import { CollapsibleSection } from "./collapsible-section";

const PAGE_SIZE = 20;

function buildPageRange(
  current: number,
  total: number,
): ({ type: "ellipsis"; key: string } | { type: "page"; value: number })[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => ({
      type: "page" as const,
      value: i + 1,
    }));
  }
  const pages: (
    | { type: "ellipsis"; key: string }
    | { type: "page"; value: number }
  )[] = [{ type: "page", value: 1 }];
  if (current > 3) {
    pages.push({ type: "ellipsis", key: "start" });
  }
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push({ type: "page", value: i });
  }
  if (current < total - 2) {
    pages.push({ type: "ellipsis", key: "end" });
  }
  pages.push({ type: "page", value: total });
  return pages;
}

type SessionsSectionProps = {
  sessions: UsageSessionRow[];
  timezone: string;
  defaultOpen?: boolean;
};

export function SessionsSection({
  sessions,
  timezone,
  defaultOpen = true,
}: SessionsSectionProps) {
  const locale = useLocale();
  const t = useTranslations("usage.sessions");

  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  const [page, setPage] = useState(1);
  const clampedPage = Math.min(page, totalPages);

  const pagedSessions = useMemo(
    () =>
      sessions.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE),
    [sessions, clampedPage],
  );

  const pages = useMemo(
    () => buildPageRange(clampedPage, totalPages),
    [clampedPage, totalPages],
  );

  return (
    <CollapsibleSection
      title={t("title")}
      description={t("description")}
      defaultOpen={defaultOpen}
      contentClassName="pt-5"
    >
      {sessions.length === 0 ? (
        <div className="flex min-h-32 items-center rounded-xl border border-dashed px-4 text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border/60">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">
                    {t("table.startedAt")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("table.tool")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("table.model")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("table.project")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("table.device")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("table.tokens")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("table.cost")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="align-top">
                      <div className="font-medium">
                        {formatDateTime(
                          session.firstMessageAt,
                          timezone,
                          locale,
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top font-medium">
                      {session.source}
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] align-top"
                      title={session.primaryModel}
                    >
                      <div className="truncate font-medium">
                        {session.primaryModel}
                      </div>
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
                    <TableCell className="align-top text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help font-medium">
                            {formatTokenCount(session.totalTokens, locale)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent align="end" side="left">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <div className="text-muted-foreground">
                              {t("table.input")}
                            </div>
                            <div className="text-right font-medium">
                              {formatTokenCount(session.inputTokens, locale)}
                            </div>
                            <div className="text-muted-foreground">
                              {t("table.output")}
                            </div>
                            <div className="text-right font-medium">
                              {formatTokenCount(session.outputTokens, locale)}
                            </div>
                            {session.reasoningTokens > 0 && (
                              <>
                                <div className="text-muted-foreground">
                                  {t("table.reasoning")}
                                </div>
                                <div className="text-right font-medium">
                                  {formatTokenCount(
                                    session.reasoningTokens,
                                    locale,
                                  )}
                                </div>
                              </>
                            )}
                            {session.cachedTokens > 0 && (
                              <>
                                <div className="text-muted-foreground">
                                  {t("table.cache")}
                                </div>
                                <div className="text-right font-medium">
                                  {formatTokenCount(
                                    session.cachedTokens,
                                    locale,
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      {session.estimatedCostUsd != null
                        ? formatUsdAmount(session.estimatedCostUsd, locale)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text={t("pagination.prev")}
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        if (clampedPage > 1) setPage(clampedPage - 1);
                      }}
                      className={
                        clampedPage <= 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {pages.map((p) =>
                    p.type === "ellipsis" ? (
                      <PaginationItem key={p.key}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p.value}>
                        <PaginationLink
                          href="#"
                          isActive={p.value === clampedPage}
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            if (p.value !== clampedPage) setPage(p.value);
                          }}
                          className="cursor-pointer"
                        >
                          {p.value}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text={t("pagination.next")}
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        if (clampedPage < totalPages) setPage(clampedPage + 1);
                      }}
                      className={
                        clampedPage >= totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </CollapsibleSection>
  );
}
