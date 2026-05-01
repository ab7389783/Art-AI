
import { AssetStore } from "./assetStore";

// Define defaults locally to avoid circular dependency
const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';
const DEFAULT_VIDEO_MODEL = 'veo-2.0-generate-001';

const KEYS = {
  SETTINGS: 'art_ai_settings',
  WORKSPACE: 'art_ai_workspace',
  GALLERY: 'art_ai_gallery',
  LOGS: 'art_ai_logs'
};

const DEFAULT_SETTINGS = {
  auth: {
    mode: 'manual', // 'auto' | 'manual'
    manualKey: ''
  },
  models: {
    imageModel: DEFAULT_IMAGE_MODEL,
    videoModel: DEFAULT_VIDEO_MODEL
  }
};

export const StorageService = {
  // --- Generic Helpers ---
  getJSON: <T>(key: string, defaultVal: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch {
      return defaultVal;
    }
  },

  setJSON: (key: string, val: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error("Storage Write Failed", e);
    }
  },

  // --- Settings (Auth + Models) ---
  getSettings: () => {
    const saved = StorageService.getJSON<any>(KEYS.SETTINGS, {});
    return { 
      auth: { ...DEFAULT_SETTINGS.auth, ...(saved.auth || {}) },
      models: { ...DEFAULT_SETTINGS.models, ...(saved.models || {}) }
    };
  },

  saveSettings: (partialSettings: any) => {
    const current = StorageService.getSettings();
    const next = {
      auth: { ...current.auth, ...(partialSettings.auth || {}) },
      models: { ...current.models, ...(partialSettings.models || {}) }
    };
    StorageService.setJSON(KEYS.SETTINGS, next);
  },

  // --- Workspace (Current Session State) ---
  getWorkspace: () => StorageService.getJSON<any>(KEYS.WORKSPACE, {}),
  
  saveWorkspace: (data: any) => {
    StorageService.setJSON(KEYS.WORKSPACE, data);
  },

  // --- Gallery Metadata ---
  getGalleryMeta: () => StorageService.getJSON<any[]>(KEYS.GALLERY, []),
  
  saveGalleryMeta: (meta: any[]) => {
    StorageService.setJSON(KEYS.GALLERY, meta);
  },

  // --- Logs Metadata ---
  getLogsMeta: () => StorageService.getJSON<any[]>(KEYS.LOGS, []),

  saveLogsMeta: (logs: any[]) => {
    // We only save metadata to LS, heavy rawData should be stripped or refs used
    const meta = logs.map(log => {
        const { rawData, ...rest } = log; 
        return rest; // rawDataRef should be in rest
    });
    // Limit log history in local storage to prevent bloat (e.g., last 100)
    const limited = meta.slice(0, 100); 
    StorageService.setJSON(KEYS.LOGS, limited);
  },

  // --- Factory Reset ---
  factoryReset: async () => {
    // 1. Clear Unified Namespaces
    localStorage.removeItem(KEYS.SETTINGS);
    localStorage.removeItem(KEYS.WORKSPACE);
    localStorage.removeItem(KEYS.GALLERY);
    localStorage.removeItem(KEYS.LOGS);

    // 2. Clear Legacy Keys (Cleanup)
    const legacyKeys = [
      'gemini_api_mode', 
      'art_ai_manual_api_key', 
      'gemini_api_key',
      'art_config_v1', 
      'art_gallery_meta', 
      'art_app_settings_v1'
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));

    // 3. Clear IndexedDB (Images/Videos/Logs)
    await AssetStore.clearAll();

    // 4. Reload
    window.location.reload();
  }
};
