
import React, { useEffect } from 'react';
import { Toast } from '../types';

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[300] flex flex-col items-center gap-2 w-[90vw] max-w-md pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    // Longer timeout for errors to allow reading time
    const duration = toast.level === 'error' ? 8000 : 5000;
    const timer = setTimeout(() => {
      onRemove();
    }, duration);
    return () => clearTimeout(timer);
  }, [onRemove, toast.level]);

  const styles = {
    info: 'bg-blue-950/90 border-blue-500 text-blue-200',
    success: 'bg-green-950/90 border-green-500 text-green-200',
    warning: 'bg-orange-950/90 border-orange-500 text-orange-200',
    error: 'bg-red-950/90 border-red-500 text-red-200',
  };

  // Only show the first line of the message for toasts to avoid massive error dumps covering the screen
  const displayMessage = toast.message.split('\n')[0];

  return (
    <div className={`pointer-events-auto flex items-start justify-between w-full p-3 rounded-sm border shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 fade-in duration-300 ${styles[toast.level]}`}>
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="shrink-0 pt-0.5">
            {toast.level === 'success' && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
            {toast.level === 'error' && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>}
            {toast.level === 'warning' && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>}
            {toast.level === 'info' && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>}
        </div>
        <span className="text-[11px] font-bold tracking-wider truncate block max-w-full leading-tight" title={toast.message}>
            {displayMessage}
        </span>
      </div>
      <button onClick={onRemove} className="ml-4 p-1 hover:bg-white/10 rounded transition-colors text-current opacity-60 hover:opacity-100 shrink-0">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
};
