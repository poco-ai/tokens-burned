import type { ReactNode } from "react";

type UsagePageShellProps = {
  title: string;
  lastSyncedText: string;
  headerActions?: ReactNode;
  children: ReactNode;
};

export function UsagePageShell({
  title,
  lastSyncedText,
  headerActions,
  children,
}: UsagePageShellProps) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{lastSyncedText}</p>
          </div>
        </div>

        {headerActions ? (
          <div className="flex items-center gap-2 self-start">
            {headerActions}
          </div>
        ) : null}
      </header>

      {children}
    </div>
  );
}
