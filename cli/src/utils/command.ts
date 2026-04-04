import { execSync } from "node:child_process";

/**
 * Check if a command is available in PATH.
 * Uses POSIX-standard `command -v` which is more reliable than `which`.
 *
 * @param command - The command name to check (e.g., 'systemctl', 'git')
 * @returns true if the command exists, false otherwise
 *
 * @remarks
 * Ensure you're using macOS/Linux. This uses shell built-in `command -v`
 * which may not be available on Windows.
 */
export function isCommandAvailable(command: string): boolean {
  try {
    execSync(`command -v ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
