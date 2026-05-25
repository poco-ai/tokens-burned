import type { ProjectMode, UsageApiKeyStatus } from "./types";

export const projectModeOptions: Array<{
  value: ProjectMode;
  label: string;
}> = [
  {
    value: "hashed",
    label: "Hashed",
  },
  {
    value: "raw",
    label: "Raw",
  },
  {
    value: "disabled",
    label: "Disabled",
  },
];

type PreferenceSnapshot = {
  timezone: string;
  projectMode: ProjectMode;
  locale?: string;
  theme?: string;
  publicProfileEnabled?: boolean;
  bio?: string | null;
};

export type PreferenceSaveState = "idle" | "saving" | "saved";

type UsageKeySummary = {
  total: number;
  active: number;
  disabled: number;
};

export function hasPreferenceChanges(
  initial: PreferenceSnapshot,
  current: PreferenceSnapshot,
) {
  return (
    initial.timezone !== current.timezone ||
    initial.projectMode !== current.projectMode ||
    initial.locale !== current.locale ||
    initial.theme !== current.theme ||
    initial.publicProfileEnabled !== current.publicProfileEnabled ||
    (initial.bio ?? "") !== (current.bio ?? "")
  );
}

export function summarizeUsageKeys(
  keys: Array<{ status: UsageApiKeyStatus }>,
): UsageKeySummary {
  const active = keys.filter((key) => key.status === "active").length;

  return {
    total: keys.length,
    active,
    disabled: keys.length - active,
  };
}

export function getPreferenceStatusText(state: PreferenceSaveState) {
  if (state === "saving") {
    return "Saving...";
  }

  if (state === "saved") {
    return "Saved";
  }

  return null;
}
