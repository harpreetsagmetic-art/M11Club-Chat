import { cn } from "@/lib/utils";

const rows = [
  { align: "start", width: "w-2/3" },
  { align: "end", width: "w-1/2" },
  { align: "start", width: "w-3/5" },
  { align: "start", width: "w-2/5" },
  { align: "end", width: "w-1/3" },
] as const;

export function MessageListSkeleton() {
  return (
    <div className="flex-1 space-y-4 overflow-hidden px-4 py-4" aria-hidden>
      {rows.map((row, index) => (
        <div key={index} className={cn("flex", row.align === "end" ? "justify-end" : "justify-start")}>
          <div className={cn("h-10 animate-pulse-soft rounded-2xl bg-surface-raised", row.width)} />
        </div>
      ))}
    </div>
  );
}