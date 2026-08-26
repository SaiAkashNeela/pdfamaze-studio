import { Link } from "@tanstack/react-router";
import { Coffee, Github } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { LogoMark, Wordmark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { to: "/tools", label: "Tools" },
  { to: "/privacy", label: "Privacy" },
];

export function Navbar() {
  return (
    <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-[6px]">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="text-foreground flex items-center gap-2 rounded-[3px] py-1"
          aria-label={`${siteConfig.name} — home`}
        >
          <LogoMark className="h-[22px] w-[22px]" />
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="ml-2 flex items-center gap-1 sm:ml-4">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-muted-foreground hover:text-foreground rounded-[3px] px-2 py-1.5 text-[13.5px] transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {siteConfig.githubUrl ? (
            <a
              href={siteConfig.githubUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted-foreground hover:text-foreground hidden h-8 w-8 items-center justify-center rounded-[3px] transition-colors sm:inline-flex"
              aria-label="Source code on GitHub"
            >
              <Github className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </a>
          ) : null}
          <Link
            to="/coffee"
            className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 rounded-[3px] px-2 py-1.5 text-[13.5px] transition-colors sm:inline-flex"
            activeProps={{ className: "text-foreground" }}
          >
            <Coffee className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Support
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
