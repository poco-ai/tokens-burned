const hasColor = Boolean(process.stdout.isTTY && process.env.NO_COLOR !== "1");

function withCode(code: string, value: string): string {
  if (!hasColor) return value;
  return `\u001b[${code}m${value}\u001b[0m`;
}

export function bold(value: string): string {
  return withCode("1", value);
}

export function dim(value: string): string {
  return withCode("2", value);
}

export function cyan(value: string): string {
  return withCode("36", value);
}

export function green(value: string): string {
  return withCode("32", value);
}

export function yellow(value: string): string {
  return withCode("33", value);
}

export function red(value: string): string {
  return withCode("31", value);
}

export function magenta(value: string): string {
  return withCode("35", value);
}

export function formatHeader(title: string, subtitle?: string): string {
  const lines = [`${cyan("◈")} ${bold(title)}`];
  if (subtitle) {
    lines.push(dim(subtitle));
  }
  return `\n${lines.join("\n")}`;
}

export function formatSection(title: string): string {
  return `\n${bold(title)}`;
}

export function formatKeyValue(label: string, value: string): string {
  return `  ${dim(label.padEnd(14, " "))} ${value}`;
}

export function formatBullet(
  value: string,
  tone: "neutral" | "success" | "warning" | "danger" = "neutral",
): string {
  const icon =
    tone === "success"
      ? green("✔")
      : tone === "warning"
        ? yellow("!")
        : tone === "danger"
          ? red("✖")
          : cyan("•");
  return `  ${icon} ${value}`;
}

export function formatMutedPath(path: string): string {
  return dim(path);
}

export function maskSecret(value: string, visible = 8): string {
  if (!value) return "(empty)";
  if (value.length <= visible) return value;
  return `${value.slice(0, visible)}…`;
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes > 0
    ? `${hours} 小时 ${restMinutes} 分钟`
    : `${hours} 小时`;
}

export function formatStatusBadge(
  label: string,
  tone: "success" | "warning" | "danger" | "neutral" = "neutral",
): string {
  if (tone === "success") return green(label);
  if (tone === "warning") return yellow(label);
  if (tone === "danger") return red(label);
  return magenta(label);
}
