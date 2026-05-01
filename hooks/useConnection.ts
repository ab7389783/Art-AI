
import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/apiKeyService';

export const useConnection = (isGenerating: boolean) => {
  const [isConnectionReady, setIsConnectionReady] = useState(false);

  const checkConnectionStatus = useCallback(async () => {
    // 1. Strict Check: If currently configured key is valid (Manual or Auto), we are connected.
    if (AuthService.hasKey()) {
        setIsConnectionReady(true);
        return;
    }

    // 2. Auto-Recovery: Check AI Studio environment specifically
    // We defaults to disconnected if the key is invalid, and ONLY switch to 'auto' 
    // if we detect we are in the AI Studio environment and have a key.
    const aistudio = (window as any).aistudio;
    if (aistudio) {
        try {
            const hasSelectedKey = await aistudio.hasSelectedApiKey();
            if (hasSelectedKey) {
                 AuthService.setMode('auto');
                 setIsConnectionReady(true);
                 return;
            }
        } catch (e) {
            console.warn("Auth check failed", e);
        }
    }

    // 3. Default: Disconnected
    setIsConnectionReady(false);
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  // Re-check status when generation finishes (e.g. user might have selected key in another tab or updated settings)
  useEffect(() => {
    if (!isGenerating) {
        checkConnectionStatus();
    }
  }, [isGenerating, checkConnectionStatus]);

  return { isConnectionReady, checkConnectionStatus };
};
