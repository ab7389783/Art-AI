
import { useState, useEffect } from 'react';
import { SimulationConfig, SimulationStep } from '../types';
import { constructInteractionPrompt, constructMotionPrompt, DEFAULT_SCENE_PROMPT } from '../services/promptFactory';
import { StorageService } from '../services/storageService';
import { AssetStore } from '../services/assetStore';

export const useSimulationConfig = (step: SimulationStep) => {
  const [config, setConfig] = useState<SimulationConfig>({
      characterPrompt: "",
      lighting: "Clinical Studio Light",
      nationality: "Peach (Warm Fair)",
      characterPhysique: "Lean/Muscular",
      interactionPrompt: "",
      motionPrompt: "",
      expression: "Strain",
      
      baseImage: undefined, 
      baseImageRef: undefined,
      
      deviceImage: undefined,
      deviceImageRef: undefined,
      
      layerCharacter: undefined,
      layerCharacterRef: undefined,
      
      layerInteraction: undefined,
      layerInteractionRef: undefined,
      
      layerMotion: undefined,
      layerMotionRef: undefined,
      
      targetCoordinates: undefined,
      targetRegionDescription: undefined,
      showTargetMarker: true,
      sceneDescription: DEFAULT_SCENE_PROMPT,
      visibleParts: { face: true, physique: true, skin: true },
      
      currentStep: 'CHARACTER_SETUP'
  });

  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Load Workspace on Mount
  useEffect(() => {
    const loadWorkspace = async () => {
      const saved = StorageService.getWorkspace();
      
      // Merge saved text config
      let merged = { ...config, ...saved };
      
      // Helper to restore blob from Ref
      const restoreAsset = async (refKey: string | undefined) => {
          if (!refKey) return undefined;
          try {
              // Now we look up by the Title (refKey) directly in IDB
              const blob = await AssetStore.getAsset(refKey);
              if (blob) {
                  return URL.createObjectURL(blob);
              }
          } catch (e) {
              console.warn(`Failed to restore asset for ref: ${refKey}`, e);
          }
          return undefined;
      };

      // Load Session Layers using References
      if (saved.baseImageRef) merged.baseImage = await restoreAsset(saved.baseImageRef);
      if (saved.deviceImageRef) merged.deviceImage = await restoreAsset(saved.deviceImageRef);
      if (saved.layerCharacterRef) merged.layerCharacter = await restoreAsset(saved.layerCharacterRef);
      if (saved.layerInteractionRef) merged.layerInteraction = await restoreAsset(saved.layerInteractionRef);
      if (saved.layerMotionRef) merged.layerMotion = await restoreAsset(saved.layerMotionRef);

      setConfig(merged);
      setIsInitialized(true);
    };
    loadWorkspace();
  }, []);

  // 2. Persist Workspace (Debounced by Effect)
  useEffect(() => {
    if (!isInitialized) return;

    const saveState = async () => {
      // We explicitly DO NOT save the blob URLs (baseImage, etc.) to LS.
      // We save the Refs (Title Keys).
      const { 
          baseImage, deviceImage, layerCharacter, layerInteraction, layerMotion, 
          ...persistentConfig 
      } = config;
      
      StorageService.saveWorkspace(persistentConfig);
    };
    saveState();
  }, [config, isInitialized]);

  // Wrapper to handle config updates
  // Note: We no longer write to IDB here. We assume the asset is already in IDB (via Gallery/Import).
  const updateConfig = async (updates: Partial<SimulationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // Logic to auto-update prompts based on state changes
  useEffect(() => {
    if (step === 'INTERACTION_SIM' && isInitialized) {
      const hasDevice = !!config.deviceImage;
      const targetPrompt = constructInteractionPrompt(config.expression, hasDevice);
      const prevNoDevice = constructInteractionPrompt(config.expression, false);
      const prevWithDevice = constructInteractionPrompt(config.expression, true);

      // Only update if the user hasn't customized it significantly
      const isDefault = 
        !config.interactionPrompt || 
        config.interactionPrompt === prevNoDevice || 
        config.interactionPrompt === prevWithDevice;

      if (isDefault) {
        setConfig(prev => ({ ...prev, interactionPrompt: targetPrompt }));
      }
    }
  }, [config.deviceImage, step, config.expression, isInitialized]);

  useEffect(() => {
    if (step === 'INTERACTION_RESULT' && !config.motionPrompt && isInitialized) {
        setConfig(prev => ({ ...prev, motionPrompt: constructMotionPrompt() }));
    }
  }, [step, isInitialized, config.motionPrompt]);

  return { config, updateConfig, setConfig, isInitialized };
};
