"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type SetupCardProps = {
  initialTimezone: string;
  initialProjectMode: ProjectMode;
  keysSummary: {
    total: number;
    active: number;
    disabled: number;
  };
};

const projectModeOptions: Array<{
  value: ProjectMode;
  label: string;
  description: string;
}> = [
  {
    value: "hashed",
    label: "Hashed",
    description: "Stable project hashes without revealing raw names.",
  },
  {
    value: "raw",
    label: "Raw",
    description: "Upload the original project name for direct display.",
  },
  {
    value: "disabled",
    label: "Disabled",
    description: "Turn off project attribution entirely.",
  },
];

export function SetupCard({
  initialTimezone,
  initialProjectMode,
  keysSummary,
}: SetupCardProps) {
  const [timezone, setTimezone] = useState(initialTimezone);
  const [projectMode, setProjectMode] =
    useState<ProjectMode>(initialProjectMode);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const installCommand = useMemo(() => "pnpm --filter ./cli dev -- init", []);
  const syncCommand = useMemo(() => "pnpm --filter ./cli dev -- sync", []);

  const savePreferences = async () => {
    setIsSaving(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/usage/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ timezone, projectMode }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save preferences.");
      }

      setStatus(
        `Saved account timezone ${payload.timezone} and project mode ${payload.projectMode}.`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save preferences.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Account preferences</CardTitle>
          <CardDescription>
            Dashboard ranges are resolved in your account timezone. Project mode
            controls how the CLI anonymizes project names before upload.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status ? (
            <Alert>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
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

          <div className="space-y-2">
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
            <p className="text-sm text-muted-foreground">
              {
                projectModeOptions.find(
                  (option) => option.value === projectMode,
                )?.description
              }
            </p>
          </div>

          <Button type="button" onClick={savePreferences} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save preferences"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>CLI onboarding</CardTitle>
            <CardDescription>
              Use the CLI with one API key per device or workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>1. Create or open a usage API key from the keys page.</div>
            <code className="block rounded bg-muted px-3 py-2 text-xs text-foreground">
              {installCommand}
            </code>
            <div>2. Paste the API key and your server URL when prompted.</div>
            <code className="block rounded bg-muted px-3 py-2 text-xs text-foreground">
              {syncCommand}
            </code>
            <div>3. Run sync regularly to keep the dashboard up to date.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current keys</CardTitle>
            <CardDescription>
              Recommended: one key per machine, device, or automation workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{keysSummary.total} total</Badge>
              <Badge variant="secondary">{keysSummary.active} active</Badge>
              <Badge variant="outline">{keysSummary.disabled} disabled</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/settings/keys">Create or manage keys</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
