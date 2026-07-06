"use client";

import {
  CheckCircle2,
  CircleAlert,
  Info,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type ToastKind = "success" | "error" | "warning" | "info" | "loading";
type ToastInput = {
  title: string;
  description?: string;
  kind?: ToastKind;
  duration?: number;
  action?: { label: string; onClick: () => void };
};
type ToastItem = ToastInput & { id: number };
type ToastContextValue = {
  showToast: (toast: ToastInput) => number;
  updateToast: (id: number, toast: ToastInput) => void;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const icons = {
  success: CheckCircle2,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
  loading: LoaderCircle,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (id: number, duration: number) => {
      const existing = timers.current.get(id);
      if (existing) window.clearTimeout(existing);
      if (duration > 0) {
        timers.current.set(
          id,
          window.setTimeout(() => dismissToast(id), duration),
        );
      }
    },
    [dismissToast],
  );

  const showToast = useCallback(
    (input: ToastInput) => {
      const id = ++nextId.current;
      const toast = { kind: "info" as const, duration: 4200, ...input, id };
      setToasts((current) => [...current.slice(-3), toast]);
      scheduleDismiss(id, toast.kind === "loading" ? 0 : toast.duration);
      return id;
    },
    [scheduleDismiss],
  );

  const updateToast = useCallback(
    (id: number, input: ToastInput) => {
      const toast = { kind: "info" as const, duration: 4200, ...input, id };
      setToasts((current) =>
        current.map((currentToast) => (currentToast.id === id ? toast : currentToast)),
      );
      scheduleDismiss(id, toast.kind === "loading" ? 0 : toast.duration);
    },
    [scheduleDismiss],
  );

  const value = useMemo(
    () => ({ showToast, updateToast, dismissToast }),
    [dismissToast, showToast, updateToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-4 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[24rem] sm:items-stretch"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const kind = toast.kind ?? "info";
          const Icon = icons[kind];
          return (
            <div
              key={toast.id}
              role={kind === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex w-full max-w-md animate-in items-start gap-3 rounded-2xl border bg-background/95 p-4 text-foreground shadow-2xl backdrop-blur-xl duration-300 fade-in slide-in-from-bottom-3",
                kind === "success" && "border-emerald-500/30",
                kind === "error" && "border-destructive/40",
                kind === "warning" && "border-amber-500/40",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  kind === "loading" && "animate-spin text-primary",
                  kind === "success" && "text-emerald-600",
                  kind === "error" && "text-destructive",
                  kind === "warning" && "text-amber-600",
                  kind === "info" && "text-primary",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {toast.description}
                  </p>
                )}
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      dismissToast(toast.id);
                    }}
                    className="mt-2 text-xs font-semibold text-primary hover:underline"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
