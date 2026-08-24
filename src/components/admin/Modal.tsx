"use client";

import * as React from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Trap Tab/Shift+Tab within the modal so keyboard users can't tab
      // into the page content behind the overlay while it's open.
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);

    // Move focus into the modal on open, and restore it to whatever
    // triggered the modal on close — the standard WAI-ARIA dialog pattern.
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 py-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`w-full ${maxWidth} rounded-2xl border border-line bg-paper-raised p-6 shadow-xl outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-target rounded-full p-1 text-ink-soft hover:bg-ink/5 hover:text-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
