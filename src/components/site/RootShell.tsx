import { HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { themeInitScript } from "@/lib/theme";

export function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
