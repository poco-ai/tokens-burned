"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export type SettingsPageHeaderViewer = {
  name: string | null;
  email: string;
  image: string | null;
  username: string | null;
};

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

function formatHeaderTitle(name: string | null, username: string | null) {
  const n = name?.trim();
  const u = username?.trim();
  if (n && u) {
    return `${n} (${u})`;
  }
  if (n) {
    return n;
  }
  if (u) {
    return `@${u}`;
  }
  return "";
}

export function SettingsPageHeader({
  viewer,
}: {
  viewer: SettingsPageHeaderViewer;
}) {
  const t = useTranslations("usage.settings");
  const title =
    formatHeaderTitle(viewer.name, viewer.username) ||
    viewer.email.split("@")[0]?.trim() ||
    viewer.email;
  const identityForInitial =
    viewer.name?.trim() || viewer.username || viewer.email;
  const imageFailedRef = useRef(false);
  const [, forceUpdate] = useState(0);
  const profileUsername = viewer.username?.trim();
  const homeHref = profileUsername
    ? `/u/${encodeURIComponent(profileUsername)}`
    : "/";

  return (
    <header className="mb-3 px-4 pb-6 pt-1 sm:mb-4 sm:px-5 sm:pb-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {viewer.image && !imageFailedRef.current ? (
            <Image
              src={viewer.image}
              alt=""
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-full object-cover"
              onError={() => {
                imageFailedRef.current = true;
                forceUpdate((n) => n + 1);
              }}
              unoptimized
            />
          ) : (
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
              {getInitial(identityForInitial)}
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">
              {title}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("headerSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={homeHref}>{t("goHome")}</Link>
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/usage">{t("goDashboard")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
