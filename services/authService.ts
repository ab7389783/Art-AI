
import { AuthService } from "./apiKeyService";

export const ensureConnection = async (onToast: (msg: string, level: 'info' | 'warning' | 'error' | 'success') => void) => {
    // 1. Check Service
    if (AuthService.hasKey()) return true;

    // 2. Check AI Studio Environment
    const aistudio = (window as any).aistudio;
    // If not in AI Studio environment, we can't do anything more than return false
    // (The user needs to manually enter a key in Settings)
    if (!aistudio) return false;

    const hasKey = await aistudio.hasSelectedApiKey();
    if (!hasKey) {
      // Simplified message, info level
      onToast("Connecting to Google Services...", "info");
      await aistudio.openSelectKey();
      
      // If we are here, the user successfully selected a key in the AI Studio dialog.
      // We should switch to 'auto' mode so this key is used.
      if (process.env.API_KEY) {
          AuthService.setMode('auto');
      }
      
      return true; 
    }
    
    // Recovery Fallback: 
    // If AI Studio has a key (hasKey === true) but AuthService.hasKey() was false (Manual mode empty),
    // we must switch to 'auto' to ensure the API call uses the environment key.
    if (process.env.API_KEY) {
         AuthService.setMode('auto');
    }

    return true;
};
