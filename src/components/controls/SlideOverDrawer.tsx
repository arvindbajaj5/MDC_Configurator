import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SlideOverDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const SlideOverDrawer: React.FC<SlideOverDrawerProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/45">
      <div className="flex-1" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-white h-full border-l border-slate-300 shadow-2xl flex flex-col"
      >
        <div className="px-4 py-3 bg-brand-navy text-white flex items-start justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-300 truncate mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-cad hover:bg-white/10 text-white shrink-0"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">{children}</div>
        {footer && (
          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
