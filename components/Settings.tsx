import React, { useState } from 'react';
import { AppSettings } from '../hooks/useSettings';
import { AVAILABLE_IMAGE_MODELS, AVAILABLE_VIDEO_MODELS } from '../services/apiClient';
import { ConfirmationModal } from './ConfirmationModal';
import { AccessSettings } from './ApiKeySettings';
import { SelectionGroup } from './SelectionGroup';
import { StorageService } from '../services/storageService';

interface SettingsProps {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  onClose: () => void;
  onClearGallery: () => Promise<void>; // Kept for interface compat, but reset handles it
  isConnectionReady: boolean;
  onConnectionUpdate: () => void;
  addToast: (msg: string, level?: 'info' | 'warning' | 'error' | 'success', rawData?: any) => void;
  addLog: (msg: string, level?: 'info' | 'warning' | 'error' | 'success', rawData?: any) => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  settings, 
  updateSettings, 
  onClose,
  isConnectionReady,
  onConnectionUpdate,
  addToast,
  addLog
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleResetData = async () => {
    await StorageService.factoryReset();
  };

  // Prepare options for SelectionGroup
  const imageOptions = AVAILABLE_IMAGE_MODELS.map(m => ({
    id: m.id,
    label: m.label,
    badge: (m.id.includes('flash') || m.id.includes('fast')) ? 'FAST' : undefined
  }));

  const videoOptions = AVAILABLE_VIDEO_MODELS.map(m => ({
    id: m.id,
    label: m.label,
    badge: (m.id.includes('flash') || m.id.includes('fast')) ? 'FAST' : undefined
  }));

  return (
    <>
        <ConfirmationModal 
            isOpen={showDeleteConfirm}
            title="Reset All Data"
            message="This will permanently delete all your generated assets, clear your settings, remove your access key, and reset the application to its initial state. This action cannot be undone."
            confirmLabel="Reset Everything"
            isDanger={true}
            onConfirm={handleResetData}
            onCancel={() => setShowDeleteConfirm(false)}
        />

        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
            <div className="w-full h-full max-w-2xl mx-auto flex flex-col bg-zinc-950/50">
                {/* Header */}
                <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950 shrink-0">
                    <h2 className="text-sm font-bold tracking-widest text-white">Settings</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    
                    <div className="flex flex-col gap-5">

                        {/* 1. API Key Section */}
                        <AccessSettings 
                            isConnectionReady={isConnectionReady}
                            onConnectionUpdate={onConnectionUpdate}
                            addToast={addToast}
                            addLog={addLog}
                        />
                        
                        {/* 2. Image Generation Model */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[11px] font-semibold text-zinc-400">Image Generation Model</label>
                            </div>
                            <SelectionGroup 
                                options={imageOptions}
                                selectedValue={settings.imageModel}
                                onChange={(val) => updateSettings({ imageModel: val })}
                                colorTheme="orange"
                            />
                        </div>

                        {/* 3. Video Generation Model */}
                        <div className="space-y-2">
                             <div className="flex justify-between items-center mb-1">
                                <label className="text-[11px] font-semibold text-zinc-400">Video Generation Model</label>
                            </div>
                            <SelectionGroup 
                                options={videoOptions}
                                selectedValue={settings.videoModel}
                                onChange={(val) => updateSettings({ videoModel: val })}
                                colorTheme="orange"
                            />
                        </div>

                        {/* Danger Zone */}
                        <div className="pt-4 mt-2 border-t border-zinc-800/50">
                            <div className="bg-red-950/10 border border-red-900/30 rounded p-4">
                                <h3 className="text-red-400 font-bold text-sm mb-2">Danger Zone</h3>
                                <p className="text-zinc-500 text-xs mb-4">
                                    Permanently remove all your local data, gallery items, Access Key, and reset application settings.
                                </p>
                                <button 
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 hover:text-red-300 text-xs font-bold rounded transition-colors"
                                >
                                    Reset All Data
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </>
  );
};