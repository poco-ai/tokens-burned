import { existsSync } from "node:fs";
import type { IParser, ToolDefinition } from "./types";

export const TOOLS: ToolDefinition[] = [];

const parsers = new Map<string, IParser>();

export function registerParser(parser: IParser): void {
  parsers.set(parser.tool.id, parser);
  if (!TOOLS.find((tool) => tool.id === parser.tool.id)) {
    TOOLS.push(parser.tool);
  }
}

export function getParser(toolId: string): IParser | undefined {
  return parsers.get(toolId);
}

export function getAllParsers(): IParser[] {
  return Array.from(parsers.values());
}

export function isToolInstalled(toolId: string): boolean {
  const parser = parsers.get(toolId);
  if (parser?.isInstalled) {
    return parser.isInstalled();
  }

  const tool = TOOLS.find((candidate) => candidate.id === toolId);
  return tool ? existsSync(tool.dataDir) : false;
}

export function detectInstalledTools(): ToolDefinition[] {
  return TOOLS.filter((tool) => isToolInstalled(tool.id));
}

export function getAllTools(): ToolDefinition[] {
  return TOOLS;
}
