"use client";

import { RouteErrorCard } from "@/components/app/route-error-card";

export default function UsageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorCard error={error} reset={reset} />;
}
