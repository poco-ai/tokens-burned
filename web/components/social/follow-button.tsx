"use client";

import { CheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";
import type { FollowTag, FollowTagSelectValue } from "@/lib/social/follow-tags";
import {
  followTags,
  fromFollowTagSelectValue,
  toFollowTagSelectValue,
} from "@/lib/social/follow-tags";
import { cn } from "@/lib/utils";

type FollowButtonProps = {
  locale: string;
  username: string;
  initialFollowing: boolean;
  initialTag?: FollowTag | null;
  isAuthenticated: boolean;
  isSelf?: boolean;
  canFollow?: boolean;
  size?: "sm" | "default";
};

export function FollowButton({
  locale,
  username,
  initialFollowing,
  initialTag = null,
  isAuthenticated,
  isSelf = false,
  canFollow = true,
  size = "default",
}: FollowButtonProps) {
  const router = useRouter();
  const t = useTranslations("social.profile");
  const tTags = useTranslations("social.tags");
  const tErrors = useTranslations("social.errors");
  const [following, setFollowing] = useState(initialFollowing);
  const [tag, setTag] = useState<FollowTag | null>(initialTag);
  const [isPending, startTransition] = useTransition();
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

  useEffect(() => {
    setTag(initialTag);
  }, [initialTag]);

  const handleFollowToggle = () => {
    startTransition(async () => {
      setError(null);

      try {
        const response = await fetch(
          `/api/social/follows/${encodeURIComponent(username)}`,
          {
            method: following ? "DELETE" : "POST",
          },
        );

        if (response.status === 401) {
          router.push(`/${locale}/login`);
          return;
        }

        if (!response.ok) {
          throw new Error(tErrors("followFailed"));
        }

        const nextFollowing = !following;
        setFollowing(nextFollowing);
        setTagMenuOpen(false);

        if (!nextFollowing) {
          setTag(null);
        }

        router.refresh();
      } catch {
        setError(tErrors("followFailed"));
      }
    });
  };

  const handleTagChange = (nextValue: FollowTagSelectValue) => {
    if (nextValue === toFollowTagSelectValue(tag)) {
      setTagMenuOpen(false);
      return;
    }

    startTransition(async () => {
      setError(null);
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

        setTag(nextTag);
        setTagMenuOpen(false);
        router.refresh();
      } catch {
        setError(tErrors("tagFailed"));
      }
    });
  };

  if (isSelf) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Button asChild type="button" size={size}>
        <Link href="/login">{t("followToLogin")}</Link>
      </Button>
    );
  }

  if (!canFollow && !following) {
    return null;
  }

  return (
    <div>
      {following ? (
        <div
          data-slot="button-group"
          className={cn(
            "inline-flex items-center overflow-hidden border border-border/60 bg-secondary text-secondary-foreground shadow-sm",
            size === "sm"
              ? "rounded-[min(var(--radius-md),12px)]"
              : "rounded-lg",
          )}
        >
          <button
            type="button"
            disabled={isPending}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors outline-none select-none hover:bg-secondary/80 focus-visible:bg-secondary/80 disabled:pointer-events-none disabled:opacity-50",
              size === "sm" ? "h-7 px-2.5 text-[0.8rem]" : "h-8 px-2.5 text-sm",
            )}
            onClick={handleFollowToggle}
          >
            {t("followingAction")}
          </button>
          <Popover open={tagMenuOpen} onOpenChange={setTagMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={isPending}
                aria-label={tTags("selectLabel")}
                className={cn(
                  "inline-flex items-center justify-center border-l border-border/60 transition-colors outline-none select-none hover:bg-secondary/80 focus-visible:bg-secondary/80 disabled:pointer-events-none disabled:opacity-50",
                  size === "sm" ? "size-7" : "size-8",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "block h-0 w-0 border-x-[4px] border-x-transparent border-t-[5px] border-t-current opacity-70",
                    size === "sm" && "border-x-[3.5px] border-t-[4px]",
                  )}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1">
              <div className="space-y-0.5">
                {(["none", ...followTags] as const).map((value) => {
                  const isSelected = value === toFollowTagSelectValue(tag);
                  const label =
                    value === "none"
                      ? tTags("none")
                      : tTags(`options.${value}`);

                  return (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-accent text-accent-foreground",
                      )}
                      onClick={() => handleTagChange(value)}
                      disabled={isPending}
                    >
                      <CheckIcon
                        className={cn(
                          "size-4",
                          isSelected
                            ? "text-accent-foreground opacity-100"
                            : "text-muted-foreground opacity-0",
                        )}
                      />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <Button
          type="button"
          size={size}
          variant="default"
          disabled={isPending}
          onClick={handleFollowToggle}
        >
          {t("follow")}
        </Button>
      )}

      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
