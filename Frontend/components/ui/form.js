"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-muted/70 transition-colors disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted";

export function Field({ label, hint, error, required, children, className, htmlFor, id }) {
  const generated = useId();
  const fieldId = id || htmlFor || generated;
  const describedBy = [error ? `${fieldId}-error` : null, hint ? `${fieldId}-hint` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-red-600" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children({ id: fieldId, "aria-describedby": describedBy || undefined, "aria-invalid": error ? true : undefined })}
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ label, hint, error, required, className, wrapperClassName, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName} id={props.id}>
      {(a11y) => (
        <input
          {...a11y}
          required={required}
          className={cn(control, "h-10", error ? "border-red-400" : "border-line-strong", className)}
          {...props}
        />
      )}
    </Field>
  );
}

export function Textarea({ label, hint, error, required, className, wrapperClassName, rows = 4, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName} id={props.id}>
      {(a11y) => (
        <textarea
          {...a11y}
          rows={rows}
          required={required}
          className={cn(control, "py-2 leading-relaxed", error ? "border-red-400" : "border-line-strong", className)}
          {...props}
        />
      )}
    </Field>
  );
}

export function Select({ label, hint, error, required, className, wrapperClassName, children, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName} id={props.id}>
      {(a11y) => (
        <select
          {...a11y}
          required={required}
          className={cn(control, "h-10 pr-8", error ? "border-red-400" : "border-line-strong", className)}
          {...props}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

export function Checkbox({ label, description, className, ...props }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-line-strong accent-brand-700"
        {...props}
      />
      <span className="text-sm">
        <span className="font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}
