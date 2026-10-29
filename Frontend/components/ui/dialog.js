"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/cn";

// Built on the native <dialog>: focus trapping, Esc to close and inert background for free.
export function Modal({ open, onClose, title, description, children, footer, size = "md", busy = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
      aria-labelledby="modal-title"
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40",
        widths[size]
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id="modal-title" className="text-base font-semibold">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded p-1 text-muted hover:bg-sunken hover:text-ink disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = "Confirm",
  tone = "primary",
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      busy={loading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-2 text-sm leading-relaxed text-muted">{children}</div>
    </Modal>
  );
}
