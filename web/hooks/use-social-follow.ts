"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import type { FollowTag, FollowTagSelectValue } from "@/lib/social/follow-tags";
import {
  fromFollowTagSelectValue,
  toFollowTagSelectValue,
} from "@/lib/social/follow-tags";

type UseSocialFollowArgs = {
  locale: string;
  username: string;
  initialFollowing: boolean;
  initialTag?: FollowTag | null;
};

export function useSocialFollow({
  locale,
  username,
  initialFollowing,
  initialTag = null,
}: UseSocialFollowArgs) {
  const router = useRouter();
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

  return {
    following,
    tag,
    isPending,
    tagMenuOpen,
    setTagMenuOpen,
    error,
    handleFollowToggle,
    handleTagChange,
  };
}
