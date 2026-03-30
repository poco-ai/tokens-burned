import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function isMainModule(
  argvEntry = process.argv[1],
  metaUrl = import.meta.url,
): boolean {
  if (!argvEntry) {
    return false;
  }

  const currentModulePath = fileURLToPath(metaUrl);

  try {
    return realpathSync(argvEntry) === realpathSync(currentModulePath);
  } catch {
    if (!existsSync(argvEntry)) {
      return false;
    }

    return resolve(argvEntry) === resolve(currentModulePath);
  }
}
