#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const shouldCheckStaged = process.argv.includes("--staged");

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    env: { ...process.env, NO_COLOR: "1", ...options.env },
  });
}

if (shouldCheckStaged) {
  const diff = run("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
  if (diff.status !== 0) {
    process.stderr.write(diff.stderr || "Failed to inspect staged changes.\n");
    process.exit(diff.status ?? 1);
  }

  const hasWebChanges = diff.stdout
    .split("\n")
    .some((file) => file === "web" || file.startsWith("web/"));

  if (!hasWebChanges) {
    console.log("React Doctor badge: no staged web changes; skipping.");
    process.exit(0);
  }
}

console.log("React Doctor badge: running pnpm react-doctor...");
const doctor = run("pnpm", ["react-doctor"]);
const output = `${doctor.stdout || ""}${doctor.stderr || ""}`;
process.stdout.write(doctor.stdout || "");
process.stderr.write(doctor.stderr || "");

if (doctor.status !== 0) {
  console.error("React Doctor failed; README badge was not updated.");
  process.exit(doctor.status ?? 1);
}

const scoreMatch = output.match(/\b(\d{1,3})\s*\/\s*100\b/);
const issuesMatch = output.match(/\b(\d+)\s+issues\s+across\s+(\d+)\/\d+\s+files\b/);

if (!scoreMatch) {
  console.error("React Doctor score was not found in output.");
  process.exit(1);
}

const score = Number(scoreMatch[1]);
if (!Number.isInteger(score) || score < 0 || score > 100) {
  console.error(`React Doctor score is invalid: ${scoreMatch[1]}`);
  process.exit(1);
}

const warnings = issuesMatch?.[1] ?? "0";
const files = issuesMatch?.[2] ?? "0";
const errors = "0";
const badge = `[![React Doctor](https://www.react.doctor/share/badge?p=web&s=${score}&e=${errors}&w=${warnings}&f=${files})](https://www.react.doctor/share?p=web&s=${score}&e=${errors}&w=${warnings}&f=${files})`;
const badgePattern = /\s*\[!\[React Doctor\]\(https:\/\/www\.react\.doctor\/share\/badge\?[^\)]*\)\]\(https:\/\/www\.react\.doctor\/share\?[^\)]*\)/;

const readmePath = "README.md";
const original = readFileSync(readmePath, "utf8");
let next;

if (badgePattern.test(original)) {
  next = original.replace(badgePattern, ` ${badge}`);
} else {
  const lines = original.split("\n");
  const badgeLineIndex = lines.findIndex((line) => line.includes("[![Docker Image]"));
  if (badgeLineIndex === -1) {
    console.error("Could not find README badge line to update.");
    process.exit(1);
  }
  lines[badgeLineIndex] = `${lines[badgeLineIndex]} ${badge}`;
  next = lines.join("\n");
}

if (next !== original) {
  writeFileSync(readmePath, next);
  console.log(`React Doctor badge updated: ${score}/100 (${warnings} warnings across ${files} files).`);
} else {
  console.log(`React Doctor badge already current: ${score}/100.`);
}
