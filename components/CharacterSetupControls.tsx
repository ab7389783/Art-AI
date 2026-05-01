
import React, { useRef, useState, useEffect } from 'react';
import { SimulationConfig } from '../types';
import { getMaterialDescription, SKIN_TONES, getPromptParts, DEFAULT_SCENE_PROMPT } from '../services/promptFactory';
import { resizeImage } from '../services/utils';
import { BottomButtonGroup, ImportButton, PrimaryButton, NextButton, ResetButton } from './ActionButtons';
import { ControlSection } from './ControlSection';
import { OverlayActions } from './OverlayActions';

const PHYSIQUE_TYPES = [
  "Emaciated/Thin",
  "Lean/Defined",
  "Lean/Muscular",
  "Muscular/Heavy"
];

interface CharacterSetupControlsProps {
  config: SimulationConfig;
  updateConfig: (updates: Partial<SimulationConfig>) => void;
  onGenerate: (mode: 'CHARACTER') => void;
  isGenerating: boolean;
  sceneDescription: string;
  setSceneDescription: (val: string) => void;
  visibleParts: { face: boolean; physique: boolean; skin: boolean };
  togglePart: (part: 'face' | 'physique' | 'skin') => void;
  onUseAsBase?: (base64: string, filename: string) => void;
  onFaceUpload?: (base64: string, filename: string) => void;
  onUnloadAsset?: (role: 'device' | 'face') => void;
  onCancelEdit?: () => void;
  hasBaseAsset: boolean;
  fullScreenMode: boolean;
  isTight: boolean;
  onHeightChange?: (height: number) => void;
  isConnectionReady?: boolean;
  onConfigureRequest?: () => void;
}

