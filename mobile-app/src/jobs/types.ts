import type { OutputFile, ProgressFn } from "@/engine/core";
import type { SavedResult } from "@/files/output";

export type Job = {
  id: string;
  slug: string;
  title: string;
  startedAt: number;
  inputSize: number;
  /** Shown the finished result to the person at least once. */
  seen: boolean;
} & ({ status: "running"; step: string; ratio?: number } | { status: "done"; results: SavedResult[] } | { status: "error"; message: string });

export type StartArgs = { slug: string; title: string; files: number; inputSize: number; work: (progress: ProgressFn) => Promise<OutputFile[]> };

/** Jobs worth showing on the home screen: still working, or finished but not looked at yet. */
export function activeJobs(jobs: Job[]): Job[] {
  return jobs.filter((j) => j.status === "running" || !j.seen);
}
