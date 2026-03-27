import type { ReactNode } from "react";

type UsagePageShellProps = {
  title?: string;
  lastSyncedText?: string;
  headerActions?: ReactNode;
  children: ReactNode;
};

export function UsagePageShell({
  title,
  lastSyncedText,
  headerActions,
  children,
}: UsagePageShellProps) {
  const hasHeader = Boolean(title || lastSyncedText || headerActions);

  return (
    <div className="flex flex-col gap-4">
      {hasHeader ? (
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            {title ? (
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {title}
              </h1>
            ) : null}
            {lastSyncedText ? (
              <p className="text-sm text-muted-foreground">{lastSyncedText}</p>
            ) : null}
          </div>

          {headerActions ? (
            <div className="flex items-center gap-2 self-start">
              {headerActions}
            </div>
          ) : null}
        </header>
      ) : null}

      {children}
    </div>
  );
}
