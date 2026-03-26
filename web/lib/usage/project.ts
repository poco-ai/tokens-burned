import type { ProjectMode } from "./types";

export function formatProjectLabel(
  mode: ProjectMode,
  projectKey: string,
  rawName?: string | null,
) {
  if (mode === "raw" && rawName) {
    return rawName;
  }

  if (mode === "disabled") {
    return "Unknown Project";
  }

  return `Project ${projectKey.slice(0, 6)}`;
}
