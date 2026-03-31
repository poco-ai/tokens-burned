import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { UploadManifest } from "../../domain/upload-manifest";
import { ensureAppDirs, getUploadManifestPath } from "./paths";

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "string");
}

function isUploadManifest(value: unknown): value is UploadManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const manifest = value as Partial<UploadManifest>;

  return (
    manifest.version === 1 &&
    !!manifest.scope &&
    typeof manifest.scope === "object" &&
    typeof manifest.scope.apiUrl === "string" &&
    typeof manifest.scope.apiKeyHash === "string" &&
    typeof manifest.scope.deviceId === "string" &&
    typeof manifest.scope.projectMode === "string" &&
    typeof manifest.scope.projectHashSaltHash === "string" &&
    typeof manifest.updatedAt === "string" &&
    isRecordOfStrings(manifest.buckets) &&
    isRecordOfStrings(manifest.sessions)
  );
}

export function loadUploadManifest(): UploadManifest | null {
  const path = getUploadManifestPath();
  if (!existsSync(path)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    return isUploadManifest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveUploadManifest(manifest: UploadManifest): void {
  ensureAppDirs();
  writeFileSync(
    getUploadManifestPath(),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf-8",
  );
}
