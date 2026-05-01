
import React, { useRef, useEffect } from 'react';
import { SimulationStep, SimulationConfig } from '../types';
import { BottomButtonGroup, BackButton, PrimaryButton, ImportButton, ResetButton } from './ActionButtons';
import { resizeImage } from '../services/utils';
import { constructMotionPrompt } from '../services/promptFactory';
import { ControlSection } from './ControlSection';

interface InteractionResultControlsProps {
  config: SimulationConfig;
  updateConfig: (updates: Partial<SimulationConfig>) => void;
  onGenerate: (mode: 'INTERACTION' | 'MOTION') => void;
  setStep: (step: SimulationStep) => void;
  isGenerating: boolean;
  isMotionMode?: boolean;
  onInteractionUpload?: (base64: string, filename: string) => void;
  onDeviceUpload?: (base64: string, filename: string) => void;
  onUnloadAsset?: (role: 'device' | 'face') => void;
  onHeightChange?: (height: number) => void;
  isConnectionReady?: boolean;
  onConfigureRequest?: () => void;
}

export const InteractionResultControls: React.FC<InteractionResultControlsProps> = ({
  config,
  updateConfig,
  onGenerate,
  setStep,
  isGenerating,
  isMotionMode = false,
  onInteractionUpload,
  onDeviceUpload,
  onUnloadAsset,
  onHeightChange,
  isConnectionReady = false,
  onConfigureRequest
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Height reporting logic
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
  }, [config.motionPrompt]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onInteractionUpload) {
      try {
        const resized = await resizeImage(file);
        onInteractionUpload(resized, file.name); // Pass original filename
        e.target.value = '';
      } catch (err) {
        console.error("Image upload failed", err);
      }
    }
  };

  const handleResetMotionPrompt = () => {
    updateConfig({ motionPrompt: constructMotionPrompt() });
  };

  const SparklesIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
  );

  return (
    <div ref={rootRef} className="w-full bg-zinc-950 border-t border-zinc-800 pt-3 px-3 pb-3 shrink-0 flex flex-col items-center gap-3 shadow-2xl z-20">
      
      {/* Prompt Area - Dedicated Video Prompt */}
      <ControlSection
        label="Motion Prompt"
        className="w-full"
        headerAction={<ResetButton onClick={handleResetMotionPrompt} title="Reset Prompt" />}
        isInputBox={true}
        boxClassName="bg-zinc-900 min-h-[3.5rem]"
      >
              <textarea 
                ref={textareaRef}
                value={config.motionPrompt || ""}
                onChange={(e) => updateConfig({ motionPrompt: e.target.value })}
                disabled={isGenerating}
                placeholder="Describe motion or effect for video..."
                className="w-full bg-transparent border-none outline-none text-xs text-zinc-200 resize-none placeholder-zinc-600 font-mono overflow-hidden"
                rows={1}
              />
      </ControlSection>

      <BottomButtonGroup>
          <BackButton 
            onClick={() => setStep('INTERACTION_SIM')} 
            disabled={isGenerating}
            title="Back to Interaction"
            className="flex-none"
          />
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            className="hidden" 
            accept="image/*" 
            disabled={isGenerating}
          />
          
          <ImportButton
             label="Import Interaction"
             onClick={() => fileInputRef.current?.click()}
             disabled={isGenerating}
             className="flex-1"
          />
          
          <PrimaryButton
            icon={SparklesIcon}
            onClick={() => onGenerate('MOTION')}
            disabled={isGenerating}
            variant="green"
            className="flex-1"
            isConnectionReady={isConnectionReady}
            onConfigureRequest={onConfigureRequest}
          >
             {/* Visible text on all screen sizes, adjusted for small screens */}
             <span className="inline text-[9px] min-[280px]:text-xs whitespace-nowrap">Motion</span>
          </PrimaryButton>
      </BottomButtonGroup>
    </div>
  );
};
