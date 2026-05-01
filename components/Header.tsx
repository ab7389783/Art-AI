
import React, { useState, useEffect } from 'react';

interface HeaderProps {
  onToggleLogs: () => void;
  showLogsOverlay: boolean;
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  galleryCount: number;
  isConnectionReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleLogs, 
  showLogsOverlay, 
  onOpenGallery, 
  onOpenSettings,
  galleryCount,
  isConnectionReady
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                             (window.navigator as any).standalone;
      setIsStandalone(!!isStandaloneMode);
    };
    
    checkStandalone();
    
    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);

    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        mediaQuery.removeEventListener('change', checkStandalone);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
       // Fallback guide if the browser prompt isn't available
       alert("To install Art AI:\n\n• Desktop (Chrome/Edge): Click the install icon in the address bar.\n• iOS (Safari): Tap 'Share' button → 'Add to Home Screen'.\n• Android (Chrome): Tap Menu (⋮) → 'Install App'.");
    }
  };

  return (
    <header className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 shrink-0 z-30">
      <div className="flex items-center gap-2">
         {/* Logo Icon */}
         <div className="text-orange-500">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
           </svg>
         </div>
         {/* Hides title on very narrow mobiles (<280px) to save space */}
         <h1 className="text-base font-bold text-zinc-100 hidden min-[280px]:block">Art AI</h1>
         
         {/* Install Button - Always shown if not standalone */}
         {!isStandalone && (
           <button
              onClick={handleInstallClick}
              className={`flex items-center gap-1.5 px-3 h-7 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500/60 rounded text-[10px] text-orange-500 font-bold transition-all ml-0.5 ${!deferredPrompt ? 'opacity-80' : ''}`}
              title={deferredPrompt ? "Install App" : "Installation Guide"}
           >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Install</span>
           </button>
         )}
      </div>
      
      <div className="flex items-center gap-2">
        <button 
           onClick={onToggleLogs}
           className={`flex items-center gap-2 px-3 h-7 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded text-[10px] text-zinc-300 font-bold transition-colors ${showLogsOverlay ? 'text-orange-500 border-orange-500/50' : ''}`}
           title="System Logs"
         >
           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           <span className="hidden sm:inline">Log</span>
        </button>

        <button 
          onClick={onOpenGallery}
          className="flex items-center gap-2 px-3 h-7 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded text-[10px] text-zinc-300 font-bold transition-colors"
          title="Project Gallery"
        >
           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
           <span className="hidden sm:inline">Gallery</span>
           {/* Hides count on very narrow mobiles (<280px) to save space */}
           <span className="hidden min-[280px]:inline">({galleryCount})</span>
        </button>

        {/* API Status Button - Unified px-3 padding */}
        <button
            onClick={onOpenSettings}
            className={`flex items-center gap-2 px-3 h-7 rounded text-[10px] font-bold transition-all shadow-sm border ${
                isConnectionReady 
                ? 'bg-green-950/90 border-green-500 text-green-200 hover:bg-green-900' 
                : 'bg-red-950/90 border-red-500 text-red-200 hover:bg-red-900'
            }`}
            title={isConnectionReady ? "Key Connected - Click to Configure" : "No Key - Click to Configure"}
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span className="hidden sm:inline">{isConnectionReady ? "Connected" : "No Key"}</span>
        </button>
      </div>
    </header>
  );
};
