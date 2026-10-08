import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  light = false,
  className,
}: {
  compact?: boolean;
  light?: boolean;
  className?: string;
}) {
  if (compact)
    return (
      <span
        aria-label="INOVA"
        className={cn("font-display text-3xl font-semibold text-brand", className)}
      >
        ∞
      </span>
    );
  return (
    <div
      className={cn(
        "flex items-center gap-2.5",
        light ? "text-sidebar-foreground" : "text-foreground",
        className,
      )}
      aria-label="INOVA Laboratório"
    >
      <span className="font-display text-[1.7rem] font-medium leading-none tracking-[0.2em]">
        IN<span className="text-brand">∞</span>VA
      </span>
    </div>
  );
}
