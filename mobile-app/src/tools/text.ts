import { tx } from "@/i18n";
import type { Tool } from "./types";

/** A tool's name and summary in the active language, with the registry's English as fallback. */
export const toolName = (tool: Tool) => tx(`tools.${tool.slug}.name`, tool.name);
export const toolSummary = (tool: Tool) => tx(`tools.${tool.slug}.summary`, tool.summary);
