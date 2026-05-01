
import React, { useRef, useEffect } from 'react';
import { SimulationStep, SimulationConfig } from '../types';
import { BottomButtonGroup, BackButton, PrimaryButton, NextButton } from './ActionButtons';

interface RegenerationControlsProps {
  config: SimulationConfig;
  updateConfig: (updates: Partial<SimulationConfig>) => void;
  onReset: () => void;
  onGenerate: (mode: 'CHARACTER') => void;
  setStep: (step: SimulationStep) => void;
  isGenerating: boolean;
  onFaceUpload?: (base64: string, filename: string) => void;
  onUnloadAsset?: (role: 'device' | 'face') => void;
  onHeightChange?: (height: number) => void;
  isConnectionReady?: boolean;
  onConfigureRequest?: () => void;
}

export const RegenerationControls: React.FC<RegenerationControlsProps> = ({
  config,
  updateConfig,
  onReset,
  onGenerate,
  setStep,
  isGenerating,
  onFaceUpload,
  onUnloadAsset,
  onHeightChange,
  isConnectionReady = false,
  onConfigureRequest
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

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

  const SparklesIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
  );

  return (
    <div ref={rootRef} className="w-full bg-zinc-950 border-t border-zinc-800 p-3 shrink-0 flex flex-col items-center justify-center gap-3 z-20 shadow-2xl">
      
      <BottomButtonGroup>
          <BackButton 
            onClick={onReset} 
            disabled={isGenerating}
            title="Edit Settings"
            className="flex-none"
          />
          <PrimaryButton
            label="Regenerate"
            icon={SparklesIcon}
            onClick={() => onGenerate('CHARACTER')}
            disabled={isGenerating}
            variant="orange"
            className="flex-1"
            isConnectionReady={isConnectionReady}
            onConfigureRequest={onConfigureRequest}
          />
          <NextButton
            label="Interaction"
            onClick={() => setStep('INTERACTION_SIM')}
            disabled={isGenerating}
          />
      </BottomButtonGroup>
    </div>
  );
};
