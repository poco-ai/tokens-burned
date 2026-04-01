import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import type { LeaderboardEntry } from "@/lib/leaderboard/types";
import {
  formatDuration,
  formatTokenCount,
  formatUsdAmount,
} from "@/lib/usage/format";
import { cn } from "@/lib/utils";

type LeaderboardTableProps = {
  locale: string;
  title: string;
  /** Shown on the right side of the card header (e.g. date range). */
  headerRight?: ReactNode;
  /** When true, empty state is plain text without a dashed border. */
  emptyPlain?: boolean;
  emptyLabel: string;
  entries: LeaderboardEntry[];
  viewerEntry?: LeaderboardEntry | null;
  viewerNotice?: {
    name: string;
    username: string;
    message: string;
    action?: ReactNode;
  } | null;
  labels: {
    rank: string;
    user: string;
    totalTokens: string;
    estimatedCost: string;
    activeTime: string;
    sessions: string;
    followers: string;
    mutual: string;
    you: string;
  };
};

export function LeaderboardTable({
  locale,
  title,
  headerRight = null,
  emptyPlain = false,
  emptyLabel,
  entries,
  viewerEntry = null,
  viewerNotice = null,
  labels,
}: LeaderboardTableProps) {
  function getTopRankRowClass(rank: number) {
    if (rank === 1) {
      return "bg-amber-50/80 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/40";
    }
    if (rank === 2) {
      return "bg-slate-100/80 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800/70";
    }
    if (rank === 3) {
      return "bg-orange-100/70 hover:bg-orange-100 dark:bg-orange-900/30 dark:hover:bg-orange-900/40";
    }
    return "";
  }

  function getTopRankMedal(rank: number) {
    if (rank === 1) {
      return "🥇";
    }
    if (rank === 2) {
      return "🥈";
    }
    if (rank === 3) {
      return "🥉";
    }
    return null;
  }

  const pinnedViewerEntry =
    viewerEntry && entries.every((entry) => entry.userId !== viewerEntry.userId)
      ? viewerEntry
      : null;
  const pinnedViewerNotice =
    !pinnedViewerEntry && viewerNotice ? viewerNotice : null;

  function renderEntryRow(entry: LeaderboardEntry, key: string) {
    const topRankMedal = getTopRankMedal(entry.rank);
    const rowClasses = [
      entry.isSelf && pinnedViewerEntry ? "bg-muted/30" : "",
      getTopRankRowClass(entry.rank),
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <TableRow key={key} className={rowClasses || undefined}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {topRankMedal ? (
              <span className="text-base leading-none" aria-hidden="true">
                {topRankMedal}
              </span>
            ) : (
              <span>#{entry.rank}</span>
            )}
          </div>
        </TableCell>
        <TableCell className="min-w-64">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link
              href={`/u/${entry.username}`}
              className="truncate font-medium text-foreground hover:underline"
            >
              {entry.name}
            </Link>
            <span className="text-sm text-muted-foreground">
              @{entry.username}
            </span>
            {entry.isSelf ? (
              <Badge variant="outline">{labels.you}</Badge>
            ) : null}
            {entry.isFollowing && entry.followsYou ? (
              <Badge variant="secondary">{labels.mutual}</Badge>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatTokenCount(entry.totalTokens)}
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatUsdAmount(entry.estimatedCostUsd, locale)}
        </TableCell>
        <TableCell className="text-right text-muted-foreground">
          {formatDuration(entry.activeSeconds)}
        </TableCell>
        <TableCell className="text-right text-muted-foreground">
          {entry.sessions.toLocaleString(locale)}
        </TableCell>
        <TableCell className="text-right text-muted-foreground">
          {entry.followerCount.toLocaleString(locale)}
        </TableCell>
      </TableRow>
    );
  }

  function renderViewerNoticeRow() {
    if (!pinnedViewerNotice) {
      return null;
    }

    return (
      <TableRow
        key={`${pinnedViewerNotice.username}-viewer-notice`}
        className="bg-muted/30"
      >
        <TableCell className="font-medium text-muted-foreground">-</TableCell>
        <TableCell className="min-w-64">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link
              href={`/u/${pinnedViewerNotice.username}`}
              className="truncate font-medium text-foreground hover:underline"
            >
              {pinnedViewerNotice.name}
            </Link>
            <span className="text-sm text-muted-foreground">
              @{pinnedViewerNotice.username}
            </span>
            <Badge variant="outline">{labels.you}</Badge>
          </div>
        </TableCell>
        <TableCell
          colSpan={5}
          className="text-right text-sm text-muted-foreground"
        >
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span>{pinnedViewerNotice.message}</span>
            {pinnedViewerNotice.action ?? null}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden p-0 shadow-sm ring-1 ring-border/60">
      <header className="flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border/60 bg-muted/40 px-4 py-2.5 dark:bg-muted/25">
        <CardTitle className="min-w-0 leading-tight">{title}</CardTitle>
        {headerRight ? (
          <div className="flex shrink-0 items-center">{headerRight}</div>
        ) : null}
      </header>
      <CardContent className="px-4 pb-3 pt-3">
        {entries.length === 0 && !pinnedViewerEntry && !pinnedViewerNotice ? (
          <div
            className={cn(
              "flex min-h-28 items-center text-sm text-muted-foreground",
              emptyPlain ? "py-1" : "rounded-xl border border-dashed px-4",
            )}
          >
            {emptyLabel}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{labels.rank}</TableHead>
                <TableHead>{labels.user}</TableHead>
                <TableHead className="text-right">
                  {labels.totalTokens}
                </TableHead>
                <TableHead className="text-right">
                  {labels.estimatedCost}
                </TableHead>
                <TableHead className="text-right">
                  {labels.activeTime}
                </TableHead>
                <TableHead className="text-right">{labels.sessions}</TableHead>
                <TableHead className="text-right">{labels.followers}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => renderEntryRow(entry, entry.userId))}
              {pinnedViewerEntry ? (
                <>
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={7}
                      className="py-1 text-center text-muted-foreground"
                    >
                      ...
                    </TableCell>
                  </TableRow>
                  {renderEntryRow(
                    pinnedViewerEntry,
                    `${pinnedViewerEntry.userId}-viewer`,
                  )}
                </>
              ) : null}
              {pinnedViewerNotice ? (
                <>
                  {entries.length > 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={7}
                        className="py-1 text-center text-muted-foreground"
                      >
                        ...
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {renderViewerNoticeRow()}
                </>
              ) : null}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
