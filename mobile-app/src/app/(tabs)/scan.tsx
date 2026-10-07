import { ToolFlow } from "@/flow/ToolFlow";
import { getTool } from "@/tools/registry";

const photosToPdf = getTool("images-to-pdf")!;

/** Scan tab: Photos to PDF, opening the camera straight away. */
export default function ScanScreen() {
  return <ToolFlow tool={photosToPdf} inTab autoSource="camera" />;
}
