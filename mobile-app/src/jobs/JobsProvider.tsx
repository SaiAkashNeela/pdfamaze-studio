/**
 * Background jobs. A tool hands its work to this provider, which lives at the root of the app,
 * so the conversion keeps going while the person leaves the tool screen and does something else.
 * Finished files wait here until they are saved or dismissed.
 *
 * The PDF engine runs on the app's JavaScript thread: if the person switches to another app, the
 * phone pauses it after a few seconds, and it carries on from the same point when they return.
 */
import * as Haptics from "expo-haptics";
import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { PdfError } from "@/engine/core";
import { writeResults } from "@/files/output";
import { t } from "@/i18n";
import { recordToolRun } from "@/stats/db";
import type { Job, StartArgs } from "./types";

type JobsValue = {
  jobs: Job[];
  start: (args: StartArgs) => string;
  markSeen: (id: string) => void;
  dismiss: (id: string) => void;
};

const JobsContext = createContext<JobsValue | null>(null);

let jobCounter = 0;

function nextJobId() {
  jobCounter += 1;
  return `job-${Date.now()}-${jobCounter}`;
}

type Patch = (job: Job) => Job;

/** Does the work, saves the results and records the run in the local stats. */
async function runJob({ slug, files, inputSize, work }: StartArgs, update: (patch: Patch) => void) {
  try {
    const outputs = await work((step, ratio) => update((j) => (j.status === "running" ? { ...j, step, ratio } : j)));
    const results = writeResults(outputs);
    recordToolRun(slug, true, files, inputSize);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    update((j) => ({ id: j.id, slug: j.slug, title: j.title, startedAt: j.startedAt, inputSize: j.inputSize, seen: j.seen, status: "done", results }));
  } catch (e) {
    recordToolRun(slug, false, files, inputSize);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    if (!(e instanceof PdfError)) console.warn("[PDFamaze] job failed", e);
    const message = e instanceof PdfError ? e.message : t("error.generic");
    update((j) => ({ id: j.id, slug: j.slug, title: j.title, startedAt: j.startedAt, inputSize: j.inputSize, seen: j.seen, status: "error", message }));
  }
}

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);

  const value = useMemo<JobsValue>(() => {
    const update = (id: string, patch: Patch) => setJobs((all) => all.map((j) => (j.id === id ? patch(j) : j)));

    const start = (args: StartArgs) => {
      const id = nextJobId();
      const base = { id, slug: args.slug, title: args.title, startedAt: Date.now(), inputSize: args.inputSize, seen: false };
      setJobs((all) => [{ ...base, status: "running", step: t("tool.working") }, ...all]);
      // Yield first so the progress screen paints before pdf-lib starts holding the thread.
      setTimeout(() => void runJob(args, (patch) => update(id, patch)), 60);
      return id;
    };

    return {
      jobs,
      start,
      markSeen: (id) => update(id, (j) => (j.seen ? j : { ...j, seen: true })),
      dismiss: (id) => setJobs((all) => all.filter((j) => j.id !== id)),
    };
  }, [jobs]);

  return <JobsContext value={value}>{children}</JobsContext>;
}

export function useJobs(): JobsValue {
  const value = use(JobsContext);
  if (!value) throw new Error("useJobs must be used inside JobsProvider");
  return value;
}
