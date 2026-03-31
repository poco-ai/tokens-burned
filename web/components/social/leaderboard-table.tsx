import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type LeaderboardTableProps = {
  locale: string;
  title: string;
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
  emptyLabel,
  entries,
  viewerEntry = null,
  viewerNotice = null,
  labels,
}: LeaderboardTableProps) {
  const pinnedViewerEntry =
    viewerEntry && entries.every((entry) => entry.userId !== viewerEntry.userId)
      ? viewerEntry
      : null;
  const pinnedViewerNotice =
    !pinnedViewerEntry && viewerNotice ? viewerNotice : null;

  function renderEntryRow(entry: LeaderboardEntry, key: string) {
    return (
      <TableRow
        key={key}
        className={
          entry.isSelf && pinnedViewerEntry ? "bg-muted/30" : undefined
        }
      >
        <TableCell className="font-medium">#{entry.rank}</TableCell>
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
    <Card className="gap-0 py-3 shadow-sm ring-1 ring-border/60">
      <CardHeader className="border-b border-border/50 pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {entries.length === 0 && !pinnedViewerEntry && !pinnedViewerNotice ? (
          <div className="flex min-h-28 items-center rounded-xl border border-dashed px-4 text-sm text-muted-foreground">
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
