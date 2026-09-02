import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  Zap,
  X
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'realtime';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  realtime: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4500 }: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep up to 5 concurrent toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', title: title || 'Operación Exitosa', message });
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', title: title || 'Error', message, duration: 6000 });
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', title: title || 'Información', message });
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', title: title || 'Advertencia', message, duration: 5500 });
  }, [showToast]);

  const realtime = useCallback((message: string, title?: string) => {
    showToast({ type: 'realtime', title: title || '⚡ Actualización en Vivo', message, duration: 5000 });
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        success,
        error,
        info,
        warning,
        realtime,
      }}
    >
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {toasts.map((t) => {
          const isRealtime = t.type === 'realtime';
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all transform animate-in slide-in-from-bottom-5 duration-300 flex items-start gap-3 ${
                isRealtime
                  ? 'bg-slate-900/95 text-white border-amber-500/40 ring-1 ring-amber-500/30'
                  : isSuccess
                  ? 'bg-white/95 text-slate-900 border-emerald-300 ring-1 ring-emerald-500/20'
                  : isError
                  ? 'bg-white/95 text-slate-900 border-red-300 ring-1 ring-red-500/20'
                  : isWarning
                  ? 'bg-white/95 text-slate-900 border-amber-300 ring-1 ring-amber-500/20'
                  : 'bg-white/95 text-slate-900 border-slate-300'
              }`}
            >
              {/* Icon */}
              <div className="shrink-0 pt-0.5">
                {isRealtime && <Zap className="w-5 h-5 text-amber-400 animate-pulse" />}
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {isError && <AlertCircle className="w-5 h-5 text-red-600" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                {t.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                {t.title && (
                  <h4 className={`text-xs font-black leading-tight ${isRealtime ? 'text-amber-300' : 'text-slate-900'}`}>
                    {t.title}
                  </h4>
                )}
                <p className={`text-xs mt-0.5 leading-relaxed break-words ${isRealtime ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className={`p-1 rounded-lg shrink-0 cursor-pointer transition-all ${
                  isRealtime
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
