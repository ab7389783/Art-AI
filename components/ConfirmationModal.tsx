
import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
  variant?: 'danger' | 'neutral' | 'success';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isDanger = false,
  variant
}) => {
  if (!isOpen) return null;

  const effectiveVariant = variant || (isDanger ? 'danger' : 'neutral');

  const styles = {
    danger: {
      iconBg: 'bg-red-900/20',
      iconColor: 'text-red-500',
      button: 'bg-red-600 hover:bg-red-500 shadow-red-900/20 text-white'
    },
    success: {
      iconBg: 'bg-green-900/20',
      iconColor: 'text-green-500',
      button: 'bg-green-600 hover:bg-green-500 shadow-green-900/20 text-white'
    },
    neutral: {
      iconBg: 'bg-zinc-800',
      iconColor: 'text-zinc-400',
      button: 'bg-zinc-100 text-zinc-900 hover:bg-white'
    }
  }[effectiveVariant];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl max-w-sm w-full overflow-hidden transform scale-100 transition-all">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${styles.iconBg}`}>
                {effectiveVariant === 'danger' ? (
                    <svg className={`w-6 h-6 ${styles.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                ) : effectiveVariant === 'success' ? (
                    <svg className={`w-6 h-6 ${styles.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className={`w-6 h-6 ${styles.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100 leading-tight">{title}</h3>
            </div>
          </div>
          
          {message && (
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              {message}
            </p>
          )}

          {children && (
             <div className="mb-6">
                {children}
             </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded text-xs font-bold shadow-lg transition-colors ${styles.button}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
