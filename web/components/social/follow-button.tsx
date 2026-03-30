"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import {
  type FollowTag,
  type FollowTagSelectValue,
  followTags,
  fromFollowTagSelectValue,
  toFollowTagSelectValue,
} from "@/lib/social/follow-tags";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

  useEffect(() => {
    setTag(initialTag);
  }, [initialTag]);

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
    <div className="flex flex-col gap-2">
      <div className="flex flex-nowrap items-center gap-2">
        <Button
          type="button"
          size={size}
          variant={following ? "secondary" : "default"}
          disabled={isPending}
          className="shrink-0"
          onClick={() => {
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

                setFollowing(!following);
                setTag(null);
                router.refresh();
              } catch {
                setError(tErrors("followFailed"));
              }
            });
          }}
        >
          {following ? t("followingAction") : t("follow")}
        </Button>

        {following ? (
          <Select
            value={toFollowTagSelectValue(tag)}
            onValueChange={(nextValue) => {
              startTransition(async () => {
                setError(null);

                const nextTag = fromFollowTagSelectValue(
                  nextValue as FollowTagSelectValue,
                );

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
                  router.refresh();
                } catch {
                  setError(tErrors("tagFailed"));
                }
              });
            }}
            disabled={isPending}
          >
            <SelectTrigger
              aria-label={tTags("selectLabel")}
              size={size}
              className="min-w-[132px] shrink-0 bg-background"
            >
              <SelectValue placeholder={tTags("none")} />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="none">{tTags("none")}</SelectItem>
              {followTags.map((value) => (
                <SelectItem key={value} value={value}>
                  {tTags(`options.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
