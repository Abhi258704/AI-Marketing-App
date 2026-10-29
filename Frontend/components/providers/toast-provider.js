"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />,
  error: <XCircle className="h-5 w-5 text-red-600" aria-hidden />,
  warning: <TriangleAlert className="h-5 w-5 text-amber-600" aria-hidden />,
  info: <Info className="h-5 w-5 text-sky-600" aria-hidden />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, title, { message, action, duration = 6000 } = {}) => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-3), { id, type, title, message, action }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (title, opts) => push("success", title, opts),
      error: (title, opts) => push("error", title, { duration: 9000, ...opts }),
      warning: (title, opts) => push("warning", title, opts),
      info: (title, opts) => push("info", title, opts),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-lg"
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{t.title}</p>
              {t.message && <p className="mt-0.5 text-sm text-muted">{t.message}</p>}
              {t.action && (
                <button
                  type="button"
                  className="mt-1.5 text-sm font-medium text-brand-700 hover:underline"
                  onClick={() => {
                    t.action.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded p-1 text-muted hover:bg-sunken hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
};
