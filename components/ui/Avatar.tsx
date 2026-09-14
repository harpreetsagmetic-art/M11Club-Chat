import { cn } from "@/lib/utils";
import { initialsFromName } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-soft to-accent-strong font-semibold text-white",
        sizeClasses[size],
        className,
      )}
    >
      {initialsFromName(name)}
    </div>
  );
}
