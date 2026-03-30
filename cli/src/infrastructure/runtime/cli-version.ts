import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FALLBACK_VERSION = "0.0.0";

let cachedVersion: string | undefined;

export function getCliVersion(metaUrl = import.meta.url): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  const packageJsonPath = join(
    dirname(fileURLToPath(metaUrl)),
    "..",
    "package.json",
  );

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
      version?: string;
    };

    cachedVersion =
      typeof packageJson.version === "string"
        ? packageJson.version
        : FALLBACK_VERSION;
  } catch {
    cachedVersion = FALLBACK_VERSION;
  }

  return cachedVersion;
}
