import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-400',
    cardClass: 'border-emerald-500/25 bg-emerald-500/10',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-rose-400',
    cardClass: 'border-rose-500/25 bg-rose-500/10',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-400',
    cardClass: 'border-amber-500/25 bg-amber-500/10',
  },
  info: {
    icon: Info,
    iconClass: 'text-cyan-400',
    cardClass: 'border-cyan-500/25 bg-cyan-500/10',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((payload) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = {
      id,
      type: payload.type || 'info',
      title: payload.title || 'Notice',
      message: payload.message || '',
      durationMs: payload.durationMs ?? 5000,
    };

    setToasts((prev) => [next, ...prev].slice(0, 5));
    if (next.durationMs > 0) {
      setTimeout(() => dismissToast(id), next.durationMs);
    }
    return id;
  }, [dismissToast]);

  const value = useMemo(() => ({ toast, dismissToast }), [toast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] w-[min(420px,calc(100vw-2rem))] space-y-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((item) => {
            const style = TOAST_STYLES[item.type] || TOAST_STYLES.info;
            const Icon = style.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                className={`glass-strong border ${style.cardClass} pointer-events-auto`}
              >
                <div className="p-3 flex gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${style.iconClass}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-base-100">{item.title}</p>
                    {item.message && <p className="text-xs text-base-300 mt-0.5 leading-relaxed">{item.message}</p>}
                  </div>
                  <button
                    onClick={() => dismissToast(item.id)}
                    className="p-1 rounded hover:bg-white/[0.08] text-base-400 hover:text-base-100 transition-colors"
                    aria-label="Dismiss notification"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
