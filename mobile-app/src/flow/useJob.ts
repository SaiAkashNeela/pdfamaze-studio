import * as Haptics from "expo-haptics";
import { useState } from "react";
import { PdfError, type OutputFile, type ProgressFn } from "@/engine/core";
import { writeResults, type SavedResult } from "@/files/output";
import { t } from "@/i18n";

export type JobState =
  | { phase: "idle" }
  | { phase: "running"; status: string; ratio?: number }
  | { phase: "done"; results: SavedResult[]; inputSize: number }
  | { phase: "error"; message: string };

/** Runs one tool operation and tracks progress, results and a calm error message. */
export function useJob() {
  const [state, setState] = useState<JobState>({ phase: "idle" });

  const run = async (inputSize: number, work: (progress: ProgressFn) => Promise<OutputFile[]>) => {
    setState({ phase: "running", status: t("tool.working") });
    // Let the "working" screen paint before pdf-lib starts holding the JS thread.
    await new Promise((resolve) => setTimeout(resolve, 60));
    try {
      const outputs = await work((status, ratio) => setState({ phase: "running", status, ratio }));
      const results = writeResults(outputs);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setState({ phase: "done", results, inputSize });
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      const message = e instanceof PdfError ? e.message : t("error.generic");
      if (!(e instanceof PdfError)) console.warn("[PDFamaze] operation failed", e);
      setState({ phase: "error", message });
    }
  };

  return { state, run, reset: () => setState({ phase: "idle" }) };
}
