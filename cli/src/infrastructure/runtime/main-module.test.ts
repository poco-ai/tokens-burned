import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isMainModule } from "./main-module";

const tempDirs: string[] = [];

function createTempDir() {
  const dir = mkdtempSync(join(tmpdir(), "tokenarena-main-module-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { force: true, recursive: true });
    }
  }
});

describe("isMainModule", () => {
  it("returns false when argv entry is missing", () => {
    expect(isMainModule(undefined, import.meta.url)).toBe(false);
  });

  it("returns true for the direct script path", () => {
    const dir = createTempDir();
    const scriptPath = join(dir, "dist", "index.js");

    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(scriptPath, "#!/usr/bin/env node\n", "utf-8");

    expect(isMainModule(scriptPath, pathToFileURL(scriptPath).href)).toBe(true);
  });

  it("returns true when invoked through a symlinked npm bin entry", () => {
    const dir = createTempDir();
    const scriptPath = join(
      dir,
      "node_modules",
      "@scope",
      "pkg",
      "dist",
      "index.js",
    );
    const binPath = join(dir, "node_modules", ".bin", "pkg");

    mkdirSync(join(dir, "node_modules", "@scope", "pkg", "dist"), {
      recursive: true,
    });
    mkdirSync(join(dir, "node_modules", ".bin"), { recursive: true });
    writeFileSync(scriptPath, "#!/usr/bin/env node\n", "utf-8");
    try {
      symlinkSync(scriptPath, binPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") {
        return;
      }
      throw error;
    }

    expect(isMainModule(binPath, pathToFileURL(scriptPath).href)).toBe(true);
  });

  it("returns false for a different entry file", () => {
    const dir = createTempDir();
    const scriptPath = join(dir, "dist", "index.js");
    const otherPath = join(dir, "dist", "other.js");

    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(scriptPath, "#!/usr/bin/env node\n", "utf-8");
    writeFileSync(otherPath, "#!/usr/bin/env node\n", "utf-8");

    expect(isMainModule(otherPath, pathToFileURL(scriptPath).href)).toBe(false);
  });
});
