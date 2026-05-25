"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type RouteErrorCardProps = {
  title?: string;
  description?: string;
  retryLabel?: string;
  error: Error & { digest?: string };
  reset: () => void;
};

export function RouteErrorCard({
  title = "Something went wrong",
  description = "The page could not load. Please try again.",
  retryLabel = "Try again",
  error,
  reset,
}: RouteErrorCardProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <Card className="mx-auto mt-16 max-w-lg border-destructive/20 bg-card shadow-sm">
        <CardContent className="space-y-4 p-6 text-center">
          <div className="space-y-2">
            <h1 className="font-semibold text-foreground text-lg tracking-tight">
              {title}
            </h1>
            <p className="text-muted-foreground text-sm leading-6">
              {description}
            </p>
          </div>
          <Button type="button" onClick={reset}>
            {retryLabel}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
