import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ensureAppRuntimeDirs, getServiceManifestPath } from "../runtime/paths";

export interface ServiceManifest {
  installedAt: string;
  intervalMs: number;
  label: string;
  logPath: string;
  platform: "darwin-launchd";
  plistPath: string;
  workingDirectory: string;
  wrapperPath: string;
}

export function loadServiceManifest(): ServiceManifest | null {
  const path = getServiceManifestPath();
  if (!existsSync(path)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ServiceManifest;
  } catch {
    return null;
  }
}

export function saveServiceManifest(manifest: ServiceManifest): void {
  ensureAppRuntimeDirs();
  writeFileSync(
    getServiceManifestPath(),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf-8",
  );
}
