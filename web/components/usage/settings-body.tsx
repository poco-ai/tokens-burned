"use client";

import { useEffect, useState } from "react";

import type { LoginProvider } from "@/lib/auth-providers";
import {
  type PreferenceNoticeDetail,
  preferenceNoticeEventName,
} from "@/lib/usage/preference-notice";
import type { ProjectMode } from "@/lib/usage/types";
import { AccountIdentityCard } from "./account-identity-card";
import { ConnectedAccountsCard } from "./connected-accounts-card";
import { KeyManager, type UsageKeyRecord } from "./key-manager";
import { SettingsPreferences } from "./settings-preferences";

type SettingsPreferenceState = {
  timezone: string;
  projectMode: ProjectMode;
  publicProfileEnabled: boolean;
  bio: string | null;
};

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
  connectedAccounts = [],
  availableProviders = [],
  keyManagerVariant = "page",
  className,
}: SettingsBodyProps) {
  const [preferences, setPreferences] = useState<SettingsPreferenceState>({
    timezone: initialTimezone,
    projectMode: initialProjectMode,
    publicProfileEnabled: initialPublicProfileEnabled,
    bio: initialBio,
  });

  useEffect(() => {
    setPreferences({
      timezone: initialTimezone,
      projectMode: initialProjectMode,
      publicProfileEnabled: initialPublicProfileEnabled,
      bio: initialBio,
    });
  }, [
    initialBio,
    initialProjectMode,
    initialPublicProfileEnabled,
    initialTimezone,
  ]);

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

  return (
    <div className={className}>
      <div className="space-y-4">
        <AccountIdentityCard
          initialName={initialName}
          initialUsername={initialUsername}
          requireUsernameSetup={requireUsernameSetup}
        />
        <SettingsPreferences
          initialTimezone={preferences.timezone}
          initialProjectMode={preferences.projectMode}
          initialPublicProfileEnabled={preferences.publicProfileEnabled}
          initialBio={preferences.bio}
        />
        <ConnectedAccountsCard
          accounts={connectedAccounts}
          availableProviders={availableProviders}
        />
        <KeyManager initialKeys={initialKeys} variant={keyManagerVariant} />
      </div>
    </div>
  );
}
