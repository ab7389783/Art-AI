
import { useState, useEffect, useRef } from 'react';
import { SimulationStep, GeneratedAsset } from '../types';
import { constructInteractionPrompt, constructMotionPrompt } from '../services/promptFactory';
import { downloadAsset } from '../services/utils';
import { StorageService } from '../services/storageService';

// Hooks
import { useSimulationConfig } from './useSimulationConfig';
import { useGeneration } from './useGeneration';
import { AppSettings } from './useSettings';

interface SimulationDependencies {
  addToGallery: (asset: GeneratedAsset) => Promise<GeneratedAsset>;
  addLog: (msg: string, level?: 'info' | 'warning' | 'error' | 'success', rawData?: any) => void;
  addToast: (msg: string, level?: 'info' | 'warning' | 'error' | 'success', rawData?: any) => void;
  gallery: GeneratedAsset[]; 
  settings: AppSettings;
}

export const useSimulation = ({ addToGallery, addLog, addToast, gallery, settings }: SimulationDependencies) => {
  // --- STATE ---
  // Initialize step from persisted storage if available
  const [step, setStep] = useState<SimulationStep>(() => {
    const saved = StorageService.getWorkspace();
    return (saved.currentStep as SimulationStep) || 'CHARACTER_SETUP';
  });
  
  // Layered State
  const [masterCharacterAsset, setMasterCharacterAsset] = useState<GeneratedAsset | null>(null);
  const [interactionAsset, setInteractionAsset] = useState<GeneratedAsset | null>(null);
  const [motionAsset, setMotionAsset] = useState<GeneratedAsset | null>(null);
  
  // UI State
  const [isEditing, setIsEditing] = useState(false);

  // --- SUB-HOOKS ---
  const { config, updateConfig, setConfig, isInitialized: isConfigInitialized } = useSimulationConfig(step);

  // --- HYDRATION LOGIC ---
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (isConfigInitialized && !hydratedRef.current) {
        if (config.layerCharacter) {
            setMasterCharacterAsset({
                id: 'session_char',
                type: 'image',
                url: config.layerCharacter,
                title: config.layerCharacterRef || 'Restored Character',
                timestamp: Date.now(),
                metadata: { prompt: config.characterPrompt, model: 'Session', variant: 'character' }
            });
        }

        if (config.layerInteraction) {
            setInteractionAsset({
                id: 'session_interaction',
                type: 'image',
                url: config.layerInteraction,
                title: config.layerInteractionRef || 'Restored Interaction',
                timestamp: Date.now(),
                metadata: { prompt: config.interactionPrompt, model: 'Session', variant: 'interaction' }
            });
        }

        if (config.layerMotion) {
             setMotionAsset({
                id: 'session_motion',
                type: 'video',
                url: config.layerMotion,
                title: config.layerMotionRef || 'Restored Motion',
                timestamp: Date.now(),
                metadata: { prompt: config.motionPrompt || "", model: 'Session', variant: 'motion' }
             });
        }

        hydratedRef.current = true;
    }
  }, [isConfigInitialized, config]);

  // --- HELPER: Resolve IDB Key from Asset ---
  const getAssetRefKey = (asset: GeneratedAsset) => {
      return asset.title ? asset.title : undefined;
  };

  // --- GENERATION HANDLER ---
  const onGenerationComplete = async (asset: GeneratedAsset, mode: 'CHARACTER' | 'INTERACTION' | 'MOTION') => {
    const stateAsset = asset;
    const refKey = getAssetRefKey(stateAsset);

    if (mode === 'CHARACTER') {
        setMasterCharacterAsset(stateAsset);
        // Generation of new character clears upper layers
        setInteractionAsset(null);
        setMotionAsset(null);
        setIsEditing(false);
        
        updateConfig({ 
            layerCharacter: stateAsset.url, 
            layerCharacterRef: refKey,
            layerInteraction: undefined,
            layerInteractionRef: undefined,
            layerMotion: undefined,
            layerMotionRef: undefined
        });
    } else if (mode === 'INTERACTION') {
        setInteractionAsset(stateAsset);
        // Generation of new interaction clears motion layer
        setMotionAsset(null);

        // PRE-FILL MOTION PROMPT: Ensure prompt is ready before view switch to prevent flash.
        // Use default if empty or whitespace only
        let nextMotionPrompt = config.motionPrompt;
        if (!nextMotionPrompt || !nextMotionPrompt.trim()) {
            nextMotionPrompt = constructMotionPrompt();
        }
        
        updateConfig({ 
            layerInteraction: stateAsset.url,
            layerInteractionRef: refKey,
            layerMotion: undefined,
            layerMotionRef: undefined,
            motionPrompt: nextMotionPrompt,
            currentStep: 'INTERACTION_RESULT'
        });

        setStep('INTERACTION_RESULT');
    } else if (mode === 'MOTION') {
        setMotionAsset(stateAsset);
        
        updateConfig({
            layerMotion: stateAsset.url,
            layerMotionRef: refKey
        });
    }
  };

  const { 
    isGenerating, 
    loadingMessage, 
    generate, 
    handleStopGeneration, 
    handleTryMore 
  } = useGeneration({
    config,
    settings,
    masterCharacterAsset,
    interactionAsset,
    addToGallery,
    addLog,
    addToast,
    updateConfig,
    onGenerationComplete
  });

  // --- ACTIONS ---

  const handleStepChange = (newStep: SimulationStep) => {
    if (newStep === 'INTERACTION_SIM') {
      updateConfig({ showTargetMarker: true });
      if (!config.interactionPrompt) {
        const hasDevice = !!config.deviceImage;
        updateConfig({ interactionPrompt: constructInteractionPrompt(config.expression, hasDevice) });
      }
    } else if (newStep === 'CHARACTER_SETUP') {
        // Clearing upper layers when going back to setup is optional, but often cleaner.
        // For now, we only sync config references if we explicitly unloaded them.
        // But visual "focus" is handled by the Viewport based on step.
    }
    
    setStep(newStep);
    updateConfig({ currentStep: newStep });
  };

  const handleLoadAsset = (asset: GeneratedAsset, role: 'main' | 'device' | 'face') => {
    const title = asset.title || "Untitled";
    const refKey = getAssetRefKey(asset);

    if (role === 'device') {
       if (!asset.url) return;
       updateConfig({ deviceImage: asset.url, deviceImageRef: refKey });
       addToast(`Load Device: ${title}`, 'success');
       return;
    }

    if (role === 'face') {
       if (!asset.url) return;
       updateConfig({ baseImage: asset.url, baseImageRef: refKey });
       addToast(`Load Face: ${title}`, 'success');
       return;
    }

    // Role 'main' logic
    if (asset.type === 'video') {
        setMotionAsset(asset);
        setStep('INTERACTION_RESULT');
        updateConfig({ layerMotion: asset.url, layerMotionRef: refKey, currentStep: 'INTERACTION_RESULT' });
        addToast(`Load Motion: ${title}`, 'success');
        return;
    }

    if (asset.type === 'image') {
        // Assume imported image is Master Character
        setMasterCharacterAsset(asset);
        setInteractionAsset(null);
        setMotionAsset(null);
        
        updateConfig({ 
            targetCoordinates: undefined, 
            layerCharacter: asset.url, 
            layerCharacterRef: refKey,
            layerInteraction: undefined,
            layerInteractionRef: undefined,
            layerMotion: undefined,
            layerMotionRef: undefined
        });
        
        handleStepChange('INTERACTION_SIM'); // Updates currentStep
        setIsEditing(false);
        addToast(`Load Character: ${title}`, 'success');
    }
  };

  const handleUnloadAsset = (role: 'motion' | 'interaction' | 'character' | 'face' | 'device', silent: boolean = false) => {
    let title = "Asset";
    
    // --- Config Assets ---
    if (role === 'face') {
        title = config.baseImageRef || "Face";
        updateConfig({ baseImage: undefined, baseImageRef: undefined });
        if (!silent) addToast(`Unload: ${title}`, 'info');
        return;
    } 
    if (role === 'device') {
        title = config.deviceImageRef || "Device";
        updateConfig({ deviceImage: undefined, deviceImageRef: undefined });
        if (!silent) addToast(`Unload: ${title}`, 'info');
        return;
    }

    // --- Layer Assets ---
    if (role === 'motion') {
        if (motionAsset) {
            title = motionAsset.title || "Motion";
            setMotionAsset(null);
            updateConfig({ layerMotion: undefined, layerMotionRef: undefined });
            if (!silent) addToast(`Unload: ${title}`, 'info');
        }
    } else if (role === 'interaction') {
        if (interactionAsset) {
            title = interactionAsset.title || "Interaction";
            setInteractionAsset(null);
            updateConfig({ layerInteraction: undefined, layerInteractionRef: undefined });
            if (!silent) addToast(`Unload: ${title}`, 'info');
        }
    } else if (role === 'character') {
        if (masterCharacterAsset) {
            title = masterCharacterAsset.title || "Character";
            setMasterCharacterAsset(null);
            updateConfig({ layerCharacter: undefined, layerCharacterRef: undefined, currentStep: 'CHARACTER_SETUP' });
            setStep('CHARACTER_SETUP');
            if (!silent) addToast(`Unload: ${title}`, 'info');
        }
    }
  };

  const handleEditSettings = (asset: GeneratedAsset) => {
    if (asset.metadata?.prompt) {
      updateConfig({ characterPrompt: asset.metadata.prompt, currentStep: 'CHARACTER_SETUP' });
      setStep('CHARACTER_SETUP');
      setIsEditing(true);
      addToast("Settings Restored", 'info');
    } else {
      addToast("No Metadata Found", 'warning');
    }
  };

  const handleTargetClick = (x: number, y: number) => {
    if (step !== 'INTERACTION_SIM') return;
    updateConfig({ 
      targetCoordinates: { x, y },
      targetRegionDescription: undefined
    });
  };

  const handleDownload = async (asset: GeneratedAsset) => {
      try {
          await downloadAsset(asset, () => {});
          addToast("Download Started", 'success');
      } catch (e: any) {
          addToast("Download Failed", 'error', e.message);
      }
  };

  const handleUseUploadedAsBase = async (base64: string, filename: string) => {
    try {
        if (isGenerating) handleStopGeneration();

        const asset: GeneratedAsset = {
            id: crypto.randomUUID(), type: 'image', url: base64, timestamp: Date.now(),
            title: filename, 
            metadata: { prompt: filename, model: "Imported", variant: 'character' }
        };
        
        const stateAsset = await addToGallery(asset);
        const refKey = getAssetRefKey(stateAsset);
        
        setMasterCharacterAsset(stateAsset);
        // Clear layers above
        setInteractionAsset(null);
        setMotionAsset(null);
        
        updateConfig({ 
            targetCoordinates: undefined, 
            layerCharacter: stateAsset.url, 
            layerCharacterRef: refKey,
            layerInteraction: undefined,
            layerInteractionRef: undefined,
            layerMotion: undefined,
            layerMotionRef: undefined
        });
        
        handleStepChange('INTERACTION_SIM');
        setIsEditing(false);
        addToast(`Import Character: ${stateAsset.title}`, 'success');
    } catch (e: any) {
        addToast("Import Failed", 'error', e.message);
    }
  };

  const handleInteractionUpload = async (base64: string, filename: string) => {
    try {
        if (isGenerating) handleStopGeneration();

        const asset: GeneratedAsset = {
            id: crypto.randomUUID(), type: 'image', url: base64, timestamp: Date.now(),
            title: filename,
            metadata: { prompt: filename, model: "Imported", variant: 'interaction' }
        };
        
        const stateAsset = await addToGallery(asset);
        const refKey = getAssetRefKey(stateAsset);

        setInteractionAsset(stateAsset);
        // Clear motion
        setMotionAsset(null);
        
        // Ensure prompt logic similar to onGenerationComplete
        const nextMotionPrompt = config.motionPrompt || constructMotionPrompt();

        updateConfig({ 
            layerInteraction: stateAsset.url,
            layerInteractionRef: refKey,
            layerMotion: undefined,
            layerMotionRef: undefined,
            motionPrompt: nextMotionPrompt,
            currentStep: 'INTERACTION_RESULT'
        });
        
        setStep('INTERACTION_RESULT'); 
        addToast(`Import Interaction: ${stateAsset.title}`, 'success');
    } catch (e: any) {
        addToast("Import Failed", 'error', e.message);
    }
  };

  // Delegate Face/Device uploads are just config updates + add to gallery (handled by handleLoadAsset essentially)
  // but we keep specific handlers for Viewport convenience if needed.
  const handleFaceUpload = async (base64: string, filename: string) => {
      // Re-use logic: add to gallery, then call load.
      // For simplicity in this refactor, we can implement directly:
      try {
          const asset: GeneratedAsset = {
              id: crypto.randomUUID(), type: 'image', url: base64, timestamp: Date.now(), title: filename,
              metadata: { prompt: filename, model: "Imported", variant: 'face' }
          };
          const saved = await addToGallery(asset);
          handleLoadAsset(saved, 'face');
      } catch(e: any) { addToast("Error", 'error', e.message); }
  };

  const handleDeviceUpload = async (base64: string, filename: string) => {
      try {
          const asset: GeneratedAsset = {
              id: crypto.randomUUID(), type: 'image', url: base64, timestamp: Date.now(), title: filename,
              metadata: { prompt: filename, model: "Imported", variant: 'device' }
          };
          const saved = await addToGallery(asset);
          handleLoadAsset(saved, 'device');
      } catch(e: any) { addToast("Error", 'error', e.message); }
  };

  return {
    state: {
      step,
      config,
      masterCharacterAsset,
      interactionAsset,
      motionAsset,
      isGenerating,
      isEditing,
      loadingMessage
    },
    actions: {
      setStep,
      updateConfig,
      handleGenerate: generate,
      handleStopGeneration,
      handleTryMore,
      handleStepChange,
      handleLoadAsset,
      handleUnloadAsset,
      handleEditSettings,
      handleTargetClick,
      handleDownload,
      handleUseUploadedAsBase,
      handleInteractionUpload,
      handleFaceUpload, 
      handleDeviceUpload, 
      setIsEditing,
      setMasterCharacterAsset,
      setInteractionAsset,
      setMotionAsset
    }
  };
};
