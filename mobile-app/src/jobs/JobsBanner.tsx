/**
 * Home-screen list of background jobs: still working (with progress), or finished and waiting
 * to be saved. Tapping one opens it.
 */
import { router } from "expo-router";
import { ChevronRight, CircleCheck, TriangleAlert } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Text } from "@/ui/Text";
import { useJobs } from "./JobsProvider";
import { activeJobs, type Job } from "./types";

function JobRow({ job }: { job: Job }) {
  const { colors } = useTheme();
  const line =
    job.status === "running"
      ? job.ratio != null
        ? t("jobs.progress", { percent: Math.round(job.ratio * 100) })
        : t("tool.working")
      : job.status === "done"
        ? t("jobs.ready")
        : t("jobs.failed");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${job.title}. ${line}`}
      onPress={() => router.push({ pathname: "/job/[id]", params: { id: job.id } })}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: job.status === "done" ? colors.successSoft : job.status === "error" ? colors.destructiveSoft : colors.card,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      {job.status === "running" ? (
        <ActivityIndicator color={colors.accent} />
      ) : job.status === "done" ? (
        <CircleCheck size={24} color={colors.success} />
      ) : (
        <TriangleAlert size={24} color={colors.destructive} />
      )}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{job.title}</Text>
        <Text variant="small" tone="muted">
          {line}
        </Text>
      </View>
      <ChevronRight size={20} color={colors.mutedForeground} />
    </Pressable>
  );
}

export function JobsBanner() {
  const { jobs } = useJobs();
  const list = activeJobs(jobs);
  if (!list.length) return null;
  return (
    <View style={{ gap: space.sm, marginTop: space.lg }} accessibilityLiveRegion="polite">
      <Text variant="label" tone="muted">
        {t("jobs.title")}
      </Text>
      {list.map((job) => (
        <JobRow key={job.id} job={job} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 60,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm + 2,
  },
});
