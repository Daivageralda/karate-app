"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const PENDING_TOAST_KEY = "eo-karate.pending-toast";
const TOAST_DURATION_MS = 3600;

const ToastContext = createContext(null);

const toneClassMap = Object.freeze({
  success: "border-app-accent",
  error: "border-app-danger",
  neutral: "border-app-border",
});

const toneDotClassMap = Object.freeze({
  success: "bg-app-accent",
  error: "bg-app-danger",
  neutral: "bg-app-text-secondary",
});

const toneProgressClassMap = Object.freeze({
  success: "bg-app-accent",
  error: "bg-app-danger",
  neutral: "bg-app-text-secondary",
});

const createToastId = () => {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function ToastProvider({ children }) {
  const pathname = usePathname();
  const [toasts, setToasts] = useState([]);
  const timerMapRef = useRef(new Map());

  const dismissToast = useCallback((toastId) => {
    const activeTimer = timerMapRef.current.get(toastId);
    if (activeTimer) {
      clearTimeout(activeTimer);
      timerMapRef.current.delete(toastId);
    }

    setToasts((previousValue) => previousValue.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback((toastInput) => {
    const id = createToastId();
    const tone = typeof toastInput?.tone === "string" ? toastInput.tone : "neutral";
    const title = typeof toastInput?.title === "string" && toastInput.title.trim().length > 0
      ? toastInput.title.trim()
      : "Informasi";
    const message = typeof toastInput?.message === "string" && toastInput.message.trim().length > 0
      ? toastInput.message.trim()
      : "Aksi selesai diproses.";
    const duration = typeof toastInput?.duration === "number" && toastInput.duration > 0
      ? toastInput.duration
      : TOAST_DURATION_MS;

    setToasts((previousValue) => {
      const nextValue = [...previousValue, { id, tone, title, message, duration }];
      return nextValue.slice(-4);
    });

    const timeoutId = setTimeout(() => {
      dismissToast(id);
    }, duration);

    timerMapRef.current.set(id, timeoutId);
    return id;
  }, [dismissToast]);

  const queueToast = useCallback((toastInput) => {
    if (typeof window === "undefined") {
      return;
    }

    const payload = {
      tone: typeof toastInput?.tone === "string" ? toastInput.tone : "neutral",
      title: typeof toastInput?.title === "string" ? toastInput.title : "Informasi",
      message: typeof toastInput?.message === "string" ? toastInput.message : "Aksi selesai diproses.",
      duration: typeof toastInput?.duration === "number" ? toastInput.duration : TOAST_DURATION_MS,
    };

    window.sessionStorage.setItem(PENDING_TOAST_KEY, JSON.stringify(payload));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const pendingToast = window.sessionStorage.getItem(PENDING_TOAST_KEY);
    if (!pendingToast) {
      return;
    }

    window.sessionStorage.removeItem(PENDING_TOAST_KEY);

    let restorePayload = null;

    try {
      restorePayload = JSON.parse(pendingToast);
    } catch {
      restorePayload = {
        tone: "neutral",
        title: "Informasi",
        message: "Aksi sebelumnya telah diproses.",
      };
    }

    const timeoutId = window.setTimeout(() => {
      showToast(restorePayload);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pathname, showToast]);

  useEffect(() => {
    const timerMap = timerMapRef.current;

    return () => {
      timerMap.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timerMap.clear();
    };
  }, []);

  const contextValue = useMemo(() => {
    return {
      showToast,
      queueToast,
      dismissToast,
    };
  }, [dismissToast, queueToast, showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      <div aria-live="polite" className="pointer-events-none fixed right-4 top-4 z-70 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
        {toasts.map((toast) => {
          const toneClassName = toneClassMap[toast.tone] || toneClassMap.neutral;
          const dotClassName = toneDotClassMap[toast.tone] || toneDotClassMap.neutral;
          const progressClassName = toneProgressClassMap[toast.tone] || toneProgressClassMap.neutral;

          return (
            <section
              key={toast.id}
              className={`pointer-events-auto overflow-hidden rounded-2xl border bg-app-surface px-4 py-3 shadow-xl ${toneClassName}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 inline-block h-2.5 w-2.5 flex-none rounded-full ${dotClassName}`} />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-app-text-primary">{toast.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-app-text-secondary">{toast.message}</p>
                </div>

                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border border-app-border bg-app-surface-muted text-xs text-app-text-secondary transition hover:border-app-accent hover:text-app-accent"
                >
                  x
                </button>
              </div>

              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-app-surface-muted">
                <span
                  className={`block h-full w-full origin-left toast-progress-shrink ${progressClassName}`}
                  style={{ animationDuration: `${toast.duration}ms` }}
                />
              </div>
            </section>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes toast-progress-shrink {
          from {
            transform: scaleX(1);
          }

          to {
            transform: scaleX(0);
          }
        }

        .toast-progress-shrink {
          animation-name: toast-progress-shrink;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contextValue = useContext(ToastContext);
  if (!contextValue) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return contextValue;
}
