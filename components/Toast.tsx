"use client";

import {
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import type { ToastItem } from "@/lib/toast";

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const VARIANT_STYLES: Record<ToastItem["variant"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

const VARIANT_ICON: Record<ToastItem["variant"], typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="pointer-events-none fixed left-1/2 top-6 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col gap-3 px-4"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = VARIANT_ICON[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-4 rounded-2xl border-2 px-5 py-4 shadow-2xl backdrop-blur animate-toast-in ${VARIANT_STYLES[toast.variant]}`}
          >
            <Icon className="mt-0.5 h-6 w-6 shrink-0" />
            <p className="flex-1 text-base font-semibold leading-snug">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
