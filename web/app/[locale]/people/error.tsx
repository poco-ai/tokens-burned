"use client";

import { RouteErrorCard } from "@/components/app/route-error-card";

export default function PeopleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorCard error={error} reset={reset} />;
}
