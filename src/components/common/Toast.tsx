/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  type?: ToastType;
  message: string;
  /** ms before auto-dismiss. 0 disables it. */
  duration?: number;
}

export interface ToastApi {
  show: (options: ToastOptions) => string;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  dismiss: (id: string) => void;
}

interface ToastEntry {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;

const ToastContext = createContext<ToastApi | null>(null);

// Used when a component calls useToast() outside the provider (unit tests,
// isolated stories). Warning instead of throwing keeps migrations incremental.
const NOOP_TOAST: ToastApi = {
  show: ({ type = 'info', message }) => {
    console.warn(`[toast:${type}] ${message} (no ToastProvider mounted)`);
    return '';
  },
  success: (message) => {
    console.warn(`[toast:success] ${message} (no ToastProvider mounted)`);
    return '';
  },
  error: (message) => {
    console.warn(`[toast:error] ${message} (no ToastProvider mounted)`);
    return '';
  },
  info: (message) => {
    console.warn(`[toast:info] ${message} (no ToastProvider mounted)`);
    return '';
  },
  dismiss: () => {}
};

const STYLES: Record<ToastType, { border: string; icon: string; Icon: typeof Info }> = {
  success: { border: 'border-l-green-600', icon: 'text-green-600', Icon: CheckCircle2 },
  error: { border: 'border-l-red-600', icon: 'text-red-600', Icon: AlertCircle },
  info: { border: 'border-l-blue-600', icon: 'text-blue-600', Icon: Info }
};

function ToastItem({ entry, onDismiss }: { entry: ToastEntry; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const { border, icon, Icon } = STYLES[entry.type];

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`flex items-start gap-3 w-full px-3.5 py-3 bg-white border border-neutral-200 border-l-4 ${border} rounded-lg transition-all duration-200 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <Icon className={`w-[18px] h-[18px] mt-px flex-shrink-0 ${icon}`} aria-hidden="true" />
      <p className="flex-1 text-[13px] leading-5 text-neutral-800 break-words">{entry.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(entry.id)}
        aria-label="Close"
        className="-mr-1 p-0.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const timers = useRef(new Map<string, number>());
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const show = useCallback(
    ({ type = 'info', message, duration }: ToastOptions) => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      const ms = duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION);

      setToasts((prev) => [...prev, { id, type, message, duration: ms }]);

      if (ms > 0) {
        const timer = window.setTimeout(() => {
          timers.current.delete(id);
          setToasts((prev) => prev.filter((entry) => entry.id !== id));
        }, ms);
        timers.current.set(id, timer);
      }
      return id;
    },
    []
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, duration) => show({ type: 'success', message, duration }),
      error: (message, duration) => show({ type: 'error', message, duration }),
      info: (message, duration) => show({ type: 'info', message, duration }),
      dismiss
    }),
    [show, dismiss]
  );

  const errors = toasts.filter((entry) => entry.type === 'error');
  const others = toasts.filter((entry) => entry.type !== 'error');

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="pointer-events-none fixed z-[120] top-4 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm sm:top-auto sm:left-auto sm:translate-x-0 sm:bottom-4 sm:right-4 flex flex-col gap-2">
            <div role="alert" aria-live="assertive" aria-atomic="false" className="flex flex-col gap-2">
              {errors.map((entry) => (
                <div key={entry.id} className="pointer-events-auto">
                  <ToastItem entry={entry} onDismiss={dismiss} />
                </div>
              ))}
            </div>
            <div role="status" aria-live="polite" aria-atomic="false" className="flex flex-col gap-2">
              {others.map((entry) => (
                <div key={entry.id} className="pointer-events-auto">
                  <ToastItem entry={entry} onDismiss={dismiss} />
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): { toast: ToastApi } {
  const ctx = useContext(ToastContext);
  return { toast: ctx ?? NOOP_TOAST };
}
