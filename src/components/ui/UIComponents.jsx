import React from 'react';
import { Loader2, XCircle, CheckCircle, X, Trash2, RotateCcw } from 'lucide-react';

export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4 h-full">
    <Loader2 className="animate-spin text-accent" size={32} />
  </div>
);

export const ToastContainer = ({ toasts, removeToast }) => (
  <div className="toast-stack z-[300] flex flex-col gap-2 sm:w-full sm:max-w-xs pointer-events-none" role="status" aria-live="polite">
    {toasts.map(toast => (
      <div
        key={toast.id}
        className={`pointer-events-auto flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-xl bg-elevated border shadow-xl shadow-black/40 animate-slide-in ${toast.type === 'error' ? 'border-danger/40' : 'border-success/35'}`}
      >
        {toast.type === 'error'
          ? <XCircle size={18} className="shrink-0 text-danger" />
          : <CheckCircle size={18} className="shrink-0 text-success" />}
        <p className="text-sm font-medium text-fg flex-1 min-w-0 break-words py-1.5">{toast.message}</p>
        <button onClick={() => removeToast(toast.id)} aria-label="Dismiss" className="ui-icon-btn w-9 h-9">
          <X size={16}/>
        </button>
      </div>
    ))}
  </div>
);

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isDanger }) => {
  if (!isOpen) return null;
  return (
    <div className="ui-overlay overlay-safe animate-fade-in">
      <div className="ui-modal max-w-sm p-6" role="alertdialog" aria-modal="true">
        <div className="flex flex-col items-center text-center">
          <div className={`p-4 rounded-full mb-4 ${isDanger ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'}`}>
            {isDanger ? <Trash2 size={26} /> : <RotateCcw size={26} />}
          </div>
          <h3 className="text-lg font-semibold text-fg mb-1.5">{title}</h3>
          <p className="text-sm text-fg-muted mb-6">{message}</p>
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
            <button onClick={onClose} className="ui-btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={onConfirm} className={`${isDanger ? 'ui-btn-danger' : 'ui-btn-primary'} flex-1`}>
              {isDanger ? 'Confirm' : 'Proceed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Card = ({ title, value, subtext, icon: Icon, highlight }) => (
  <div
    className={`p-4 sm:p-5 min-w-0 rounded-card border flex flex-col justify-between h-full ${highlight ? 'bg-accent/10 border-accent/30' : 'bg-surface border-line'}`}
  >
    <div className="mb-4">
      <Icon size={18} className={highlight ? 'text-accent' : 'text-fg-subtle'} />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.04em] text-fg-muted mb-1.5">{title}</p>
      <h3 className="text-lg sm:text-xl 2xl:text-2xl font-bold leading-tight break-words tabular-nums text-fg">{value}</h3>
      {subtext && <p className="text-xs text-fg-subtle mt-1 tabular-nums">{subtext}</p>}
    </div>
  </div>
);
