import { router } from "expo-router";
import type { OutputFile, ProgressFn } from "@/engine/core";
import { useJobs } from "@/jobs/JobsProvider";
import { toolName } from "@/tools/text";
import type { Tool } from "@/tools/types";

/** Hands a tool's work to the background job manager and opens its progress screen. */
export function useStartJob(tool: Tool) {
  const { start } = useJobs();
  return (files: { size: number }[], work: (progress: ProgressFn) => Promise<OutputFile[]>) => {
    const inputSize = files.reduce((sum, f) => sum + f.size, 0);
    const id = start({ slug: tool.slug, title: toolName(tool), files: files.length, inputSize, work });
    router.push({ pathname: "/job/[id]", params: { id } });
  };
}
