
import { StorageService } from "./storageService";

export const AuthService = {
  getSettingsAuth: () => {
    return StorageService.getSettings().auth;
  },

  getMode: (): 'auto' | 'manual' => {
    return AuthService.getSettingsAuth().mode as 'auto' | 'manual';
  },

  getManualKey: (): string => {
    return AuthService.getSettingsAuth().manualKey;
  },

  setMode: (mode: 'auto' | 'manual') => {
    // SECURITY CONSTRAINT: 
    // If 'aistudio' is not detected, we must NEVER persist 'auto' mode.
    // This prevents the application from getting stuck in a mode that relies on a missing environment.
    if (mode === 'auto') {
        const isAIStudio = typeof window !== 'undefined' && (window as any).aistudio;
        if (!isAIStudio) {
            console.warn("AuthService: Blocked attempt to set 'auto' mode without AI Studio environment. Falling back to 'manual'.");
            StorageService.saveSettings({ auth: { mode: 'manual' } });
            return;
        }
    }
    StorageService.saveSettings({ auth: { mode } });
  },

  setManualKey: (key: string) => {
    StorageService.saveSettings({ auth: { manualKey: key } });
  },

  removeStoredKey: () => {
    StorageService.saveSettings({ auth: { mode: 'manual', manualKey: '' } });
  },

  getEffectiveKey: (): string | null => {
    const { mode, manualKey } = AuthService.getSettingsAuth();
    const isAIStudio = typeof window !== 'undefined' && (window as any).aistudio;

    if (mode === 'auto') {
        if (isAIStudio && process.env.API_KEY) {
            return process.env.API_KEY;
        }
        // If mode is auto but environment is missing, fail safe to null (effectively disconnected)
        return null;
    }

    if (mode === 'manual' && manualKey && manualKey.trim().length > 0) {
        return manualKey.trim();
    }
    
    return null;
  },

  hasKey: (): boolean => {
      return !!AuthService.getEffectiveKey();
  },

  validateManualKey: async (key: string): Promise<boolean> => {
    const trimmed = key ? key.trim() : '';
    if (!trimmed) {
        throw new Error("Key string is empty");
    }
    if (trimmed.length < 10) {
        throw new Error("Invalid Key: Too short");
    }

    const API_VERSION = 'v1beta';
    const apiUrl = `https://generativelanguage.googleapis.com/${API_VERSION}/models?key=${encodeURIComponent(trimmed)}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            credentials: 'omit'
        });

        if (response.status !== 200) {
            const data = await response.json().catch(() => ({}));
            const apiMessage = data.error?.message;
            throw new Error(apiMessage || `Validation failed (Status ${response.status})`);
        }
        return true;
    } catch (e: any) {
        let msg = e.message || "Validation Error";
        if (msg.includes("Failed to fetch")) msg = "Network request failed";
        throw new Error(msg);
    }
  },

  validateAutoMode: async (): Promise<boolean> => {
     const aistudio = (window as any).aistudio;
     if (!aistudio) throw new Error("AI Studio environment not detected");
     
     const hasSelected = await aistudio.hasSelectedApiKey();
     if (!hasSelected) throw new Error("No Access Key selected in AI Studio");

     return true;
  }
};
