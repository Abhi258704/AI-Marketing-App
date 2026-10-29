import { cn } from "@/lib/cn";

export function Card({ className, children, ...props }) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03)]", className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export const CardBody = ({ className, children }) => (
  <div className={cn("p-5", className)}>{children}</div>
);

export function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-700">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Stat({ label, value, hint, icon: Icon, children, className }) {
  return (
    <div className={cn("rounded-xl border border-line bg-surface p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted" aria-hidden />}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}
