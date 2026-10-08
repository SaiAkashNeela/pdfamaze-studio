import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect } from "react";
import { View } from "react-native";
import { Result } from "@/flow/Result";
import { Working } from "@/flow/Working";
import { t } from "@/i18n";
import { useJobs } from "@/jobs/JobsProvider";
import { setViewingJob } from "@/jobs/viewing";
import { space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Notice } from "@/ui/Notice";
import { Screen } from "@/ui/Screen";

/** One job: live progress while it runs, then the finished files (or a calm error). */
export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { jobs, markSeen, dismiss } = useJobs();
  const job = jobs.find((j) => j.id === id);
  const finished = job?.status === "done" || job?.status === "error";

  useFocusEffect(
    useCallback(() => {
      setViewingJob(String(id));
      return () => setViewingJob(null);
    }, [id]),
  );

  useEffect(() => {
    if (finished && id) markSeen(String(id));
  }, [finished, id, markSeen]);

  if (!job) return <Redirect href="/" />;

  const again = () => {
    dismiss(job.id);
    router.replace({ pathname: "/tool/[slug]", params: { slug: job.slug } });
  };

  if (job.status === "running") {
    return <Working status={job.step} ratio={job.ratio} onLeave={() => router.navigate("/")} />;
  }

  if (job.status === "error") {
    return (
      <Screen back onBack={() => router.navigate("/")}>
        <View style={{ gap: space.lg, marginTop: space.xl }}>
          <Notice kind="error" title={t("error.title")} body={job.message} />
          <Button label={t("common.tryAgain")} onPress={again} />
          <Button kind="ghost" label={t("result.home")} onPress={() => router.navigate("/")} />
        </View>
      </Screen>
    );
  }

  return <Result results={job.results} inputSize={job.inputSize} showSavings={job.slug === "compress"} onAgain={again} />;
}
