import { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';

export interface AppSettings {
  imageModel: string;
  videoModel: string;
}

export const useSettings = () => {
  // Initialize from StorageService
  const [settings, setSettingsState] = useState<AppSettings>(() => {
    return StorageService.getSettings().models;
  });

  const updateSettings = (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettingsState(newSettings);
    // Persist models part to StorageService
    StorageService.saveSettings({ models: newSettings });
  };

  return { settings, updateSettings };
};