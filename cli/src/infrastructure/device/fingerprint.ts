import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { platform } from "node:os";

const FINGERPRINT_NAMESPACE = "tokenarena-device-fingerprint:v1";
const OVERRIDE_ENV = "TOKEN_ARENA_DEVICE_FINGERPRINT";

function hashFingerprint(raw: string): string {
  return createHash("sha256")
    .update(`${FINGERPRINT_NAMESPACE}:${raw.trim()}`)
    .digest("hex");
}

function readFirstExistingFile(paths: string[]): string | null {
  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }

    const value = readFileSync(path, "utf8").trim();
    if (value.length > 0) {
      return value;
    }
  }

  return null;
}

function readMacosPlatformUuid(): string | null {
  try {
    const output = execFileSync(
      "ioreg",
      ["-rd1", "-c", "IOPlatformExpertDevice"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

function readWindowsMachineGuid(): string | null {
  try {
    const output = execFileSync(
      "reg",
      ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    const match = output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

function readLinuxMachineId(): string | null {
  return readFirstExistingFile(["/etc/machine-id", "/var/lib/dbus/machine-id"]);
}

function readRawDeviceFingerprint(): string | null {
  const override = process.env[OVERRIDE_ENV]?.trim();
  if (override) {
    return override;
  }

  switch (platform()) {
    case "darwin":
      return readMacosPlatformUuid();
    case "linux":
      return readLinuxMachineId();
    case "win32":
      return readWindowsMachineGuid();
    default:
      return null;
  }
}

export function getDeviceFingerprint(): string | null {
  const raw = readRawDeviceFingerprint();
  if (!raw) {
    return null;
  }

  return hashFingerprint(raw);
}
