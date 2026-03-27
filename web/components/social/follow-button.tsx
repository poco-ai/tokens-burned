"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type FollowButtonProps = {
  locale: string;
  username: string;
  initialFollowing: boolean;
  isAuthenticated: boolean;
  isSelf?: boolean;
  canFollow?: boolean;
  size?: "sm" | "default";
};

export function FollowButton({
  locale,
  username,
  initialFollowing,
  isAuthenticated,
  isSelf = false,
  canFollow = true,
  size = "default",
}: FollowButtonProps) {
  const router = useRouter();
  const t = useTranslations("social.profile");
  const tErrors = useTranslations("social.errors");
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-2">
      <Button
        type="button"
        size={size}
        variant={following ? "secondary" : "default"}
        disabled={isPending}
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
              router.refresh();
            } catch {
              setError(tErrors("followFailed"));
            }
          });
        }}
      >
        {following ? t("followingAction") : t("follow")}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
