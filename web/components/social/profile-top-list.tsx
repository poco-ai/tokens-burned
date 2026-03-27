import { formatPercentage, formatTokenCount } from "@/lib/usage/format";
import { cn } from "@/lib/utils";

type ProfileTopListProps =
  | {
      locale: string;
      items: Array<{
        name: string;
        count: number;
        share: number;
      }>;
      mode: "count";
      emptyLabel: string;
    }
  | {
      locale: string;
      items: Array<{
        name: string;
        totalTokens: number;
        share: number;
      }>;
      mode: "tokens";
      emptyLabel: string;
    };

export function ProfileTopList(props: ProfileTopListProps) {
  if (props.items.length === 0) {
    return <p className="text-sm text-muted-foreground">{props.emptyLabel}</p>;
  }

  if (props.mode === "count") {
    return (
      <div className="space-y-3">
        {props.items.map((item) => (
          <div key={item.name} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0 truncate font-medium">{item.name}</div>
              <div className="shrink-0 text-xs text-muted-foreground">
                {item.count} · {formatPercentage(item.share, props.locale)}
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full bg-foreground/80 transition-[width]",
                  item.share === 0 ? "w-0" : undefined,
                )}
                style={{
                  width: `${Math.max(item.share * 100, item.share > 0 ? 8 : 0)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {props.items.map((item) => (
        <div key={item.name} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0 truncate font-medium">{item.name}</div>
            <div className="shrink-0 text-xs text-muted-foreground">
              {formatTokenCount(item.totalTokens)} ·{" "}
              {formatPercentage(item.share, props.locale)}
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full bg-foreground/80 transition-[width]",
                item.share === 0 ? "w-0" : undefined,
              )}
              style={{
                width: `${Math.max(item.share * 100, item.share > 0 ? 8 : 0)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
