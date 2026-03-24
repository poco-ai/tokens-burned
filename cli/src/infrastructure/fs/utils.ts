import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename, sep } from "node:path";

/**
 * Recursively find all .jsonl files under a directory
 */
export function findJsonlFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findJsonlFiles(fullPath));
      } else if (entry.name.endsWith(".jsonl")) {
        results.push(fullPath);
      }
    }
  } catch {
    // ignore unreadable directories
  }
  return results;
}

/**
 * Find all JSON files matching a pattern in a directory (non-recursive)
 */
export function findJsonFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && pattern.test(entry.name)) {
        results.push(join(dir, entry.name));
      }
    }
  } catch {
    // ignore unreadable directories
  }
  return results;
}

/**
 * Read file contents, return null on error
 */
export function readFileSafe(filePath: string): string | null {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Parse JSONL file into array of objects
 */
export function parseJsonl<T>(content: string): T[] {
  const results: T[] = [];
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      results.push(JSON.parse(line) as T);
    } catch {
      // skip malformed lines
    }
  }
  return results;
}

/**
 * Extract project name from a Claude-style encoded path
 * Path format: ~/.claude/projects/{encodedProjectPath}/{sessionId}.jsonl
 */
export function extractProjectFromPath(
  filePath: string,
  projectsDir: string
): string {
  const prefix = projectsDir + sep;
  if (!filePath.startsWith(prefix)) return "unknown";
  const relative = filePath.slice(prefix.length);
  const firstSeg = relative.split(sep)[0];
  if (!firstSeg) return "unknown";
  const parts = firstSeg.split("-").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "unknown";
}

/**
 * Extract session ID from file path (basename without extension)
 */
export function extractSessionId(filePath: string): string {
  return basename(filePath, ".jsonl");
}
