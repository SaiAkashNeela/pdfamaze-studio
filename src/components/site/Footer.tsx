import { Link } from "@tanstack/react-router";
import { siteConfig } from "@/lib/site-config";
import { LogoMark } from "./Logo";

export function Footer() {
  return (
    <footer className="border-border mt-24 border-t">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <div className="text-foreground flex items-center gap-2">
            <LogoMark className="h-[18px] w-[18px]" />
            <span className="text-[14px] font-semibold tracking-[-0.02em]">
              {siteConfig.name}
            </span>
          </div>
          <p className="text-muted-foreground mt-3 text-[13.5px] leading-relaxed">
            PDF tools that run inside your browser tab. Your files are read on your device and
            never sent to a server.
          </p>
        </div>

        <nav aria-label="Product" className="text-[13.5px]">
          <h2 className="label-xs">Product</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link to="/tools" className="text-muted-foreground hover:text-foreground">
                Tools
              </Link>
            </li>
            <li>
              <Link to="/coffee" className="text-muted-foreground hover:text-foreground">
                Support the project
              </Link>
            </li>
            {siteConfig.githubUrl ? (
              <li>
                <a
                  href={siteConfig.githubUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-muted-foreground hover:text-foreground"
                >
                  GitHub
                </a>
              </li>
            ) : null}
          </ul>
        </nav>

        <nav aria-label="Legal" className="text-[13.5px]">
          <h2 className="label-xs">Legal</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground">
                Terms
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-[1180px] flex-col gap-1 px-4 py-5 font-mono text-[11.5px] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>
            {siteConfig.name} · {siteConfig.domain}
          </span>
          <span>Static site. No accounts, no server-side processing.</span>
        </div>
      </div>
    </footer>
  );
}
