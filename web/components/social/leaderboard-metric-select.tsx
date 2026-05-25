"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";

type LeaderboardMetricSelectProps = {
  value: string;
  defaultValue: string;
  ariaLabel: string;
  options: Array<{
    value: string;
    label: string;
  }>;
};

function buildLeaderboardHref(
  pathname: string,
  searchParams: URLSearchParams,
  metric: string,
  defaultValue: string,
) {
  const nextParams = new URLSearchParams(searchParams.toString());

  if (metric === defaultValue) {
    nextParams.delete("metric");
  } else {
    nextParams.set("metric", metric);
  }

  const query = nextParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function LeaderboardMetricSelectInner({
  value,
  defaultValue,
  ariaLabel,
  options,
}: LeaderboardMetricSelectProps) {
  const { replace } = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (nextValue: string) => {
      if (nextValue === value) {
        return;
      }

      replace(
        buildLeaderboardHref(
          pathname,
          new URLSearchParams(searchParams.toString()),
          nextValue,
          defaultValue,
        ),
      );
    },
    [defaultValue, pathname, replace, searchParams, value],
  );

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        size="default"
        className="h-8 min-w-[148px] bg-background"
      >
        <SelectValue placeholder={ariaLabel} />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LeaderboardMetricSelect(props: LeaderboardMetricSelectProps) {
  return (
    <Suspense fallback={null}>
      <LeaderboardMetricSelectInner {...props} />
    </Suspense>
  );
}
