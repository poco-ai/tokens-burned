"use client";

import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSocialFollow } from "@/hooks/use-social-follow";
import { Link } from "@/i18n/navigation";
import type { FollowTag } from "@/lib/social/follow-tags";
import { followTags, toFollowTagSelectValue } from "@/lib/social/follow-tags";
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
  const t = useTranslations("social.profile");
  const tTags = useTranslations("social.tags");
  const {
    following,
    tag,
    isPending,
    tagMenuOpen,
    setTagMenuOpen,
    error,
    handleFollowToggle,
    handleTagChange,
  } = useSocialFollow({
    locale,
    username,
    initialFollowing,
    initialTag,
  });

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
