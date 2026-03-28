"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { emitPreferenceSavedNotice } from "@/lib/usage/preference-notice";
import {
  hasPreferenceChanges,
  projectModeOptions,
} from "@/lib/usage/settings-view";
import type { ProjectMode } from "@/lib/usage/types";

const timezoneOptions = [
  { value: "UTC", label: "UTC" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (UTC+8)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong Kong (UTC+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+9)" },
  { value: "Asia/Seoul", label: "Asia/Seoul (UTC+9)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+8)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UTC+4)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (UTC+5:30)" },
  { value: "Europe/London", label: "Europe/London (UTC+0/+1)" },
  { value: "Europe/Paris", label: "Europe/Paris (UTC+1/+2)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (UTC+1/+2)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (UTC+3)" },
  { value: "America/New_York", label: "America/New York (UTC-5/-4)" },
  { value: "America/Chicago", label: "America/Chicago (UTC-6/-5)" },
  { value: "America/Denver", label: "America/Denver (UTC-7/-6)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (UTC-8/-7)" },
  { value: "America/Toronto", label: "America/Toronto (UTC-5/-4)" },
  { value: "America/Vancouver", label: "America/Vancouver (UTC-8/-7)" },
  { value: "America/Sao_Paulo", label: "America/Sao Paulo (UTC-3)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (UTC+10/+11)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (UTC+10/+11)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (UTC+12/+13)" },
];

const settingsControlClassName =
  "w-full border-border/60 bg-background hover:bg-muted/40";

const settingsSelectContentClassName = "border-border/60 bg-popover";

type SettingsPreferencesProps = {
  initialTimezone: string;
  initialProjectMode: ProjectMode;
  initialPublicProfileEnabled: boolean;
  initialBio: string | null;
};

export function SettingsPreferences({
  initialTimezone,
  initialProjectMode,
  initialPublicProfileEnabled,
  initialBio,
}: SettingsPreferencesProps) {
  const t = useTranslations("usage.settings");
  const [timezone, setTimezone] = useState(initialTimezone);
  const [projectMode, setProjectMode] =
    useState<ProjectMode>(initialProjectMode);
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(
    initialPublicProfileEnabled,
  );
  const [bio, setBio] = useState(initialBio ?? "");
  const [savedTimezone, setSavedTimezone] = useState(initialTimezone);
  const [savedProjectMode, setSavedProjectMode] =
    useState<ProjectMode>(initialProjectMode);
  const [savedPublicProfileEnabled, setSavedPublicProfileEnabled] = useState(
    initialPublicProfileEnabled,
  );
  const [savedBio, setSavedBio] = useState(initialBio ?? "");
  const [error, setError] = useState<string | null>(null);
  const hasChanges = hasPreferenceChanges(
    {
      timezone: savedTimezone,
      projectMode: savedProjectMode,
      publicProfileEnabled: savedPublicProfileEnabled,
      bio: savedBio,
    },
    { timezone, projectMode, publicProfileEnabled, bio },
  );
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savePreferences = useCallback(
    async (
      nextTimezone: string,
      nextProjectMode: ProjectMode,
      nextPublicProfileEnabled: boolean,
      nextBio: string,
    ) => {
      setError(null);

      try {
        const response = await fetch("/api/usage/preferences", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            timezone: nextTimezone,
            projectMode: nextProjectMode,
            publicProfileEnabled: nextPublicProfileEnabled,
            bio: nextBio.trim() ? nextBio.trim() : null,
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to save preferences.");
        }

        setSavedTimezone(payload.timezone);
        setSavedProjectMode(payload.projectMode);
        setSavedPublicProfileEnabled(payload.publicProfileEnabled);
        setSavedBio(payload.bio ?? "");
        emitPreferenceSavedNotice({
          timezone: payload.timezone,
          projectMode: payload.projectMode,
          publicProfileEnabled: payload.publicProfileEnabled,
          bio: payload.bio,
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : t("saveFailed"),
        );
      }
    },
    [t],
  );

  useEffect(() => {
    if (!hasChanges) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      return;
    }

    setError(null);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void savePreferences(timezone, projectMode, publicProfileEnabled, bio);
      saveTimeoutRef.current = null;
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [
    bio,
    hasChanges,
    projectMode,
    publicProfileEnabled,
    savePreferences,
    timezone,
  ]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive" className="border-destructive/20">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card size="sm" className="gap-0 bg-card shadow-sm ring-1 ring-border/60">
        <CardHeader className="border-b border-border/50 bg-card pb-2">
          <CardTitle>{t("profileSectionTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="timezone">{t("timezone")}</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger
                  id="timezone"
                  className={settingsControlClassName}
                >
                  <SelectValue placeholder={t("selectTimezone")} />
                </SelectTrigger>
                <SelectContent className={settingsSelectContentClassName}>
                  {timezoneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="public-profile">{t("publicProfile")}</Label>
              <Select
                value={publicProfileEnabled ? "enabled" : "disabled"}
                onValueChange={(value) =>
                  setPublicProfileEnabled(value === "enabled")
                }
              >
                <SelectTrigger
                  id="public-profile"
                  className={settingsControlClassName}
                >
                  <SelectValue placeholder={t("selectPublicProfile")} />
                </SelectTrigger>
                <SelectContent className={settingsSelectContentClassName}>
                  <SelectItem value="disabled">
                    {t("publicProfileOptions.disabled")}
                  </SelectItem>
                  <SelectItem value="enabled">
                    {t("publicProfileOptions.enabled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="profile-bio">{t("bio")}</Label>
              <textarea
                id="profile-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value.slice(0, 160))}
                placeholder={t("bioPlaceholder")}
                maxLength={160}
                rows={3}
                className="w-full rounded-lg border border-border/60 bg-background px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
              />
              <div className="text-xs text-muted-foreground">
                {bio.length}/160
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="gap-0 bg-card shadow-sm ring-1 ring-border/60">
        <CardHeader className="border-b border-border/50 bg-card pb-2">
          <CardTitle>{t("preferencesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="project-mode">{t("projectMode")}</Label>
              <Select
                value={projectMode}
                onValueChange={(value) => setProjectMode(value as ProjectMode)}
              >
                <SelectTrigger
                  id="project-mode"
                  className={settingsControlClassName}
                >
                  <SelectValue placeholder={t("selectProjectMode")} />
                </SelectTrigger>
                <SelectContent className={settingsSelectContentClassName}>
                  {projectModeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(`projectModes.${option.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
