
import { useState, useRef } from 'react';
import { SimulationConfig, GeneratedAsset } from '../types';
import { generateCharacterRender, generateMotionSimulation, generateInteractionResult } from '../services/geminiService';
import { constructMotionPrompt, getMarkerDirective } from '../services/promptFactory';
import { createMarkedImage } from '../services/imageProcessing';
import { DEFAULT_RETRIES } from '../services/apiClient';
import { ensureConnection } from '../services/authService';
import { blobUrlToBase64, getTimestampName } from '../services/utils';
import { AppSettings } from './useSettings';

interface UseGenerationProps {
  config: SimulationConfig;
  settings: AppSettings;
  masterCharacterAsset: GeneratedAsset | null;
  interactionAsset: GeneratedAsset | null;
  addToGallery: (asset: GeneratedAsset) => Promise<GeneratedAsset>;
  addLog: (msg: string, level?: 'info' | 'warning' | 'error' | 'success', rawData?: any) => void;
  addToast: (msg: string, level?: 'info' | 'warning' | 'error' | 'success', rawData?: any) => void;
  updateConfig: (updates: Partial<SimulationConfig>) => void;
  onGenerationComplete: (asset: GeneratedAsset, mode: 'CHARACTER' | 'INTERACTION' | 'MOTION') => void;
}

