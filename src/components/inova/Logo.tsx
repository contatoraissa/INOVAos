import { cn } from "@/lib/utils";
import { inovaInfinityPath, inovaLogoCyan } from "@/data/inova-brand";

function InfinityMark({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 160 80"
      fill="none"
      aria-hidden="true"
      className={compact ? "h-[18px] w-9 flex-none" : "h-[0.96em] w-[1.8em] flex-none"}
      style={{ color: inovaLogoCyan }}
    >
      <path d={inovaInfinityPath} stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
    </svg>
  );
}

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
        role="img"
        className={cn("inline-flex items-center justify-center", className)}
      >
        <InfinityMark compact />
      </span>
    );
  return (
    <div
      className={cn(
        "inline-flex items-center gap-[0.087em] font-display text-[1.7rem] font-normal leading-none tracking-[0.15em]",
        light ? "text-sidebar-foreground" : "text-foreground",
        className,
      )}
      aria-label="INOVA Laboratório"
      role="img"
    >
      <span aria-hidden="true">IN</span>
      <InfinityMark />
      <span aria-hidden="true">VA</span>
    </div>
  );
}
