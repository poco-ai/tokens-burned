"use client";

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
import {
  getPreferenceStatusText,
  hasPreferenceChanges,
  type PreferenceSaveState,
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

type SettingsPreferencesProps = {
  initialTimezone: string;
  initialProjectMode: ProjectMode;
};

export function SettingsPreferences({
  initialTimezone,
  initialProjectMode,
}: SettingsPreferencesProps) {
  const [timezone, setTimezone] = useState(initialTimezone);
  const [projectMode, setProjectMode] =
    useState<ProjectMode>(initialProjectMode);
  const [savedTimezone, setSavedTimezone] = useState(initialTimezone);
  const [savedProjectMode, setSavedProjectMode] =
    useState<ProjectMode>(initialProjectMode);
  const [saveState, setSaveState] = useState<PreferenceSaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const hasChanges = hasPreferenceChanges(
    { timezone: savedTimezone, projectMode: savedProjectMode },
    { timezone, projectMode },
  );
  const statusText = getPreferenceStatusText(saveState);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const savePreferences = useCallback(
    async (nextTimezone: string, nextProjectMode: ProjectMode) => {
      setSaveState("saving");
      setError(null);

      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
        savedIndicatorTimeoutRef.current = null;
      }

      try {
        const response = await fetch("/api/usage/preferences", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            timezone: nextTimezone,
            projectMode: nextProjectMode,
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to save preferences.");
        }

        setSavedTimezone(payload.timezone);
        setSavedProjectMode(payload.projectMode);
        setSaveState("saved");
        savedIndicatorTimeoutRef.current = setTimeout(() => {
          setSaveState("idle");
          savedIndicatorTimeoutRef.current = null;
        }, 1500);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to save preferences.",
        );
        setSaveState("idle");
      }
    },
    [],
  );

  useEffect(() => {
    if (!hasChanges) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      return;
    }

    setSaveState("idle");
    setError(null);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void savePreferences(timezone, projectMode);
      saveTimeoutRef.current = null;
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [hasChanges, projectMode, savePreferences, timezone]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card
      size="sm"
      className="gap-0 bg-background/90 shadow-sm ring-1 ring-border/60"
    >
      <CardHeader className="gap-2 border-b border-border/50 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Preferences</CardTitle>
        {statusText ? (
          <p className="text-sm text-muted-foreground">{statusText}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        {error ? (
          <Alert variant="destructive" className="border-destructive/20">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-mode">Project mode</Label>
            <Select
              value={projectMode}
              onValueChange={(value) => setProjectMode(value as ProjectMode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select project mode" />
              </SelectTrigger>
              <SelectContent>
                {projectModeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
