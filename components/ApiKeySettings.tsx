
import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/apiKeyService';

interface AccessSettingsProps {
  isConnectionReady: boolean;
  onConnectionUpdate: () => void;
  addToast: (msg: string, level?: 'info' | 'warning' | 'error' | 'success', rawData?: any) => void;
  addLog: (msg: string, level?: 'info' | 'warning' | 'error' | 'success', rawData?: any) => void;
}

export const AccessSettings: React.FC<AccessSettingsProps> = ({
  isConnectionReady,
  onConnectionUpdate,
  addToast,
  addLog
}) => {
  // --- State ---
  // Staging State: What the user is currently editing/selecting
  const [activeMode, setActiveMode] = useState<'auto' | 'manual'>('manual');
  const [manualInput, setManualInput] = useState('');
  
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  // New state to force the save button to be active (orange) when requested by user interaction
  const [forceEnableSave, setForceEnableSave] = useState(false);

  // --- Initial Load ---
  useEffect(() => {
    const mode = AuthService.getMode();
    const key = AuthService.getManualKey();
    
    // Initialize active state based on stored mode
    setActiveMode(mode);
    setManualInput(key);
  }, []);

  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setManualInput(e.target.value);
      // Automatically switch staging mode to manual when typing
      if (activeMode !== 'manual') setActiveMode('manual');
      // Reset force enable since user is manually editing
      setForceEnableSave(false);
  };

  const handleUnifiedSave = async (override?: 'auto' | 'manual' | React.MouseEvent) => {
      // Determine effective mode to validate/save.
      const currentMode = (typeof override === 'string') ? override : activeMode;
      
      setIsValidating(true);
      
      try {
          // LOGIC: Validate based on what the user is currently looking at.
          if (currentMode === 'auto') {
              // --- AI Studio (Auto) Logic ---
              await AuthService.validateAutoMode();

              // Save & Update (Overwrite previous valid state)
              AuthService.setMode('auto');
              
              onConnectionUpdate();
              addToast("AI Studio Connected", 'success');
              
          } else {
              // --- Manual Logic ---
              const candidateKey = manualInput.trim();
              
              if (!candidateKey) {
                  // Empty input logic -> Clear everything
                  AuthService.removeStoredKey();
                  AuthService.setMode('manual');
                  
                  // Clear State
                  setManualInput('');
                  
                  onConnectionUpdate();
                  addToast("Key Removed", 'info');
                  setIsValidating(false);
                  return;
              }

              // Validate using the manual-specific method (REST Check)
              await AuthService.validateManualKey(candidateKey);

              // Save ONLY if validation passed (Overwrite previous valid state)
              AuthService.setMode('manual');
              AuthService.setManualKey(candidateKey);
              
              onConnectionUpdate();
              addToast("Manual Key Verified", 'success');
          }
          
          // Successful save resets the force flag
          setForceEnableSave(false);

      } catch (error: any) {
          // --- FAILURE / REVERT LOGIC ---
          
          // REVISED: If AI Studio (Auto) validation fails, we do NOT revert to 'auto' or previous state.
          // We treat it as a hard disconnect/failure to connect.
          if (currentMode === 'auto') {
               setActiveMode('manual');
               setManualInput(''); // Clear input for fresh start
               AuthService.removeStoredKey(); // Remove valid key/mode
               AuthService.setMode('manual');
               
               addToast("Connection Failed", 'error', error);
               
               onConnectionUpdate();
               setForceEnableSave(false);
               setIsValidating(false);
               return;
          }

          // --- Manual Mode Revert Logic ---
          // If validation fails in Manual mode, we try to revert the UI to the last known valid state 
          // stored in AuthService to prevent leaving the user in a broken state if they had one working.
          
          const fallbackMode = AuthService.getMode();
          const fallbackKey = AuthService.getManualKey();
          
          let reverted = false;

          if (fallbackMode === 'auto') {
              setActiveMode('auto');
              reverted = true;
              addToast("Validation Failed. Reverted to AI Studio Mode.", 'warning');
          } else if (fallbackMode === 'manual' && fallbackKey) {
              setActiveMode('manual');
              setManualInput(fallbackKey);
              reverted = true;
              addToast("Validation Failed. Reverted to previous valid key.", 'warning');
          }

          if (!reverted) {
              // No previous valid state, clear everything
              setManualInput('');
              setActiveMode('manual');
              AuthService.removeStoredKey();
              addToast(error.message || "Validation Failed", 'error', error);
          }
          
          onConnectionUpdate();
          setForceEnableSave(false);
          
      } finally {
          setIsValidating(false);
      }
  };

  const handleAIStudioClick = async () => {
      const aistudio = (window as any).aistudio;
      
      if (aistudio) {
          // --- AI Studio Integration Path ---
          // 1. Enter Auto Mode state: Force Save & Hide Input
          setForceEnableSave(true);
          setActiveMode('auto');
          
          try {
              // 2. Open Modal immediately
              await aistudio.openSelectKey();
              
              // 3. Wait for user interaction to confirm focus is back and user is active
              // This prevents race conditions where validation triggers before the modal fully closes/updates
              await new Promise<void>((resolve) => {
                  const events = ['mousemove', 'mousedown', 'touchstart', 'scroll', 'keydown', 'wheel'];
                  const handler = () => {
                      events.forEach(ev => window.removeEventListener(ev, handler));
                      resolve();
                  };
                  
                  // Small delay to avoid catching the immediate click/release of this very button
                  setTimeout(() => {
                      events.forEach(ev => window.addEventListener(ev, handler, { once: true }));
                  }, 200);
              });
              
              // 4. Automatically trigger save logic once modal is done AND user interacts
              await handleUnifiedSave('auto');
              
          } catch (e) {
              // User cancelled or flow failed -> Revert to manual mode so they can type/retry
              // Disable force save so it doesn't try to validate empty/invalid state automatically
              setActiveMode('manual');
              setForceEnableSave(false);
          }
      } else {
          // --- Fallback Path (External Link) ---
          // Just open the link for them to get a key. 
          // Remain in (or switch to) manual mode so they can paste it.
          // Do NOT force enable save logic.
          window.open('https://ai.dev/api-keys', '_blank');
          
          setActiveMode('manual');
          setForceEnableSave(false);
      }
  };

  // Helper for UI Rendering
  const isAutoModeActive = activeMode === 'auto';
  
  // Dirty Check: Compare current input against the *Stored/Valid* key
  const storedManualKey = AuthService.getManualKey();
  const storedMode = AuthService.getMode();
  
  const isDirty = (activeMode === 'manual' && manualInput !== storedManualKey) || 
                  (activeMode !== storedMode);
                  
  const canSave = isDirty || forceEnableSave;

  const SparklesIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
  );

  return (
    <div className="space-y-2">
        <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-semibold text-zinc-400">Access Key</label>
            {/* Connected Badge */}
            <div className={`flex items-center gap-1.5 px-1.5 py-0.5 -mt-0.5 border transition-all rounded-[2px] ${
                isConnectionReady 
                ? 'bg-green-950/40 border-green-900/60 text-green-400' 
                : 'bg-red-950/40 border-red-900/60 text-red-400'
            }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isConnectionReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-[9px] font-bold tracking-tight">
                    {isConnectionReady 
                        ? (storedMode === 'auto' ? 'Auto Connect' : 'Manual Connect') 
                        : 'Disconnected'}
                </span>
            </div>
        </div>

        <div className="grid gap-2">
            {/* Input Area */}
            {isAutoModeActive ? (
                // Auto Mode: Placeholder Button (Hides Input)
                <button 
                    onClick={() => setActiveMode('manual')}
                    disabled={isValidating}
                    className={`w-full h-10 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-sm text-xs px-3 text-zinc-300 flex items-center justify-center gap-2 transition-all group ${isValidating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <svg className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    <span className="font-bold">Use my own Key</span>
                </button>
            ) : (
                // Manual Mode: Input Field
                <div className="relative group">
                    <input 
                        type={showKey ? "text" : "password"}
                        value={manualInput}
                        onChange={handleInputChange}
                        disabled={isValidating}
                        placeholder="Paste your own Key"
                        className={`w-full h-10 bg-zinc-900 border rounded-sm text-xs px-3 pr-10 text-zinc-200 outline-none font-mono transition-colors ${
                            isDirty ? 'border-orange-500/50 focus:border-orange-500' : 'border-zinc-700 focus:border-zinc-500'
                        } ${isValidating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <button
                        onClick={() => setShowKey(!showKey)}
                        disabled={isValidating}
                        className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={showKey ? "Hide Key" : "Show Key"}
                        tabIndex={-1}
                    >
                        {showKey ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                    </button>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
                {/* AI Studio Select Button */}
                <button 
                    onClick={handleAIStudioClick}
                    disabled={isValidating}
                    className={`flex-1 h-9 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs rounded-sm flex items-center justify-center gap-2 transition-colors shadow-lg ${isValidating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Switch to AI Studio Mode"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span>AI Studio</span>
                </button>

                {/* Unified Save Button */}
                <button 
                    onClick={() => handleUnifiedSave()} 
                    disabled={isValidating || !canSave}
                    className={`flex-1 h-9 rounded-sm text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        canSave
                            ? 'bg-orange-700 hover:bg-orange-600 text-white shadow-lg border border-orange-800'
                            : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                    } ${isValidating ? 'opacity-70' : ''}`}
                >
                    {isValidating ? (
                        <>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            <span>Verifying...</span>
                        </>
                    ) : (
                        <>
                            {SparklesIcon}
                            <span>Save Key</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
  );
};
