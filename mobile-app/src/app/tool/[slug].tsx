import { Redirect, useLocalSearchParams } from "expo-router";
import { FormFlow } from "@/flow/FormFlow";
import { SignFlow } from "@/flow/sign/SignFlow";
import { ToolFlow } from "@/flow/ToolFlow";
import { getTool } from "@/tools/registry";

export default function ToolScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const tool = getTool(String(slug));
  if (!tool) return <Redirect href="/" />;
  if (tool.workbench === "sign") return <SignFlow tool={tool} />;
  if (tool.workbench === "form-fill") return <FormFlow tool={tool} />;
  return <ToolFlow tool={tool} />;
}
