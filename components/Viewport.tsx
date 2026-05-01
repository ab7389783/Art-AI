
import React, { useRef, useEffect, useState } from 'react';
import { GeneratedAsset, SimulationStep } from '../types';
import { OverlayActions } from './OverlayActions';
import { resizeImage } from '../services/utils';

interface ViewportProps {
  step: SimulationStep;
  character: GeneratedAsset | null;
  interaction: GeneratedAsset | null;
  motion: GeneratedAsset | null;
  
  isLoading?: boolean;
  loadingMessage?: string;
  onTargetClick?: (x: number, y: number) => void;
  targetCoordinates?: { x: number; y: number };
  isMarkerVisible?: boolean;
  
  onUnloadAsset?: (role: 'character' | 'interaction' | 'motion') => void;
  onReplaceAsset?: (base64: string, filename: string) => void;
}

export const Viewport: React.FC<ViewportProps> = ({ 
  step,
  character,
  interaction,
  motion,
  isLoading,
  onTargetClick,
  targetCoordinates,
  isMarkerVisible = true,
  onUnloadAsset,
  onReplaceAsset
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [activeOverlayLayer, setActiveOverlayLayer] = useState<'character' | 'interaction' | null>(null);

  // Measure Viewport
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // --- VISIBILITY LOGIC ---
  const isCharacterVisible = !!character;
  const isInteractionVisible = !!interaction && (step === 'INTERACTION_SIM' || step === 'INTERACTION_RESULT');
  const isMotionVisible = !!motion && step === 'INTERACTION_RESULT';

  // --- REFERENCE ASSET FOR ASPECT RATIO ---
  // The asset that dictates the "tight wrapper" dimensions.
  // Priority: Motion > Interaction > Character
  const referenceAsset = isMotionVisible ? motion : (isInteractionVisible ? interaction : character);

  // Aspect Ratio Calculation
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    // Reset if no assets
    if (!referenceAsset) {
        setAspectRatio(null);
        return;
    }

    if (referenceAsset.type === 'video') {
        // Assume video is loaded and we might need to get metadata or assume 9:16 default?
        // For simplicity, we can try to load it or just wait. 
        // But ideally, we want to know AR. Let's assume standard logic or use onLoadedMetadata.
        // For now, if it's video, we rely on the video element firing loadedmetadata.
    } else {
        const img = new Image();
        img.src = referenceAsset.url || "";
        img.onload = () => {
            if (img.naturalHeight) setAspectRatio(img.naturalWidth / img.naturalHeight);
        };
    }
  }, [referenceAsset?.id, referenceAsset?.url, referenceAsset?.type]);

  // Video Ref for Autoplay
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (isMotionVisible && videoRef.current) {
        videoRef.current.load();
        videoRef.current.muted = true; 
        videoRef.current.play().catch(() => {});
    }
  }, [isMotionVisible, motion?.url]);


  // --- HANDLERS ---
  const handleContainerClick = () => {
    setActiveOverlayLayer(null);
  };

  const handleLayerClick = (e: React.MouseEvent, layer: 'character' | 'interaction') => {
    e.stopPropagation();
    
    // Priority: Marker Placement (Only on Interaction Layer or Character if Interaction Mode)
    if (step === 'INTERACTION_SIM' && onTargetClick && isMarkerVisible) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        onTargetClick(x, y);
        return;
    }

    // Toggle Overlay
    setActiveOverlayLayer(activeOverlayLayer === layer ? null : layer);
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onReplaceAsset) {
        try {
            const base64 = await resizeImage(file);
            onReplaceAsset(base64, file.name);
            setActiveOverlayLayer(null);
        } catch (error) {
            console.error("Replacement failed", error);
        }
    }
    e.target.value = '';
  };

  const getTightWrapperStyle = (): React.CSSProperties => {
    if (!aspectRatio || viewportSize.width === 0 || viewportSize.height === 0) {
       return { width: '100%', height: '100%' }; // Fallback to fill
    }

    const viewportRatio = viewportSize.width / viewportSize.height;
    if (aspectRatio > viewportRatio) {
        return { width: '100%', height: 'auto', aspectRatio: `${aspectRatio}` };
    } else {
        return { width: 'auto', height: '100%', aspectRatio: `${aspectRatio}` };
    }
  };

  // Determine which replacement logic to use based on active overlay
  // If overlay is on Interaction, replace interaction. If on Character, replace character.
  // BUT the parent passes a single `onReplaceAsset`. 
  // Parent logic: "Replace is only allowed for images in setup/result steps... currentAsset?.type === 'image'"
  // We might need to handle this carefully.
  // For now, if we are clicking Character, and Step is Setup, we replace Character.
  // If clicking Interaction, and Step is Sim/Result, we replace Interaction.
  // The `onReplaceAsset` passed from App handles logic based on Step.
  
  const canModify = !isLoading;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden group/viewport"
      onClick={handleContainerClick}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleReplaceFileChange} 
        className="hidden" 
        accept="image/*"
      />

      {/* EMPTY STATE */}
      {!character && !interaction && !motion && (
        <div className="text-zinc-600 font-mono text-sm flex flex-col items-center p-4 text-center">
          <svg className="w-16 h-16 mb-4 opacity-20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          <p>No Assets</p>
          <p className="text-xs mt-2 block">Configure simulation parameters to begin.</p>
        </div>
      )}

      {/* STACKED LAYERS */}
      <div className="relative shadow-2xl transition-all" style={getTightWrapperStyle()}>
        
        {/* Layer 1: Master Character (Z-0) */}
        {isCharacterVisible && character && (
             <div className="absolute inset-0 z-0">
                 <img 
                    src={character.url} 
                    alt="Character"
                    className={`w-full h-full object-contain ${step === 'INTERACTION_SIM' && !isInteractionVisible ? 'cursor-crosshair' : 'cursor-pointer'}`}
                    onClick={(e) => handleLayerClick(e, 'character')}
                    draggable={false}
                 />
                 {activeOverlayLayer === 'character' && canModify && (
                     <OverlayActions 
                        visible={true}
                        onClose={() => setActiveOverlayLayer(null)}
                        onReplace={onReplaceAsset && step === 'CHARACTER_SETUP' ? () => fileInputRef.current?.click() : undefined}
                        onRemove={onUnloadAsset ? () => onUnloadAsset('character') : undefined}
                     />
                 )}
             </div>
        )}

        {/* Layer 2: Interaction (Z-10) */}
        {isInteractionVisible && interaction && (
             <div className="absolute inset-0 z-10">
                 <img 
                    src={interaction.url} 
                    alt="Interaction"
                    className={`w-full h-full object-contain ${step === 'INTERACTION_SIM' ? 'cursor-crosshair' : 'cursor-pointer'}`}
                    onClick={(e) => handleLayerClick(e, 'interaction')}
                    draggable={false}
                 />
                 {activeOverlayLayer === 'interaction' && canModify && (
                     <OverlayActions 
                        visible={true}
                        onClose={() => setActiveOverlayLayer(null)}
                        onReplace={onReplaceAsset && step !== 'CHARACTER_SETUP' ? () => fileInputRef.current?.click() : undefined}
                        onRemove={onUnloadAsset ? () => onUnloadAsset('interaction') : undefined}
                     />
                 )}
             </div>
        )}

        {/* Marker Overlay (Z-15) - Needs to sit on top of images but below video */}
        {step === 'INTERACTION_SIM' && isMarkerVisible && targetCoordinates && (
            <div 
                className="absolute w-8 h-8 border-2 border-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 animate-pulse z-15"
                style={{ 
                left: `${targetCoordinates.x}%`, 
                top: `${targetCoordinates.y}%`,
                zIndex: 15
                }}
            >
                <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
        )}

        {/* Layer 3: Motion (Z-20) */}
        {isMotionVisible && motion && (
             <div className="absolute inset-0 z-20 bg-black">
                 <video 
                    ref={videoRef}
                    controls
                    loop
                    muted
                    className="w-full h-full object-contain"
                    src={motion.url}
                    controlsList="nodownload"
                    onLoadedMetadata={(e) => {
                         // Optional: Sync aspect ratio if video is reference
                         if (referenceAsset === motion) {
                             const v = e.currentTarget;
                             if(v.videoWidth && v.videoHeight) setAspectRatio(v.videoWidth / v.videoHeight);
                         }
                    }}
                 />
                 {/* Video Actions (Top Right) */}
                 {canModify && onUnloadAsset && (
                     <button 
                         onClick={(e) => { e.stopPropagation(); onUnloadAsset('motion'); }}
                         className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-red-900/80 border border-red-500 hover:bg-red-600 hover:border-red-400 text-red-100 hover:text-white flex items-center justify-center transition-all shadow-xl hover:scale-110"
                         title="Unload Motion"
                     >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                         </svg>
                     </button>
                 )}
             </div>
        )}

      </div>

      {/* Loading State Overlay */}
      {isMotionVisible && !motion?.url && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500 z-30">
           <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
           <div className="text-xs font-mono">Loading Video...</div>
        </div>
      )}

    </div>
  );
};
