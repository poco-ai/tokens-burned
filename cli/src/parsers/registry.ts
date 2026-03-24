import { existsSync } from "node:fs";
import type { IParser, ToolDefinition } from "./types";

/**
 * All supported tools and their data directories
 */
export const TOOLS: ToolDefinition[] = [];

/**
 * Registered parsers by tool ID
 */
const parsers = new Map<string, IParser>();

/**
 * Register a parser
 */
export function registerParser(parser: IParser): void {
  parsers.set(parser.tool.id, parser);
  if (!TOOLS.find((t) => t.id === parser.tool.id)) {
    TOOLS.push(parser.tool);
  }
}

/**
 * Get parser by tool ID
 */
export function getParser(toolId: string): IParser | undefined {
  return parsers.get(toolId);
}

/**
 * Get all registered parsers
 */
export function getAllParsers(): IParser[] {
  return Array.from(parsers.values());
}

/**
 * Detect installed tools by checking if their data directories exist
 */
export function detectInstalledTools(): ToolDefinition[] {
  return TOOLS.filter((t) => existsSync(t.dataDir));
}

/**
 * Get all tool definitions
 */
export function getAllTools(): ToolDefinition[] {
  return TOOLS;
}
