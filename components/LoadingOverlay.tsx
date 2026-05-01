
import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message: string;
  onCancel: () => void;
  onRetry: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message,
  onCancel,
  onRetry
}) => {
  if (!isVisible) return null;

  const renderMessage = () => {
    const msg = message || "Processing";
    // Check for parentheses at the end of the string to split detail info
    const match = msg.match(/^(.*?)\s*(\(.*?\))$/);

    if (match) {
        return (
            <>
                <div className="text-orange-500 text-xs font-mono font-bold tracking-[0.2em] blink">
                    {match[1]}
                </div>
                <div className="text-orange-400/80 text-[10px] font-mono tracking-widest mt-1">
                    {match[2]}
                </div>
            </>
        );
    }

    return (
        <div className="text-orange-500 text-xs font-mono font-bold tracking-[0.2em] blink">
            {msg}
        </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950/80 backdrop-blur-sm overflow-y-auto select-none cursor-wait">
      <div className="min-h-full w-full flex flex-col items-center justify-center p-6">
          <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-zinc-800 border-t-orange-500 rounded-full animate-spin"></div>
              <div className="text-center flex flex-col items-center">
                {renderMessage()}
                <div className="text-zinc-600 text-[9px] font-mono mt-3">
                    Do not close window
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                 <button 
                   onClick={onCancel}
                   className="px-4 py-1 border border-red-800 bg-red-950/20 text-red-500 text-[9px] hover:text-white hover:bg-red-900/80 hover:border-red-600 transition-colors rounded-sm"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={onRetry}
                   className="px-4 py-1 border border-green-800 bg-green-950/20 text-green-500 text-[9px] hover:text-white hover:bg-green-900/80 hover:border-green-600 transition-colors rounded-sm"
                 >
                   Try 3 more
                 </button>
              </div>
          </div>
      </div>
    </div>
  );
};
