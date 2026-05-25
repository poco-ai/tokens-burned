"use client";

import { Key, Shield, SlidersHorizontal, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import type { LoginProvider } from "@/lib/auth-providers";
import {
  type PreferenceNoticeDetail,
  preferenceNoticeEventName,
} from "@/lib/usage/preference-notice";
import {
  type SettingsSectionId,
  settingsSectionToPath,
} from "@/lib/usage/settings-routes";
import type { ProjectMode } from "@/lib/usage/types";
import { cn } from "@/lib/utils";
import { AccountIdentityCard } from "./account-identity-card";
import { ConnectedAccountsCard } from "./connected-accounts-card";
import { KeyManager, type UsageKeyRecord } from "./key-manager";
import {
  SettingsPageHeader,
  type SettingsPageHeaderViewer,
} from "./settings-page-header";
import { SettingsPreferences } from "./settings-preferences";

type SettingsPreferenceState = {
  timezone: string;
  projectMode: ProjectMode;
  publicProfileEnabled: boolean;
  bio: string | null;
};

const EMPTY_CONNECTED_ACCOUNTS: Array<{
  id: string;
  providerId: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;
  scopes: string[];
}> = [];

const EMPTY_AVAILABLE_PROVIDERS: LoginProvider[] = [];

export type { SettingsSectionId };

export type SettingsBodyProps = {
  initialName?: string;
  initialUsername?: string;
  requireUsernameSetup?: boolean;
  initialTimezone: string;
  initialProjectMode: ProjectMode;
  initialPublicProfileEnabled: boolean;
  initialBio: string | null;
  initialKeys: UsageKeyRecord[];
  connectedAccounts?: Array<{
    id: string;
    providerId: string;
    accountId: string;
    createdAt: string;
    updatedAt: string;
    scopes: string[];
  }>;
  availableProviders?: LoginProvider[];
  keyManagerVariant?: "page" | "dialog";
  /** When set with `navigateWithUrl`, the matching section is shown (URL-driven). */
  initialSection?: SettingsSectionId;
  /** Use `/settings/…` links for the sidebar instead of in-memory section state. */
  navigateWithUrl?: boolean;
  viewer?: SettingsPageHeaderViewer;
  className?: string;
};

export function SettingsBody({
  initialName = "",
  initialUsername = "",
  requireUsernameSetup = false,
  initialTimezone,
  initialProjectMode,
  initialPublicProfileEnabled,
  initialBio,
  initialKeys,
  connectedAccounts = EMPTY_CONNECTED_ACCOUNTS,
  availableProviders = EMPTY_AVAILABLE_PROVIDERS,
  keyManagerVariant = "page",
  initialSection = "account",
  navigateWithUrl = false,
  viewer,
  className,
}: SettingsBodyProps) {
  const t = useTranslations("usage.settings");
  const pathname = usePathname();
  // KEPT: section is independently updated via setSection in the button onClick handler
  // react-doctor-disable-next-line react-doctor/no-derived-useState -- navigation button toggles section independently
  const [section, setSection] = useState<SettingsSectionId>(initialSection);

  const [preferences, setPreferences] = useState<SettingsPreferenceState>({
    timezone: initialTimezone,
    projectMode: initialProjectMode,
    publicProfileEnabled: initialPublicProfileEnabled,
    bio: initialBio,
  });

  useEffect(() => {
    const handlePreferenceSaved = (event: Event) => {
      const customEvent = event as CustomEvent<PreferenceNoticeDetail>;

      if (customEvent.detail.type !== "saved") {
        return;
      }

      setPreferences(customEvent.detail.preference);
    };

    window.addEventListener(
      preferenceNoticeEventName,
      handlePreferenceSaved as EventListener,
    );

    return () => {
      window.removeEventListener(
        preferenceNoticeEventName,
        handlePreferenceSaved as EventListener,
      );
    };
  }, []);

  const navItems: {
    id: SettingsSectionId;
    label: string;
    icon: typeof User;
  }[] = [
    { id: "account", label: t("navAccount"), icon: User },
    { id: "preferences", label: t("navPreferences"), icon: SlidersHorizontal },
    { id: "authentication", label: t("navAuthentication"), icon: Shield },
    { id: "cliKeys", label: t("navCliKeys"), icon: Key },
  ];

  const panelCopy: Record<
    SettingsSectionId,
    { title: string; description: string }
  > = {
    account: {
      title: t("navAccount"),
      description: t("panelAccountDescription"),
    },
    preferences: {
      title: t("navPreferences"),
      description: t("panelPreferencesDescription"),
    },
    authentication: {
      title: t("navAuthentication"),
      description: t("panelAuthenticationDescription"),
    },
    cliKeys: {
      title: t("navCliKeys"),
      description: t("panelCliKeysDescription"),
    },
  };

  const activePanel = panelCopy[section];

  const hrefForSection = (id: SettingsSectionId) =>
    `/settings/${settingsSectionToPath(id)}`;

  const isNavActive = (id: SettingsSectionId) => {
    if (navigateWithUrl) {
      const target = hrefForSection(id);
      return pathname === target || pathname === `${target}/`;
    }
    return section === id;
  };

  const preferenceSnapshot = {
    timezone: preferences.timezone,
    projectMode: preferences.projectMode,
    publicProfileEnabled: preferences.publicProfileEnabled,
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {viewer ? <SettingsPageHeader viewer={viewer} /> : null}
      <div
        className={cn(
          "flex min-h-0 flex-col gap-0 md:flex-row md:items-start",
          viewer && "pt-6 sm:pt-8",
        )}
      >
        <nav aria-label={t("title")} className="shrink-0 md:w-56">
          <div className="flex flex-col gap-0.5 p-2 sm:p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavActive(item.id);
              const navClassName = cn(
                "flex w-full items-center gap-2 rounded-md py-2 pr-2.5 pl-2.5 text-left text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              );

              return (
                <div key={item.id}>
                  {navigateWithUrl ? (
                    <Link
                      href={hrefForSection(item.id)}
                      className={navClassName}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon
                        className="size-4 shrink-0 opacity-80"
                        aria-hidden
                      />
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSection(item.id)}
                      className={navClassName}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon
                        className="size-4 shrink-0 opacity-80"
                        aria-hidden
                      />
                      <span className="min-w-0 truncate">{item.label}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-5 md:p-6">
          {section !== "cliKeys" ? (
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {activePanel.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activePanel.description}
              </p>
            </div>
          ) : null}

          <div className={cn(section !== "cliKeys" && "pt-1")}>
            {section === "preferences" ? (
              <SettingsPreferences
                initialTimezone={preferences.timezone}
                initialProjectMode={preferences.projectMode}
                initialPublicProfileEnabled={preferences.publicProfileEnabled}
              />
            ) : null}

            {section === "account" ? (
              <AccountIdentityCard
                initialName={initialName}
                initialUsername={initialUsername}
                initialBio={preferences.bio}
                requireUsernameSetup={requireUsernameSetup}
                preferenceSnapshot={preferenceSnapshot}
              />
            ) : null}

            {section === "authentication" ? (
              <ConnectedAccountsCard
                accounts={connectedAccounts}
                availableProviders={availableProviders}
              />
            ) : null}

            {section === "cliKeys" ? (
              <KeyManager
                initialKeys={initialKeys}
                variant={keyManagerVariant}
                sectionHeading={{
                  title: activePanel.title,
                  description: activePanel.description,
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
