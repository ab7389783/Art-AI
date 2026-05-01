
import React from 'react';

interface OverlayActionsProps {
  onReplace?: () => void;
  onRemove?: () => void;
  onImport?: () => void;
  onUnload?: () => void;
  visible: boolean;
  onClose: () => void;
  isVideo?: boolean;
}

export const OverlayActions: React.FC<OverlayActionsProps> = ({
  onReplace,
  onRemove,
  onImport,
  onUnload, 
  visible,
  onClose,
  isVideo = false
}) => {
  return (
    <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-3 transition-opacity duration-200 z-20 ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
        {onReplace && (
            <button 
                onClick={(e) => { e.stopPropagation(); onReplace(); }}
                className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-300 flex items-center justify-center transition-all shadow-xl hover:scale-110"
                title="Replace Asset"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
        )}

        {onImport && (
            <button 
                onClick={(e) => { e.stopPropagation(); onImport(); }}
                className="w-12 h-12 rounded-full bg-green-900/80 border border-green-500 hover:bg-green-600 hover:border-green-400 text-green-100 hover:text-white flex items-center justify-center transition-all shadow-xl hover:scale-110 backdrop-blur-sm"
                title="Import / Load"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </button>
        )}
        
        {/* Helper button for explicitly closing the view if onRemove isn't sufficient */}
        {onUnload && !onRemove && (
            <button 
                onClick={(e) => { e.stopPropagation(); onUnload(); }}
                className="w-10 h-10 rounded-full bg-red-900/80 border border-red-500 hover:bg-red-600 hover:border-red-400 text-red-100 hover:text-white flex items-center justify-center transition-all shadow-xl hover:scale-110"
                title="Unload"
            >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
               </svg>
            </button>
        )}

        {onRemove && (
            <button 
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="w-10 h-10 rounded-full bg-red-900/80 border border-red-500 hover:bg-red-600 hover:border-red-400 text-red-100 hover:text-white flex items-center justify-center transition-all shadow-xl hover:scale-110"
                title="Unload / Unlink"
            >
                {/* Broken Link Icon */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
            </button>
        )}
    </div>
  );
};
