import { Link } from "@tanstack/react-router";

export function PrivacyNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-muted-foreground text-[12.5px] leading-relaxed ${className}`}>
      <span className="text-foreground font-medium">Runs on your device.</span> This tool reads
      your file in the browser tab and writes the result back to your downloads. Nothing is sent to
      a server.{" "}
      <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
        How this works
      </Link>
    </p>
  );
}
