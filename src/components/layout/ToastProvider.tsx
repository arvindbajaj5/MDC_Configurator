import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  detail?: string;
}

interface ToastContextValue {
  pushToast: (tone: ToastTone, title: string, detail?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (tone: ToastTone, title: string, detail?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, tone, title, detail }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 7500 : 4500);
    },
    [dismiss]
  );

  const toneStyle: Record<ToastTone, string> = {
    success: 'border-l-4 border-l-brand-emerald bg-white border-slate-200 text-slate-900',
    error: 'border-l-4 border-l-red-600 bg-white border-red-200 text-slate-900',
    warning: 'border-l-4 border-l-brand-amber bg-white border-amber-200 text-slate-900',
    info: 'border-l-4 border-l-brand-navy bg-white border-slate-200 text-slate-900'
  };

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-16 right-3 md:bottom-4 md:right-4 z-50 flex flex-col gap-2 w-[min(92vw,360px)] pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto border rounded-cad shadow-lg px-3 py-2.5 flex items-start gap-2.5 ${toneStyle[t.tone]}`}
          >
            <div className="mt-0.5 shrink-0">
              {t.tone === 'success' && <CheckCircle2 className="w-4 h-4 text-brand-emerald" />}
              {t.tone === 'error' && <AlertTriangle className="w-4 h-4 text-red-600" />}
              {t.tone === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
              {t.tone === 'info' && <Info className="w-4 h-4 text-brand-navy" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold leading-tight">{t.title}</p>
              {t.detail && <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{t.detail}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-slate-400 hover:text-slate-700 p-0.5"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
