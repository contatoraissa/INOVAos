import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
export function Page({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("animate-page space-y-6", className)}>
      <header className="page-heading">
        <div>
          <p className="eyebrow mb-3">INOVA · CUIDADO EM PERSPECTIVA</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
export function StatusBadge({ children, fresh = false }: { children: ReactNode; fresh?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium",
        fresh ? "bg-brand-soft text-brand-deep" : "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", fresh ? "bg-brand-deep" : "bg-muted-foreground/50")}
      />
      {children}
    </span>
  );
}
export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="surface flex min-h-60 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-xl bg-brand-soft p-3 text-brand-deep">
        <Inbox className="size-6" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
