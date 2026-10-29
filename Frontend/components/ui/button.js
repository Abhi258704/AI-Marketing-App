import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 shadow-sm disabled:bg-brand-700/50",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-sunken disabled:text-muted/60",
  ghost: "text-ink hover:bg-sunken disabled:text-muted/60",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:bg-red-600/50",
  "danger-outline":
    "bg-surface text-red-700 border border-red-200 hover:bg-red-50 disabled:text-red-700/50",
};

const sizes = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
};

export function buttonClasses({ variant = "primary", size = "md", className } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "primary", size = "md", className, children, ...props }) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
