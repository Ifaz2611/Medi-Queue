"use client";

// Reusable popup notification (toast) system.
// Provides a `useToast()` hook exposing success/error/info/warning helpers.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ToastContainer from "@/components/Toast";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  show: (message: string, variant?: ToastVariant, duration?: number) => string;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info", duration = 3500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => [...prev, { id, message, variant, duration }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const success = useCallback(
    (message: string, duration?: number) => show(message, "success", duration),
    [show],
  );
  const error = useCallback(
    (message: string, duration?: number) => show(message, "error", duration),
    [show],
  );
  const info = useCallback(
    (message: string, duration?: number) => show(message, "info", duration),
    [show],
  );
  const warning = useCallback(
    (message: string, duration?: number) => show(message, "warning", duration),
    [show],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, show, success, error, info, warning, dismiss }),
    [toasts, show, success, error, info, warning, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
