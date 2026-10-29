import { CheckCircle2, Info, Loader2, TriangleAlert, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

const tones = {
  neutral: "bg-sunken text-ink/80 border-line",
  info: "bg-sky-50 text-sky-800 border-sky-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  danger: "bg-red-50 text-red-800 border-red-200",
  brand: "bg-brand-50 text-brand-800 border-brand-200",
};

export function Badge({ tone = "neutral", className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

const alertIcons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: XCircle,
};

export function Alert({ tone = "info", title, children, action, className }) {
  const Icon = alertIcons[tone] || Info;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border p-3.5 text-sm", tones[tone], className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Couldn't load this" }) {
  return (
    <Alert
      tone="danger"
      title={title}
      action={
        onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    >
      {error?.message || "Something went wrong."}
    </Alert>
  );
}

export function Spinner({ className, label = "Loading" }) {
  return (
    <span role="status" className={cn("inline-flex items-center", className)}>
      <Loader2 className="h-5 w-5 animate-spin text-brand-700" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Skeleton({ className }) {
  return <div className={cn("skeleton rounded-lg", className)} aria-hidden />;
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-5" role="status">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-line-strong bg-surface/60 px-6 py-10 text-center",
        className
      )}
    >
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
