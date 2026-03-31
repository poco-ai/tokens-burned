"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FollowTag, FollowTagSelectValue } from "@/lib/social/follow-tags";
import { followTags, fromFollowTagSelectValue } from "@/lib/social/follow-tags";
import { cn } from "@/lib/utils";

type FollowTagBadgeProps = {
  locale: string;
  username: string;
  tag: FollowTag | null;
};

export function FollowTagBadge({ locale, username, tag }: FollowTagBadgeProps) {
  const router = useRouter();
  const tTags = useTranslations("social.tags");
  const tErrors = useTranslations("social.errors");
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleTagChange = (nextValue: FollowTagSelectValue) => {
    startTransition(async () => {
      const nextTag = fromFollowTagSelectValue(nextValue);

      try {
        const response = await fetch(
          `/api/social/follows/${encodeURIComponent(username)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tag: nextTag,
            }),
          },
        );

        if (response.status === 401) {
          router.push(`/${locale}/login`);
          return;
        }

        if (!response.ok) {
          throw new Error(tErrors("tagFailed"));
        }

        setOpen(false);
        router.refresh();
      } catch {
        // Silently fail - user can retry
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="secondary"
          className="cursor-pointer hover:bg-secondary/80"
        >
          {tag ? tTags(`options.${tag}`) : tTags("none")}
        </Badge>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-40 p-1">
        <div className="space-y-0.5">
          <button
            type="button"
            className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleTagChange("none")}
            disabled={isPending}
          >
            {tTags("none")}
          </button>
          {followTags.map((value) => (
            <button
              key={value}
              type="button"
              className={cn(
                "w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                tag === value && "bg-accent",
              )}
              onClick={() => handleTagChange(value)}
              disabled={isPending}
            >
              {tTags(`options.${value}`)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
