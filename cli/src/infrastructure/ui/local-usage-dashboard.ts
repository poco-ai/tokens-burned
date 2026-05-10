import type {
  LocalUsageDashboardData,
  LocalUsageRankItem,
  LocalUsageSessionItem,
  LocalUsageToolSummary,
} from "../../domain/local-usage-summary";
import { bold, cyan, dim, green, magenta, yellow } from "./format";

const MAX_RANK_ROWS = 6;
const MAX_SESSION_ROWS = 6;

function stripAnsi(value: string): string {
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 27 && value[index + 1] === "[") {
      index += 2;
      while (index < value.length && value[index] !== "m") {
        index += 1;
      }
      continue;
    }
    output += value[index];
  }
  return output;
}

function visibleLength(value: string): number {
  return stripAnsi(value).length;
}

function truncate(value: string, maxWidth: number): string {
  if (maxWidth <= 0) return "";
  if (visibleLength(value) <= maxWidth) return value;

  const plain = stripAnsi(value);
  if (maxWidth <= 1) return "…";
  return `${plain.slice(0, maxWidth - 1)}…`;
}

function pad(value: string, width: number): string {
  return `${value}${" ".repeat(Math.max(0, width - visibleLength(value)))}`;
}

function colorByIndex(value: string, index: number): string {
  switch (index % 4) {
    case 0:
      return cyan(value);
    case 1:
      return green(value);
    case 2:
      return yellow(value);
    default:
      return magenta(value);
  }
}

function renderTabToken(
  tool: LocalUsageToolSummary,
  index: number,
  selectedIndex: number,
): string {
  const rawLabel = ` ${tool.name} `;
  const leftBlock = colorByIndex("▌", index);
  return index === selectedIndex
    ? `${leftBlock} ${bold(rawLabel)}`
    : `${leftBlock} ${dim(rawLabel)}`;
}

