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

type ProfileFollowActionProps = {
  locale: string;
  username: string;
  initialFollowing: boolean;
  initialTag?: FollowTag | null;
  isAuthenticated: boolean;
  canFollow?: boolean;
};

/**
 * Full-width follow control for the public profile sidebar, aligned with
 * the “Edit profile” outline button (same width and visual weight).
 */
export function ProfileFollowAction({
  locale,
  username,
  initialFollowing,
  initialTag = null,
  isAuthenticated,
  canFollow = true,
}: ProfileFollowActionProps) {
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

  if (!isAuthenticated) {
    return (
      <Button asChild className="w-full" type="button" variant="outline">
        <Link href="/login">{t("followToLogin")}</Link>
      </Button>
    );
  }

  if (!canFollow && !following) {
    return null;
  }

  return (
    <div className="w-full">
      {following ? (
        <div
          className={cn(
            "flex w-full items-stretch overflow-hidden rounded-lg border border-border/60 bg-secondary text-secondary-foreground shadow-sm",
          )}
        >
          <button
            type="button"
            disabled={isPending}
            className="inline-flex min-h-8 min-w-0 flex-1 items-center justify-center px-3 text-sm font-medium transition-colors outline-none select-none hover:bg-secondary/80 focus-visible:bg-secondary/80 disabled:pointer-events-none disabled:opacity-50"
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
                className="inline-flex w-10 shrink-0 items-center justify-center border-l border-border/60 transition-colors outline-none select-none hover:bg-secondary/80 focus-visible:bg-secondary/80 disabled:pointer-events-none disabled:opacity-50"
              >
                <span
                  aria-hidden="true"
                  className="block h-0 w-0 border-x-[4px] border-x-transparent border-t-[5px] border-t-current opacity-70"
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
          className="w-full"
          type="button"
          variant="outline"
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
