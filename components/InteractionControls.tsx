
import React, { useRef, useState, useEffect } from 'react';
import { SimulationConfig, SimulationStep } from '../types';
import { getMarkerDirective, constructInteractionPrompt } from '../services/promptFactory';
import { BottomButtonGroup, BackButton, PrimaryButton, NextButton, ResetButton, IconButton } from './ActionButtons';
import { ControlSection } from './ControlSection';
import { OverlayActions } from './OverlayActions';
import { resizeImage } from '../services/utils';

interface InteractionControlsProps {
  config: SimulationConfig;
  updateConfig: (updates: Partial<SimulationConfig>) => void;
  isGenerating: boolean;
  setStep: (step: SimulationStep) => void;
  onGenerate: (mode: 'INTERACTION') => void;
  onInteractionUpload?: (base64: string, filename: string) => void;
  onDeviceUpload?: (base64: string, filename: string) => void;
  onUseAsBase?: (base64: string, filename: string) => void;
  onUnloadAsset?: (role: 'device' | 'face') => void;
  hasInteractionImage: boolean;
  onRevertToBase?: () => void;
  isMotionMode?: boolean;
  onHeightChange?: (height: number) => void;
  isConnectionReady?: boolean;
  onConfigureRequest?: () => void;
}

export const InteractionControls: React.FC<InteractionControlsProps> = ({
  config,
  updateConfig,
  isGenerating,
  setStep,
  onGenerate,
  onInteractionUpload,
  onDeviceUpload,
  onUseAsBase,
  onUnloadAsset,
  hasInteractionImage,
  onRevertToBase,
  isMotionMode = false,
  onHeightChange,
  isConnectionReady = false,
  onConfigureRequest
}) => {
  const deviceInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [showDeviceOverlay, setShowDeviceOverlay] = useState(false);

  // Report height logic
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !onHeightChange) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onHeightChange(entry.target.scrollHeight);
      }
    });
    
    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeightChange]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [config.interactionPrompt]);

  const handleDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file);
        
        if (onDeviceUpload) {
            onDeviceUpload(resized, file.name);
        } else {
            // Fallback
            updateConfig({ deviceImage: resized });
        }

        e.target.value = '';
        setShowDeviceOverlay(false);
      } catch (err) {
        console.error("Device upload failed", err);
      }
    }
  };

  const handleRemoveDevice = () => {
    if (onUnloadAsset) {
        onUnloadAsset('device');
    } else {
        updateConfig({ deviceImage: undefined });
    }
    setShowDeviceOverlay(false); 
  };

  const isTargetingActive = config.showTargetMarker ?? true;
  const hasDevice = !!config.deviceImage;
  const markerDirective = getMarkerDirective(hasDevice);

  const SparklesIcon = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
  
  const handleGenerateClick = () => {
    // Automatically turn off marker if active but no coordinates set
    if (isTargetingActive && !config.targetCoordinates) {
      updateConfig({ showTargetMarker: false });
    }
    onGenerate('INTERACTION');
  };

  const handleResetInteractionPrompt = () => {
    updateConfig({ interactionPrompt: constructInteractionPrompt(config.expression, !!config.deviceImage) });
  };

  const promptChips = (
    <button 
        onClick={() => updateConfig({ showTargetMarker: !isTargetingActive })}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono tracking-tight border select-none transition-all ${
            isTargetingActive 
            ? 'bg-red-950/40 text-red-300 border-red-900/50' 
            : 'bg-transparent text-zinc-500 border-zinc-800 border-dashed'
        }`}
        title={isTargetingActive ? "Disable Interaction Marker" : "Enable Interaction Marker"}
    >
            <span className="font-bold text-left">{markerDirective}</span>
            <svg className={`w-3 h-3 shrink-0 ${isTargetingActive ? 'opacity-100' : 'opacity-50'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isTargetingActive 
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            }
            </svg>
    </button>
  );

  return (
    <div ref={rootRef} className="w-full bg-zinc-950 border-t border-zinc-800 pt-3 px-3 pb-3 shrink-0 flex flex-col items-center gap-3 shadow-2xl z-20">
      
      <div className="flex w-full gap-3 overflow-x-auto py-1 items-stretch no-scrollbar">
         {/* Device Input Area - Responsive Width */}
         <ControlSection label="Device (Optional)" className="w-16 min-[280px]:w-28 shrink-0 flex flex-col">
            <input 
              type="file" 
              ref={deviceInputRef}
              onChange={handleDeviceUpload}
              className="hidden"
              accept="image/*"
              disabled={isGenerating}
            />
            {config.deviceImage ? (
                <div 
                  className="relative w-full flex-1 border border-zinc-700 rounded-sm overflow-hidden shadow-lg cursor-pointer flex items-center justify-center min-h-[3.5rem]"
                  onClick={() => setShowDeviceOverlay(true)}
                >
                   <img src={config.deviceImage} alt="Device" className="max-w-full max-h-full object-contain" />
                   <OverlayActions
                        visible={showDeviceOverlay}
                        onClose={() => setShowDeviceOverlay(false)}
                        onReplace={() => deviceInputRef.current?.click()}
                        onRemove={handleRemoveDevice} // Changed from onDelete
                   />
                </div>
            ) : (
                <button 
                  onClick={() => deviceInputRef.current?.click()}
                  disabled={isGenerating}
                  className="w-full flex-1 border-2 border-dashed border-zinc-600 hover:border-orange-500 hover:bg-zinc-900/50 text-zinc-400 hover:text-orange-400 text-[9px] font-bold tracking-wider flex flex-col items-center justify-center transition-all rounded-sm bg-zinc-950/20 gap-1 group min-h-[3.5rem]"
                >
                  <svg className="w-5 h-5 mb-1 text-zinc-600 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Image</span>
                </button>
            )}
         </ControlSection>

         <ControlSection
            label="Interaction Prompt"
            className="flex-1 min-w-[120px] flex flex-col"
            headerAction={<ResetButton onClick={handleResetInteractionPrompt} title="Reset Prompt" />}
            chips={promptChips}
            isInputBox={true}
            boxClassName="bg-zinc-900 flex-1 min-h-[3.5rem] md:min-h-[8rem]"
         >
                <textarea 
                  ref={textareaRef}
                  value={config.interactionPrompt}
                  onChange={(e) => updateConfig({ interactionPrompt: e.target.value })}
                  disabled={isGenerating}
                  placeholder="Describe mechanical interface and force vectors..."
                  className="w-full bg-transparent border-none outline-none text-xs text-zinc-200 resize-none placeholder-zinc-600 font-mono overflow-hidden"
                  rows={1}
                />
         </ControlSection>
      </div>

      <BottomButtonGroup>
        <BackButton 
          onClick={() => setStep('CHARACTER_SETUP')}
          disabled={isGenerating}
          className="flex-none"
        />

        <div className="contents min-[280px]:flex min-[280px]:flex-1 min-[280px]:gap-2">
            <IconButton
               onClick={onRevertToBase}
               disabled={isGenerating || (!hasInteractionImage && !isMotionMode)}
               className="flex-none"
               title="Reset to Base Character"
            >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </IconButton>

            <PrimaryButton
              icon={SparklesIcon}
              variant="orange"
              onClick={handleGenerateClick}
              disabled={isGenerating}
              className="flex-1 px-1"
              isConnectionReady={isConnectionReady}
              onConfigureRequest={onConfigureRequest}
            >
               <span className="inline text-[10px] min-[280px]:text-xs">Interaction</span>
            </PrimaryButton>
            
            <NextButton
               label="Motion"
               onClick={() => setStep('INTERACTION_RESULT')}
               disabled={isGenerating}
               title="Proceed to Video Generation"
            />
        </div>
      </BottomButtonGroup>
    </div>
  );
};
