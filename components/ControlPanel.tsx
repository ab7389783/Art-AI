
import React, { useEffect } from 'react';
import { SimulationStep, SimulationConfig } from '../types';
import { getPromptParts, DEFAULT_SCENE_PROMPT } from '../services/promptFactory';
import { InteractionControls } from './InteractionControls';
import { InteractionResultControls } from './InteractionResultControls';
import { CharacterSetupControls } from './CharacterSetupControls';
import { RegenerationControls } from './RegenerationControls';

interface ControlPanelProps {
  step: SimulationStep;
  setStep: (step: SimulationStep) => void;
  config: SimulationConfig;
  updateConfig: (updates: Partial<SimulationConfig>) => void;
  onGenerate: (mode: 'CHARACTER' | 'INTERACTION' | 'MOTION') => void;
  onReset: () => void;
  onCancelEdit?: () => void;
  onRevertToBase?: () => void;
  onUseAsBase?: (base64: string, filename: string) => void;
  onInteractionUpload?: (base64: string, filename: string) => void;
  onFaceUpload?: (base64: string, filename: string) => void;
  onDeviceUpload?: (base64: string, filename: string) => void;
  onUnloadAsset?: (role: 'device' | 'face') => void;
  isGenerating: boolean;
  hasBaseAsset: boolean;
  isEditing?: boolean;
  fullScreenMode?: boolean;
  hasInteractionImage?: boolean;
  isMotionMode?: boolean;
  isTight?: boolean;
  onHeightChange?: (height: number) => void;
  isConnectionReady: boolean;
  onConfigureRequest: () => void;
}

// WRAPPER
const Wrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`w-full flex flex-col ${className}`}>
    {children}
  </div>
);

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  step, 
  setStep, 
  config,
  updateConfig,
  onGenerate, 
  onReset,
  onCancelEdit,
  onRevertToBase,
  onUseAsBase,
  onInteractionUpload,
  onFaceUpload,
  onDeviceUpload,
  onUnloadAsset,
  isGenerating, 
  hasBaseAsset,
  isEditing = false,
  fullScreenMode = false,
  hasInteractionImage = false,
  isMotionMode = false,
  isTight = false,
  onHeightChange,
  isConnectionReady,
  onConfigureRequest
}) => {
  // Config holds persisted state for description/visibility
  const visibleParts = config.visibleParts || { face: true, physique: true, skin: true };
  const sceneDescription = config.sceneDescription ?? DEFAULT_SCENE_PROMPT;

  const dynamicParts = getPromptParts(config.nationality, config.characterPhysique, !!config.baseImage);

  // Sync the final prompt to config whenever dependencies change
  useEffect(() => {
    if (step === 'CHARACTER_SETUP' && !isGenerating) {
      const segments: string[] = [];
      if (visibleParts.face) segments.push(dynamicParts.face);
      if (visibleParts.physique) segments.push(dynamicParts.physique);
      if (visibleParts.skin) segments.push(dynamicParts.skin);
      if (sceneDescription) segments.push(sceneDescription);
      
      const fullPrompt = segments.join('. ');
      
      if (config.characterPrompt !== fullPrompt) {
        updateConfig({ characterPrompt: fullPrompt });
      }
    }
  }, [
    config.nationality, 
    config.characterPhysique, 
    config.baseImage, 
    sceneDescription, 
    visibleParts, 
    step, 
    isGenerating,
    dynamicParts.face,
    dynamicParts.physique,
    dynamicParts.skin
  ]);

  const togglePart = (part: keyof typeof visibleParts) => {
    if (!isGenerating) {
      const newParts = { ...visibleParts, [part]: !visibleParts[part] };
      updateConfig({ visibleParts: newParts });
    }
  };

  const setSceneDescription = (val: string) => {
      updateConfig({ sceneDescription: val });
  };

  const wrapperClass = (fullScreenMode && !isTight) ? "h-full" : "h-auto";

  if (step === 'INTERACTION_SIM') {
    return (
      <Wrapper className={wrapperClass}>
        <InteractionControls
          config={config}
          updateConfig={updateConfig}
          isGenerating={isGenerating}
          setStep={setStep}
          onGenerate={onGenerate}
          onInteractionUpload={onInteractionUpload}
          onDeviceUpload={onDeviceUpload} // Passed
          onUnloadAsset={onUnloadAsset}
          onUseAsBase={onUseAsBase}
          hasInteractionImage={!!hasInteractionImage}
          onRevertToBase={onRevertToBase}
          isMotionMode={isMotionMode}
          onHeightChange={onHeightChange}
          isConnectionReady={isConnectionReady}
          onConfigureRequest={onConfigureRequest}
        />
      </Wrapper>
    );
  }

  if (step === 'INTERACTION_RESULT') {
    return (
      <Wrapper className={wrapperClass}>
        <InteractionResultControls
          config={config}
          updateConfig={updateConfig}
          onGenerate={onGenerate}
          setStep={setStep}
          isGenerating={isGenerating}
          isMotionMode={isMotionMode}
          onInteractionUpload={onInteractionUpload}
          onDeviceUpload={onDeviceUpload} // Passed for Device management in Motion
          onUnloadAsset={onUnloadAsset} // Passed
          onHeightChange={onHeightChange}
          isConnectionReady={isConnectionReady}
          onConfigureRequest={onConfigureRequest}
        />
      </Wrapper>
    );
  }

  if (step === 'CHARACTER_SETUP' && hasBaseAsset && !isEditing) {
    return (
      <Wrapper className={wrapperClass}>
        <RegenerationControls 
          config={config} // Passed
          updateConfig={updateConfig} // Passed
          onReset={onReset}
          onGenerate={onGenerate}
          setStep={setStep}
          isGenerating={isGenerating}
          onFaceUpload={onFaceUpload} // Passed
          onUnloadAsset={onUnloadAsset} // Passed
          onHeightChange={onHeightChange}
          isConnectionReady={isConnectionReady}
          onConfigureRequest={onConfigureRequest}
        />
      </Wrapper>
    );
  }

  return (
    <Wrapper className={wrapperClass}>
      <CharacterSetupControls 
        config={config}
        updateConfig={updateConfig}
        onGenerate={onGenerate}
        isGenerating={isGenerating}
        sceneDescription={sceneDescription}
        setSceneDescription={setSceneDescription}
        visibleParts={visibleParts}
        togglePart={togglePart}
        onUseAsBase={onUseAsBase}
        onFaceUpload={onFaceUpload} // Passed
        onUnloadAsset={onUnloadAsset}
        onCancelEdit={onCancelEdit}
        hasBaseAsset={hasBaseAsset}
        fullScreenMode={fullScreenMode}
        isTight={isTight}
        onHeightChange={onHeightChange}
        isConnectionReady={isConnectionReady}
        onConfigureRequest={onConfigureRequest}
      />
    </Wrapper>
  );
};
