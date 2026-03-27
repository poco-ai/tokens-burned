export default function PublicProfileLoading() {
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {["metric-a", "metric-b", "metric-c", "metric-d"].map((key) => (
              <div
                key={key}
                className="h-24 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="h-56 animate-pulse rounded-xl bg-muted" />
            <div className="h-56 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    </main>
  );
}
