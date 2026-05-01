
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

// Standardized flex container for the bottom row of buttons across all screens
export const BottomButtonGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`flex items-center gap-2 w-full min-h-[2.5rem] ${className}`}>
    {children}
  </div>
);

export const ResetButton: React.FC<{ onClick: (e?: any) => void, title?: string }> = ({ onClick, title = "Reset" }) => (
    <button 
        onClick={onClick} 
        className="flex items-center gap-1 px-1.5 py-0.5 -mt-0.5 bg-red-950/40 border border-red-900/60 hover:bg-red-900/60 hover:border-red-700 text-red-400 hover:text-red-200 transition-all rounded-[2px]"
        title={title}
    >
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        <span className="text-[9px] font-bold tracking-tight truncate">Reset</span>
    </button>
);

export const IconButton: React.FC<ButtonProps> = ({ icon, onClick, disabled, className = "", title, children, ...props }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-12 max-[280px]:w-9 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold rounded-sm border border-zinc-700 flex items-center justify-center shrink-0 ${className}`}
    title={title}
    {...props}
  >
    {icon || children}
  </button>
);

export const BackButton: React.FC<ButtonProps> = (props) => (
  <IconButton {...props}>
     <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
  </IconButton>
);

export const NextButton: React.FC<ButtonProps> = ({ label, onClick, disabled, className = "", ...props }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`h-10 text-xs font-bold rounded-sm border flex items-center justify-center transition-all bg-zinc-700 hover:bg-zinc-600 border-zinc-600 text-white hover:text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed gap-1 flex-none w-12 max-[280px]:w-9 min-[280px]:w-auto min-[280px]:px-3 ${className}`}
    {...props}
  >
    <svg className="w-5 h-5 flex-none shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
    {label && <span className="hidden min-[280px]:inline truncate">{label}</span>}
  </button>
);

export const ImportButton: React.FC<ButtonProps & { label: string }> = ({ label, onClick, disabled, className = "", ...props }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 min-h-[2.5rem] py-1 border-2 border-dashed border-zinc-600 hover:border-orange-500 bg-zinc-900/30 text-zinc-400 hover:text-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] font-bold rounded-sm flex items-center justify-center gap-1 sm:gap-2 transition-all group ${className}`}
    {...props}
  >
    <svg className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
    <span className="leading-tight text-center break-words">{label}</span>
  </button>
);

export const PrimaryButton: React.FC<ButtonProps & { 
  variant?: 'orange' | 'red' | 'green';
  isConnectionReady?: boolean;
  onConfigureRequest?: () => void;
}> = ({ 
  label, 
  icon, 
  onClick, 
  disabled, 
  className = "", 
  variant = 'orange',
  children,
  isConnectionReady,
  onConfigureRequest,
  ...props 
}) => {
  const colors = {
    orange: "bg-orange-700 hover:bg-orange-600 border-orange-800 text-white",
    red: "bg-red-700 hover:bg-red-600 border-red-800 text-white shadow-[0_0_15px_rgba(185,28,28,0.4)]",
    green: "bg-green-700 hover:bg-green-600 border-green-800 text-white",
  };
  
  // Logic: Override presentation if no API key is detected
  // If isConnectionReady is undefined, we assume true/default behavior to support legacy/simple usage.
  // Explicit false means we show the "No API Key" state.
  const showNoKey = isConnectionReady === false;

  const effectiveVariant = showNoKey ? 'red' : variant;
  const effectiveOnClick = showNoKey ? onConfigureRequest : onClick;

  // Key Icon for No API Key state
  const KeyIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
  );

  const baseClass = disabled 
    ? "bg-zinc-900 text-zinc-700 border-zinc-800 cursor-not-allowed opacity-50" 
    : colors[effectiveVariant];

  return (
    <button
      onClick={effectiveOnClick}
      disabled={disabled}
      className={`flex-1 min-h-[2.5rem] py-1 text-xs font-bold rounded-sm shadow-lg border flex items-center justify-center gap-1 sm:gap-2 transition-all ${baseClass} ${className}`}
      {...props}
    >
      {disabled ? (
        <><span className="w-3 h-3 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin shrink-0"/> Processing</>
      ) : (
        <>
          {showNoKey ? (
            <span className="shrink-0 flex items-center justify-center">{KeyIcon}</span>
          ) : (
            icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>
          )}

          {showNoKey ? (
            <span className="leading-tight text-center break-words">No API Key</span>
          ) : (
            <>
                {label && <span className="leading-tight text-center break-words">{label}</span>}
                {children}
            </>
          )}
        </>
      )}
    </button>
  );
};