export const useGeneration = ({
  config,
  settings,
  masterCharacterAsset,
  interactionAsset,
  addToGallery,
  addLog,
  addToast,
  updateConfig,
  onGenerationComplete
}: UseGenerationProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  
  const maxRetriesRef = useRef(DEFAULT_RETRIES);
  const abortControllerRef = useRef<AbortController | null>(null);
  const errorLoggedRef = useRef(false);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setLoadingMessage("");
    addToast("Operation Cancelled", 'warning');
  };
  
  const handleTryMore = () => {
    maxRetriesRef.current += 3;
    const newLimit = maxRetriesRef.current;
    setLoadingMessage(prev => prev?.replace(/Attempt (\d+)\/\d+/, `Attempt $1/${newLimit}`) || "");
    addToast(`Retry limit increased to ${newLimit}`, 'info');
  };

  const handleAttemptError = (error: any, attempt: number) => {
    let message = error?.message || String(error);
    message = message.replace(/^Error:\s*/i, '').trim();
    const logTitle = `[Attempt ${attempt} Failed] ${message}`;
    
    errorLoggedRef.current = true;
    addToast(logTitle, 'error', error);
  };

  const generate = async (mode: 'CHARACTER' | 'INTERACTION' | 'MOTION') => {
    setIsGenerating(true);
    maxRetriesRef.current = DEFAULT_RETRIES; 
    errorLoggedRef.current = false; 
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const modeLabelMap = { 'CHARACTER': 'Character', 'INTERACTION': 'Interaction', 'MOTION': 'Motion' };
    const modeLabel = modeLabelMap[mode];
    addLog(`Processing ${modeLabel} Generation...`, 'info');

    if (config.showTargetMarker && !config.targetCoordinates) {
        updateConfig({ showTargetMarker: false });
    }
    
    const handleBackgroundSuccess = async (url: string, type: 'image' | 'video') => {
        const metaPrompt = type === 'video' 
            ? (config.motionPrompt || constructMotionPrompt()) 
            : (type === 'image' && mode === 'INTERACTION' ? config.interactionPrompt : config.characterPrompt);

        const ext = type === 'video' ? 'mp4' : 'png';
        const baseTitle = getTimestampName("Art_AI", ext);

        const backgroundAsset: GeneratedAsset = {
            id: crypto.randomUUID(), type, url, timestamp: Date.now(),
            title: baseTitle, 
            metadata: { 
                prompt: metaPrompt, 
                model: 'Parallel Result',
                variant: type === 'video' ? 'motion' : (mode === 'CHARACTER' ? 'character' : 'interaction') 
            }
        };
        await addToGallery(backgroundAsset);
        addToast("Additional variant saved to Gallery", 'success');
    };

    try {
      if (!(await ensureConnection((msg) => addToast(msg, 'info')))) return;

      let baseImageForApi: string | undefined = undefined;
      let deviceImageForApi: string | undefined = undefined;

      const safeConvert = async (url: string | undefined, label: string) => {
         if (!url) return undefined;
         if (url.startsWith('blob:')) {
            try {
                return await blobUrlToBase64(url);
            } catch (e: any) {
                throw new Error(`Failed to process ${label}: ${e.message}`);
            }
         }
         return url;
      };

      if (mode === 'CHARACTER') {
         baseImageForApi = await safeConvert(config.baseImage, "Face Reference");

        const characterAsset = await generateCharacterRender(
          config.characterPrompt, baseImageForApi,
          setLoadingMessage,
          () => maxRetriesRef.current, signal, (url) => handleBackgroundSuccess(url, 'image'),
          handleAttemptError,
          settings.imageModel
        );
        
        const asset: GeneratedAsset = {
            ...characterAsset,
            title: characterAsset.title || getTimestampName("Art_AI", "png"), 
            metadata: { ...characterAsset.metadata!, variant: 'character' }
        };

        const savedAsset = await addToGallery(asset);
        onGenerationComplete(savedAsset, 'CHARACTER');

        addToast(`${modeLabel} Generated`, 'success');
      } 
      else {
        // INTERACTION & MOTION
        let sourceUrl: string | undefined;

        if (mode === 'INTERACTION') {
            // Priority: Existing Interaction > Master Character (Iterative Workflow)
            sourceUrl = interactionAsset?.url || masterCharacterAsset?.url;
            if (!sourceUrl) throw new Error("Missing base character or interaction layer.");
            sourceUrl = await safeConvert(sourceUrl, "Base Source");
            
            deviceImageForApi = await safeConvert(config.deviceImage, "Device Reference");

            const hasDevice = !!deviceImageForApi;
            if (hasDevice && config.showTargetMarker && config.targetCoordinates) {
                 setLoadingMessage("Compositing Marker...");
                 try {
                     sourceUrl = await createMarkedImage(sourceUrl!, config.targetCoordinates.x, config.targetCoordinates.y);
                 } catch (e: any) {
                     throw new Error(`Failed to apply marker composite: ${e.message}`);
                 }
            }
        } else if (mode === 'MOTION') {
            // Priority: Interaction Asset > Master Character
            sourceUrl = interactionAsset?.url || masterCharacterAsset?.url;
            if (!sourceUrl) throw new Error("Missing input source for motion (No Character or Interaction available).");
             
            sourceUrl = await safeConvert(sourceUrl, "Input Source");
        }

        let finalPrompt = "";
        
        if (mode === 'INTERACTION') {
            const hasDevice = !!deviceImageForApi;
            if (hasDevice && config.targetCoordinates && config.showTargetMarker) {
                 const markerDirective = getMarkerDirective(hasDevice);
                 finalPrompt = `${markerDirective} ${config.interactionPrompt}`;
            } else {
                 finalPrompt = config.interactionPrompt;
            }
        } else {
             finalPrompt = config.motionPrompt || constructMotionPrompt();
        }

        if (mode === 'INTERACTION') {
             const interactionUrl = await generateInteractionResult(
               sourceUrl!, finalPrompt, deviceImageForApi, 
               setLoadingMessage, () => maxRetriesRef.current, signal, (url) => handleBackgroundSuccess(url, 'image'),
               handleAttemptError,
               settings.imageModel
             );
             
             const asset: GeneratedAsset = {
                 id: crypto.randomUUID(), type: 'image', url: interactionUrl, timestamp: Date.now(),
                 title: getTimestampName("Art_AI", "png"), 
                 metadata: { prompt: finalPrompt, model: settings.imageModel, variant: 'interaction' }
             };
             
             const savedAsset = await addToGallery(asset);
             onGenerationComplete(savedAsset, 'INTERACTION');

             addToast(`${modeLabel} Generated`, 'success');

        } else if (mode === 'MOTION') {
             const motionAsset = await generateMotionSimulation(
               finalPrompt, sourceUrl!, 
               setLoadingMessage, () => maxRetriesRef.current, signal, (url) => handleBackgroundSuccess(url, 'video'),
               handleAttemptError,
               settings.videoModel
             );
             
             const asset: GeneratedAsset = {
                 ...motionAsset,
                 title: motionAsset.title || getTimestampName("Art_AI", "mp4"), 
                 metadata: { ...motionAsset.metadata!, variant: 'motion' }
             };

             const savedAsset = await addToGallery(asset);
             onGenerationComplete(savedAsset, 'MOTION');

             addToast(`${modeLabel} Generated`, 'success');
        }
      }
    } catch (error: any) {
      if (error.message === "Operation Cancelled") return; 
      
      const msg = error.message || (typeof error === 'string' ? error : "Generation Failed");
      
      if (!errorLoggedRef.current) {
          addToast(msg, 'error', error); 
      }
      
      setLoadingMessage(""); 
    } finally {
      setIsGenerating(false);
      if (abortControllerRef.current) abortControllerRef.current = null;
    }
  };

  return {
    isGenerating,
    loadingMessage,
    generate,
    handleStopGeneration,
    handleTryMore
  };
};