export const CharacterSetupControls: React.FC<CharacterSetupControlsProps> = ({
  config,
  updateConfig,
  onGenerate,
  isGenerating,
  sceneDescription,
  setSceneDescription,
  visibleParts,
  togglePart,
  onUseAsBase,
  onFaceUpload,
  onUnloadAsset,
  onCancelEdit,
  hasBaseAsset,
  fullScreenMode,
  isTight,
  onHeightChange,
  isConnectionReady = false,
  onConfigureRequest
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directImportInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Refs for height measurement
  const inputsRef = useRef<HTMLDivElement>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);
  
  const [isSkinDropdownOpen, setIsSkinDropdownOpen] = useState(false);
  const [isPhysiqueDropdownOpen, setIsPhysiqueDropdownOpen] = useState(false);
  const [showFaceOverlay, setShowFaceOverlay] = useState(false);

  const dynamicParts = getPromptParts(config.nationality, config.characterPhysique, !!config.baseImage);
  const skinInfo = getMaterialDescription(config.nationality);

  const SparklesIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
  );

  // Height reporting logic
  useEffect(() => {
    let inputsHeight = 0;
    let barHeight = 0;

    const report = () => {
      if (onHeightChange) {
        // Only report bar height as the "Control Panel" height for layout calculations
        onHeightChange(barHeight); 
      }
    };

    const inputsObserver = new ResizeObserver((entries) => {
      for (const entry of entries) inputsHeight = entry.target.scrollHeight;
      report();
    });

    const barObserver = new ResizeObserver((entries) => {
      for (const entry of entries) barHeight = entry.target.scrollHeight;
      report();
    });

    if (inputsRef.current) inputsObserver.observe(inputsRef.current);
    if (bottomBarRef.current) barObserver.observe(bottomBarRef.current);

    return () => {
      inputsObserver.disconnect();
      barObserver.disconnect();
    };
  }, [onHeightChange]);

  // Textarea auto-resize
  useEffect(() => {
    const adjustHeight = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    };
    adjustHeight();
    const rafId = requestAnimationFrame(adjustHeight);
    const timerId = setTimeout(adjustHeight, 150);
    window.addEventListener('resize', adjustHeight);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('resize', adjustHeight);
    };
  }, [sceneDescription, visibleParts]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file);
        
        if (onFaceUpload) {
            onFaceUpload(resized, file.name);
        } else {
            // Fallback if no handler provided (legacy behavior)
            updateConfig({ baseImage: resized });
        }
        
        e.target.value = '';
        setShowFaceOverlay(false);
      } catch (err) {
        console.error("Image processing failed", err);
      }
    }
  };

  const handleDirectScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUseAsBase) {
      try {
        const resized = await resizeImage(file);
        onUseAsBase(resized, file.name); // Pass original filename
        e.target.value = '';
      } catch (err) {
        console.error("Image processing failed", err);
      }
    }
  };

  const handleRemoveFace = () => {
    if (onUnloadAsset) {
        onUnloadAsset('face');
    } else {
        updateConfig({ baseImage: undefined });
    }
    setShowFaceOverlay(false);
  };

  const handleResetToClinical = () => {
    setSceneDescription(DEFAULT_SCENE_PROMPT);
  };

  // Chips for the Prompt ControlSection
  const promptChips = (
    <>
        <button 
            onClick={() => togglePart('face')}
            className={`inline-flex items-center justify-start text-left gap-1.5 px-2 py-1 rounded text-[9px] font-mono tracking-tight border select-none transition-all ${
            visibleParts.face 
                ? (config.baseImage ? 'bg-blue-900/30 text-blue-300 border-blue-800/50' : 'bg-zinc-800 text-zinc-300 border-zinc-700')
                : 'bg-transparent text-zinc-500 border-zinc-800 border-dashed'
            }`}
        >
            <span className="font-bold text-left">{dynamicParts.face}</span>
            <svg className={`w-3 h-3 ${visibleParts.face ? 'opacity-100' : 'opacity-50'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {visibleParts.face 
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            }
            </svg>
        </button>

        <button 
            onClick={() => togglePart('physique')}
            className={`inline-flex items-center justify-start text-left gap-1.5 px-2 py-1 rounded text-[9px] font-mono tracking-tight border select-none transition-all ${
            visibleParts.physique
                ? 'bg-orange-900/20 text-orange-300 border-orange-800/30'
                : 'bg-transparent text-zinc-500 border-zinc-800 border-dashed'
            }`}
        >
            <span className="font-bold text-left">{dynamicParts.physique}</span>
            <svg className={`w-3 h-3 ${visibleParts.physique ? 'opacity-100' : 'opacity-50'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {visibleParts.physique 
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            }
            </svg>
        </button>

        <button 
            onClick={() => togglePart('skin')}
            className={`inline-flex items-center justify-start text-left gap-1.5 px-2 py-1 rounded text-[9px] font-mono tracking-tight border select-none transition-all ${
            visibleParts.skin
                ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                : 'bg-transparent text-zinc-500 border-zinc-800 border-dashed'
            }`}
        >
            <span className="w-2 h-2 rounded-full ring-1 ring-zinc-700" style={{ backgroundColor: skinInfo.hex }}></span>
            <span className="font-bold text-left">{dynamicParts.skin}</span>
            <svg className={`w-3 h-3 ${visibleParts.skin ? 'opacity-100' : 'opacity-50'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {visibleParts.skin 
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            }
            </svg>
        </button>
    </>
  );

  return (
    // ROOT CONTAINER
    <div className={`w-full bg-zinc-900 border-t border-zinc-800 transition-all flex flex-col ${
      isTight ? 'h-auto' : 'h-full overflow-hidden'
    }`}>
      
      {/* SCROLLABLE CONTENT AREA */}
      <div className={`w-full flex-col ${
        isTight 
          ? 'flex' 
          : 'flex-1 overflow-y-auto custom-scrollbar flex' 
      }`}>
          {/* MEASUREMENT WRAPPER FOR INPUTS */}
          {/* Added 'my-auto' to vertically center content in the scroll view when space allows */}
          <div ref={inputsRef} className={`flex flex-col w-full h-auto ${!isTight ? 'my-auto' : ''}`}>
              <div className="p-4 gap-5 flex flex-col w-full">
                
                {/* Face Reference */}
                <ControlSection label="Face Reference (Optional)" className="shrink-0">
                    <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    accept="image/*"
                    disabled={isGenerating}
                    />
                    {config.baseImage ? (
                    <div 
                        className="relative w-full border border-zinc-700 rounded-sm overflow-hidden shadow-lg cursor-pointer flex justify-center bg-black"
                        onClick={() => setShowFaceOverlay(true)}
                    >
                        <img src={config.baseImage} alt="Reference Preview" className="max-w-full max-h-[16rem] object-contain" />
                        <OverlayActions
                            visible={showFaceOverlay}
                            onClose={() => setShowFaceOverlay(false)}
                            onReplace={() => fileInputRef.current?.click()}
                            onRemove={handleRemoveFace} // Changed from onDelete
                        />
                    </div>
                    ) : (
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isGenerating}
                        className="w-full h-20 border-2 border-dashed border-zinc-600 hover:border-orange-500 hover:bg-zinc-900/50 text-zinc-400 hover:text-orange-400 text-xs font-bold tracking-wider flex flex-col items-center justify-center transition-all rounded-sm bg-zinc-950/20 gap-2 group"
                    >
                        <svg className="w-6 h-6 text-zinc-600 group-hover:text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span>Image</span>
                    </button>
                    )}
                </ControlSection>

                {/* Physique & Skin */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
                    <ControlSection label="Physique">
                        <button
                            onClick={() => !isGenerating && setIsPhysiqueDropdownOpen(!isPhysiqueDropdownOpen)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-sm p-2 text-xs text-zinc-200 text-left flex items-center justify-between hover:bg-zinc-800 transition-colors"
                        >
                            <span>{config.characterPhysique || "Select Physique"}</span>
                            <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {isPhysiqueDropdownOpen && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-sm shadow-xl z-50 max-h-40 overflow-y-auto custom-scrollbar">
                            {PHYSIQUE_TYPES.map(type => (
                                <button key={type} onClick={() => { updateConfig({ characterPhysique: type }); setIsPhysiqueDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                                {type}
                                </button>
                            ))}
                            </div>
                        )}
                    </ControlSection>

                    <ControlSection label="Skin Color">
                        <button
                            onClick={() => !isGenerating && setIsSkinDropdownOpen(!isSkinDropdownOpen)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-sm p-2 text-xs text-zinc-200 text-left flex items-center justify-between hover:bg-zinc-800 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border border-zinc-600" style={{ backgroundColor: skinInfo.hex }} />
                            <span>{config.nationality || "Select Pigment"}</span>
                            </div>
                            <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {isSkinDropdownOpen && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-sm shadow-xl z-50 max-h-40 overflow-y-auto custom-scrollbar">
                            {SKIN_TONES.map(tone => (
                                <button key={tone.id} onClick={() => { updateConfig({ nationality: tone.label }); setIsSkinDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full border border-zinc-600" style={{ backgroundColor: tone.color }} />
                                <span>{tone.label}</span>
                                </button>
                            ))}
                            </div>
                        )}
                    </ControlSection>
                </div>

                {/* Prompt Box */}
                <ControlSection 
                    label="Character Prompt" 
                    className="shrink-0"
                    headerAction={<ResetButton onClick={handleResetToClinical} title="Reset Prompt" />}
                    chips={promptChips}
                    isInputBox={true}
                    boxClassName="bg-zinc-950"
                >
                    <textarea 
                        ref={textareaRef}
                        value={sceneDescription}
                        onChange={(e) => setSceneDescription(e.target.value)}
                        disabled={isGenerating}
                        className="w-full bg-transparent border-none outline-none text-xs text-zinc-300 min-h-[3.5rem] md:min-h-[6rem] resize-none font-mono placeholder-zinc-700 overflow-hidden no-scrollbar"
                        placeholder="Describe scene, pose, and lighting..."
                        rows={1}
                    />
                </ControlSection>
              </div>
          </div>
      </div>

      {/* BOTTOM BAR */}
      <div ref={bottomBarRef} className="w-full shrink-0 z-20 bg-zinc-950 border-t border-zinc-800 p-3 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
          <BottomButtonGroup>
                <input type="file" ref={directImportInputRef} onChange={handleDirectScanUpload} className="hidden" accept="image/*" />
                <ImportButton 
                    label="Import Character"
                    onClick={() => directImportInputRef.current?.click()}
                    className="flex-1"
                    disabled={isGenerating}
                />
                <PrimaryButton
                    label="New Character"
                    icon={SparklesIcon}
                    onClick={() => onGenerate('CHARACTER')}
                    disabled={isGenerating} 
                    variant="orange"
                    className="flex-1"
                    isConnectionReady={isConnectionReady}
                    onConfigureRequest={onConfigureRequest}
                />
                {hasBaseAsset && (
                    <NextButton
                    onClick={() => onCancelEdit?.()}
                    disabled={isGenerating}
                    />
                )}
          </BottomButtonGroup>
      </div>
    </div>
  );
};
