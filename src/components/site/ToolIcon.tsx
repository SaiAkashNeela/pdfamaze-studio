import {
  Combine,
  Scissors,
  Minimize2,
  RotateCw,
  LayoutGrid,
  Stamp,
  ImagePlus,
  Images,
  ShieldCheck,
  Unlock,
  ListOrdered,
  FileText,
  Contrast,
  FileCode2,
  FileBox,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tool, ToolTag } from "@/lib/tools";

const TOOL_ICONS: Record<string, LucideIcon> = {
  merge: Combine,
  split: Scissors,
  compress: Minimize2,
  rotate: RotateCw,
  organize: LayoutGrid,
  watermark: Stamp,
  "images-to-pdf": ImagePlus,
  "pdf-to-images": Images,
  "protect-pdf": ShieldCheck,
  "remove-password": Unlock,
  "page-numbers": ListOrdered,
  "extract-text": FileText,
  grayscale: Contrast,
  "html-to-pdf": FileCode2,
};

const tagClasses: Record<ToolTag, string> = {
  ORGANIZE: "bg-tag-organize text-tag-icon-foreground",
  OPTIMIZE: "bg-tag-optimize text-tag-icon-foreground",
  EDIT: "bg-tag-edit text-tag-icon-foreground",
  CONVERT: "bg-tag-convert text-tag-icon-foreground",
  SECURITY: "bg-tag-security text-tag-icon-foreground",
  SHARE: "bg-tag-share text-tag-icon-foreground",
};

export function ToolIcon({
  tool,
  compact = false,
  className,
}: {
  tool: Tool;
  compact?: boolean;
  className?: string;
}) {
  const IconComponent = TOOL_ICONS[tool.slug] || FileBox;
  const iconSize = compact ? "h-4 w-4" : "h-5 w-5";

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-[10px] shadow-sm transition-transform duration-200 group-hover:scale-105",
        compact ? "h-9 w-9" : "h-10 w-10",
        tool.tag ? tagClasses[tool.tag] : "bg-muted text-muted-foreground",
        className,
      )}
      aria-hidden
    >
      <IconComponent className={cn(iconSize, "stroke-[1.8]")} />
    </span>
  );
}
