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
import { formatDuration, formatTokenCount } from "@/lib/usage/format";

type LeaderboardTableProps = {
  locale: string;
  title: string;
  emptyLabel: string;
  entries: LeaderboardEntry[];
  labels: {
    rank: string;
    user: string;
    totalTokens: string;
    activeTime: string;
    sessions: string;
    followers: string;
    mutual: string;
    you: string;
    viewProfile: string;
  };
};

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

export function LeaderboardTable({
  locale,
  title,
  emptyLabel,
  entries,
  labels,
}: LeaderboardTableProps) {
  return (
    <Card className="shadow-sm ring-1 ring-border/60">
      <CardHeader className="border-b border-border/50 pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {entries.length === 0 ? (
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
                  {labels.activeTime}
                </TableHead>
                <TableHead className="text-right">{labels.sessions}</TableHead>
                <TableHead className="text-right">{labels.followers}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.userId}>
                  <TableCell className="font-medium">#{entry.rank}</TableCell>
                  <TableCell className="min-w-64">
                    <div className="flex min-w-0 items-start gap-3">
                      {entry.image ? (
                        /* biome-ignore lint/performance/noImgElement: user avatars may come from arbitrary remote URLs */
                        <img
                          src={entry.image}
                          alt={entry.name}
                          className="mt-0.5 size-10 shrink-0 rounded-full border border-border/60 object-cover"
                        />
                      ) : (
                        <div className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted text-sm font-semibold text-foreground">
                          {getInitial(entry.username)}
                        </div>
                      )}

                      <div className="min-w-0 space-y-1">
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
                        {entry.bio ? (
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {entry.bio}
                          </p>
                        ) : null}
                        <div className="text-xs text-muted-foreground">
                          <Link
                            href={`/u/${entry.username}`}
                            className="hover:text-foreground hover:underline"
                          >
                            {labels.viewProfile}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatTokenCount(entry.totalTokens)}
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
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
