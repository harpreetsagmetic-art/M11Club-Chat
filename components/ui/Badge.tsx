import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-md bg-accent px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-black",
        className,
      )}
    >
      {children}
    </span>
  );
}
