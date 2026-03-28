"use client";

import { useEffect, useState } from "react";

import {
  type PreferenceNoticeDetail,
  preferenceNoticeEventName,
} from "@/lib/usage/preference-notice";
import type { ProjectMode } from "@/lib/usage/types";
import { KeyManager, type UsageKeyRecord } from "./key-manager";
import { SettingsPreferences } from "./settings-preferences";

type SettingsPreferenceState = {
  timezone: string;
  projectMode: ProjectMode;
  publicProfileEnabled: boolean;
  bio: string | null;
};

export type SettingsBodyProps = {
  initialTimezone: string;
  initialProjectMode: ProjectMode;
  initialPublicProfileEnabled: boolean;
  initialBio: string | null;
  initialKeys: UsageKeyRecord[];
  keyManagerVariant?: "page" | "dialog";
  className?: string;
};

export function SettingsBody({
  initialTimezone,
  initialProjectMode,
  initialPublicProfileEnabled,
  initialBio,
  initialKeys,
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
        <SettingsPreferences
          initialTimezone={preferences.timezone}
          initialProjectMode={preferences.projectMode}
          initialPublicProfileEnabled={preferences.publicProfileEnabled}
          initialBio={preferences.bio}
        />
        <KeyManager initialKeys={initialKeys} variant={keyManagerVariant} />
      </div>
    </div>
  );
}
