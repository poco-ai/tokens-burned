"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { GitHubRepoLink } from "@/components/shared/github-repo-link";

type AppFooterProps = {
  actions?: ReactNode;
};

export function AppFooter({ actions }: AppFooterProps) {
  const t = useTranslations("common");
  const year = new Date().getFullYear();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

  return (
    <footer className="mt-auto">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-3 px-4 py-6 text-sm text-white sm:grid-cols-3 sm:px-6 lg:px-8">
        <p className="self-center text-center sm:text-left">
          {t("footerCopyright", { year })}
        </p>
        <p className="self-center text-center text-sm text-white/75">
          {t("footerVersion", { version: appVersion })}
        </p>
        <div className="flex shrink-0 self-center items-center justify-center gap-2 sm:justify-end">
          {actions}
          <GitHubRepoLink />
        </div>
      </div>
    </footer>
  );
}
