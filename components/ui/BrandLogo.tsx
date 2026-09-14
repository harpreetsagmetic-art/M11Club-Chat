import { cn } from "@/lib/utils";

const LOGO_URL =
  "https://m11club.com.au/wp-content/uploads/2026/06/image-1.png";

const sizeClasses = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

export function BrandLogo({
  size = "md",
  glow = false,
  className,
}: {
  size?: "sm" | "md" | "lg";
  glow?: boolean;
  className?: string;
}) {
  return (
    <img
      src={LOGO_URL}
      alt="M11Club"
      className={cn(
        "shrink-0 rounded-full object-cover ring-1 ring-border",
        sizeClasses[size],
        glow && "animate-brand-glow",
        className,
      )}
    />
  );
}