function formatCompactNumber(value: number): string {
  const safeValue = Math.round(value || 0);
  if (Math.abs(safeValue) >= 1_000_000_000) {
    return `${(safeValue / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(safeValue) >= 1_000_000) {
    return `${(safeValue / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(safeValue) >= 1_000) {
    return `${(safeValue / 1_000).toFixed(1)}K`;
  }
  return String(safeValue);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return date.toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds || 0));
  if (safeSeconds < 60) return `${safeSeconds}s`;
  const minutes = Math.round(safeSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes > 0 ? `${hours}h${restMinutes}m` : `${hours}h`;
}

function renderTabs(
  tools: LocalUsageToolSummary[],
  selectedIndex: number,
  width: number,
): string {
  const allTokens = tools.map((tool, index) =>
    renderTabToken(tool, index, selectedIndex),
  );
  const fullLine = allTokens.join(" ");
  if (visibleLength(fullLine) <= width) {
    return fullLine;
  }

  const leftIndicator = selectedIndex > 0 ? dim("‹ ") : "";
  const tokens: string[] = [];
  let usedWidth = visibleLength(leftIndicator);

  for (let index = selectedIndex; index < tools.length; index += 1) {
    const token = renderTabToken(tools[index], index, selectedIndex);
    const separatorWidth = tokens.length > 0 ? 1 : 0;
    const hasMore = index < tools.length - 1;
    const rightIndicatorWidth = hasMore ? 4 : 0;

    if (
      usedWidth + separatorWidth + visibleLength(token) + rightIndicatorWidth >
      width
    ) {
      if (tokens.length === 0) {
        tokens.push(
          truncate(token, Math.max(1, width - usedWidth - rightIndicatorWidth)),
        );
      }
      break;
    }

    if (tokens.length > 0) {
      usedWidth += 1;
    }
    tokens.push(token);
    usedWidth += visibleLength(token);
  }

  const nextHidden = selectedIndex + tokens.length < tools.length;
  const rightIndicator = nextHidden ? dim(" … ›") : "";
  return truncate(
    `${leftIndicator}${tokens.join(" ")}${rightIndicator}`,
    width,
  );
}

function renderOverview(tool: LocalUsageToolSummary): string[] {
  return [
    `${bold("Overview")} ${dim(tool.source)}`,
    `  Tokens   ${formatCompactNumber(tool.totals.totalTokens)} total · ${formatCompactNumber(tool.totals.inputTokens)} input · ${formatCompactNumber(tool.totals.outputTokens)} output`,
    `  Details  ${formatCompactNumber(tool.totals.cachedTokens)} cached · ${formatCompactNumber(tool.totals.reasoningTokens)} reasoning`,
    `  Scope    ${tool.totals.sessions} sessions · ${tool.totals.buckets} buckets · ${tool.totals.projects} projects · ${tool.totals.models} models`,
  ];
}

function renderRankTable(title: string, items: LocalUsageRankItem[]): string[] {
  const lines = [bold(title)];
  if (items.length === 0) {
    lines.push(dim("  No usage found."));
    return lines;
  }

  lines.push(dim(`  ${pad("Name", 28)} ${pad("Tokens", 10)} Sessions`));
  for (const item of items.slice(0, MAX_RANK_ROWS)) {
    lines.push(
      `  ${pad(truncate(item.name, 28), 28)} ${pad(formatCompactNumber(item.totalTokens), 10)} ${item.sessions}`,
    );
  }
  return lines;
}

function renderSessionTable(items: LocalUsageSessionItem[]): string[] {
  const lines = [bold("Recent Sessions")];
  if (items.length === 0) {
    lines.push(dim("  No sessions found."));
    return lines;
  }

  lines.push(
    dim(
      `  ${pad("When", 12)} ${pad("Project", 20)} ${pad("Model", 18)} ${pad("Tokens", 8)} Msgs Active`,
    ),
  );
  for (const session of items.slice(0, MAX_SESSION_ROWS)) {
    lines.push(
      `  ${pad(formatDateTime(session.lastMessageAt), 12)} ${pad(truncate(session.project, 20), 20)} ${pad(truncate(session.primaryModel, 18), 18)} ${pad(formatCompactNumber(session.totalTokens), 8)} ${pad(String(session.messageCount), 4)} ${formatDuration(session.activeSeconds)}`,
    );
  }
  return lines;
}

function renderTool(
  tool: LocalUsageToolSummary,
  allTools: LocalUsageToolSummary[],
  selectedIndex: number,
  width: number,
  interactive: boolean,
): string {
  const lines = [
    `${cyan("◈")} ${bold("TokenArena Local Usage")}`,
    dim(
      interactive
        ? "Tab/→ next · Shift+Tab/← previous · q/Esc/Ctrl+C quit"
        : "Static local usage snapshot",
    ),
    "",
    renderTabs(allTools, selectedIndex, width),
    "",
    ...renderOverview(tool),
    "",
    ...renderRankTable("Top Models", tool.topModels),
    "",
    ...renderRankTable("Top Projects", tool.topProjects),
    "",
    ...renderSessionTable(tool.sessions),
  ];

  return lines.map((line) => truncate(line, width)).join("\n");
}

export function renderLocalUsageDashboard(
  data: LocalUsageDashboardData,
  selectedIndex = 0,
  options: { interactive?: boolean; width?: number } = {},
): string {
  const width = Math.max(40, options.width ?? process.stdout.columns ?? 100);

  if (data.tools.length === 0 || data.totals.totalTokens === 0) {
    return [
      `${cyan("◈")} ${bold("TokenArena Local Usage")}`,
      dim("No local usage records were found."),
      "",
      yellow(
        "! Use supported AI CLI tools first, or run `ta status` to check detected tools.",
      ),
    ]
      .map((line) => truncate(line, width))
      .join("\n");
  }

  const safeIndex = Math.max(0, Math.min(selectedIndex, data.tools.length - 1));
  return renderTool(
    data.tools[safeIndex],
    data.tools,
    safeIndex,
    width,
    Boolean(options.interactive),
  );
}

function isShiftTab(value: string): boolean {
  return value === "\u001b[Z";
}

function isNextTabKey(value: string): boolean {
  return value === "\t" || value === "\u001b[C";
}

function isPreviousTabKey(value: string): boolean {
  return isShiftTab(value) || value === "\u001b[D";
}

function isQuit(value: string): boolean {
  return (
    value === "q" || value === "Q" || value === "\u001b" || value === "\u0003"
  );
}

export async function showLocalUsageDashboard(
  data: LocalUsageDashboardData,
): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stdout.write(`${renderLocalUsageDashboard(data)}\n`);
    return;
  }

  if (data.tools.length === 0 || data.totals.totalTokens === 0) {
    process.stdout.write(`${renderLocalUsageDashboard(data)}\n`);
    return;
  }

  let selectedIndex = 0;
  const stdin = process.stdin;
  const stdout = process.stdout;
  const wasRaw = stdin.isRaw;

  await new Promise<void>((resolve) => {
    const render = () => {
      stdout.write("\u001b[?25l\u001b[2J\u001b[H");
      stdout.write(
        renderLocalUsageDashboard(data, selectedIndex, {
          interactive: true,
          width: stdout.columns ?? 100,
        }),
      );
      stdout.write("\n");
    };

    const cleanup = () => {
      stdout.write("\u001b[?25h\u001b[2J\u001b[H");
      stdin.off("data", onData);
      stdout.off("resize", render);
      if (stdin.isTTY) stdin.setRawMode(wasRaw);
      stdin.pause();
      resolve();
    };

    const onData = (chunk: Buffer | string) => {
      const value = chunk.toString("utf8");
      if (isQuit(value)) {
        cleanup();
        return;
      }
      if (isNextTabKey(value)) {
        selectedIndex = (selectedIndex + 1) % data.tools.length;
        render();
        return;
      }
      if (isPreviousTabKey(value)) {
        selectedIndex =
          (selectedIndex - 1 + data.tools.length) % data.tools.length;
        render();
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", onData);
    stdout.on("resize", render);
    render();
  });
}
