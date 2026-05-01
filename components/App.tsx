
import React, { useState, useEffect, useCallback } from 'react';
import { Viewport } from './components/Viewport';
import { ControlPanel } from './components/ControlPanel';
import { Header } from './components/Header';
import { Gallery } from './components/Gallery';
import { Settings } from './components/Settings';
import { ToastContainer } from './components/ToastContainer';
import { LoadingOverlay } from './components/LoadingOverlay';
import { LogOverlay } from './components/LogOverlay';
import { useGallery } from './hooks/useGallery';
import { useSystem } from './hooks/useSystem';
import { useSimulation } from './hooks/useSimulation';
import { useSettings } from './hooks/useSettings';
import { AuthService } from './services/apiKeyService';

export const App: React.FC = () => {
  // --- HOOKS ---
  const { gallery, isGalleryOpen, setIsGalleryOpen, addToGallery, removeFromGallery, clearGallery } = useGallery();
  const { logs, toasts, showLogsOverlay, setShowLogsOverlay, addLog, addToast, removeToast, clearLogs } = useSystem();
  const { settings, updateSettings } = useSettings();
  
  const { state, actions } = useSimulation({ addToGallery, addLog, addToast, gallery, settings });

  const { 
    step, config, currentAsset, masterSubjectImage, hasInteractionImage, 
    isGenerating, isEditing, loadingMessage 
  } = state;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Tracks if we have a valid key ready for generation
  const [isConnectionReady, setIsConnectionReady] = useState(false);

  const hasSubject = !!masterSubjectImage;
  const shouldShowViewport = hasSubject && (step === 'INTERACTION_SIM' || !isEditing);

  // --- LAYOUT LOGIC ---
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [controlPanelContentHeight, setControlPanelContentHeight] = useState(0);

  // Check Connection Status (Persistence Aware)
  const checkConnectionStatus = useCallback(async () => {
    // 1. Check if the currently configured mode yields a VALID effective key (Manual or visible Env)
    if (AuthService.hasKey()) {
        setIsConnectionReady(true);
        return;
    }

    // 2. Auto-Recovery / Initial Setup Logic for AI Studio
    const aistudio = (window as any).aistudio;
    if (aistudio) {
        try {
            const hasSelectedKey = await aistudio.hasSelectedApiKey();
            if (hasSelectedKey) {
                 AuthService.setMode('auto');
                 setIsConnectionReady(true);
                 return;
            }
        } catch (e) {
            console.warn("Auth check failed", e);
        }
    }

    // 3. Fallback: No valid key found
    setIsConnectionReady(false);
  }, []);

  // 1. Track Window Height & Initial Key Check
  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    
    checkConnectionStatus();

    return () => window.removeEventListener('resize', handleResize);
  }, [checkConnectionStatus]);

  // Re-check status when generation finishes (user might have selected key or updated settings)
  useEffect(() => {
    if (!isGenerating) {
        checkConnectionStatus();
    }
  }, [isGenerating, checkConnectionStatus]);

  const HEADER_HEIGHT = 48; // Approx 48px
  const chromeHeight = controlPanelContentHeight + HEADER_HEIGHT;
  
  const isTight = chromeHeight > (windowHeight * 0.65);

  const handleConfigureRequest = () => {
     setIsSettingsOpen(true);
     if (!isConnectionReady) {
        addToast("Please connect your Access Key in settings", "info");
     }
  };

  const handleUnloadViewport = () => {
     // Determine role based on what's currently in the viewport
     let role: 'motion' | 'interaction' | 'character' = 'character';

     if (currentAsset?.type === 'video') {
         role = 'motion';
     } else if (currentAsset?.metadata?.variant === 'interaction') {
         role = 'interaction';
     } else if (currentAsset?.metadata?.variant === 'character') {
         role = 'character';
     }

     actions.handleUnloadAsset(role);
  };

  const handleDeleteAsset = (id: string) => {
    const assetToDelete = gallery.find(a => a.id === id);
    if (!assetToDelete) return;

    // 1. Toast for Deletion (Immediate Feedback)
    const typeLabel = assetToDelete.metadata?.variant 
        ? assetToDelete.metadata.variant.toUpperCase() 
        : assetToDelete.type.toUpperCase();
    const title = assetToDelete.title || "Untitled";
    addToast(`Delete ${typeLabel}: ${title}`, 'info');

    // 2. Remove from Gallery Storage
    removeFromGallery(id);

    // 3. Check & Clear Config References (Face / Device) - SILENTLY
    // Note: Comparing by URL is safer as IDs in config might not be tracked, but here URL is the blob URL.
    if (config.baseImage === assetToDelete.url) {
        actions.updateConfig({ baseImage: undefined });
        // Suppressed: addToast("Face reference unloaded", 'info');
    }
    if (config.deviceImage === assetToDelete.url) {
        actions.updateConfig({ deviceImage: undefined });
        // Suppressed: addToast("Device reference unloaded", 'info');
    }

    // 4. Check & Clear Layer References

    // A. Motion (Video) Check
    // If the deleted asset is the current video being viewed
    if (currentAsset?.id === id && currentAsset.type === 'video') {
        actions.setCurrentAsset(null);
        // Fallback to Interaction Layer if available
        if (state.hasInteractionImage && state.interactionAsset) {
            actions.setCurrentAsset(state.interactionAsset);
        } else if (masterSubjectImage) {
            actions.setCurrentAsset(masterSubjectImage);
        }
    }

    // B. Interaction Layer Check
    if (state.interactionAsset?.id === id) {
        actions.setInteractionImageAsset(null);
        actions.setHasInteractionImage(false);

        // If we were looking at this interaction image
        if (currentAsset?.id === id) {
            actions.setCurrentAsset(null);
            // Fallback to Master Character
            if (masterSubjectImage) {
                actions.setCurrentAsset(masterSubjectImage);
            }
        }
    }

    // C. Master Character Check
    if (masterSubjectImage?.id === id) {
        actions.setMasterSubjectImage(null);
        
        // If we were looking at the master character
        if (currentAsset?.id === id) {
             actions.setCurrentAsset(null);
             // If master is gone, we usually reset to setup
             actions.setStep('CHARACTER_SETUP');
        }
    }
  };

  const handleClearGallery = async () => {
    await clearGallery();

    // Reset Session / Viewport State
    actions.setCurrentAsset(null);
    actions.setMasterSubjectImage(null);
    actions.setInteractionImageAsset(null);
    actions.setHasInteractionImage(false);
    actions.setStep('CHARACTER_SETUP');
    actions.setIsEditing(false); // Reset editing state

    // Reset Configuration Images (Face/Device) references
    // Since all assets are gone, any blob URLs in config are now invalid.
    actions.updateConfig({
        baseImage: undefined,
        deviceImage: undefined
    });

    addToast("Gallery cleared and workspace reset", 'info');
  };
  
  const handleViewportReplace = async (base64: string, filename: string) => {
      // Determine what to replace based on current step
      if (step === 'CHARACTER_SETUP' || step === 'INTERACTION_SIM') {
          // Replace Master Character
          await actions.handleUseUploadedAsBase(base64, filename);
      } else if (step === 'INTERACTION_RESULT') {
          // Replace Interaction Result (Input for Motion)
          await actions.handleInteractionUpload(base64, filename);
      }
  };

  return (
    // ROOT: ALWAYS fixed height, no global scroll.
    <div className="fixed inset-0 w-full h-[100dvh] bg-zinc-950 text-zinc-300 font-sans flex flex-col items-center overflow-hidden">

      {/* APP FRAME: Max Width, Shadow, etc. */}
      <div className="w-full max-w-3xl h-full flex flex-col relative shadow-[0_0_50px_rgba(0,0,0,0.5)] border-x border-zinc-900 bg-zinc-950">
        
        {/* SCROLL CONTAINER */}
        <div className={`w-full h-full flex flex-col ${isTight ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'}`}>
          
          {/* HEADER */}
          <div className={`shrink-0 ${isTight ? '' : 'sticky top-0 z-40'}`}>
             <Header 
                onToggleLogs={() => setShowLogsOverlay(!showLogsOverlay)}
                showLogsOverlay={showLogsOverlay}
                onOpenGallery={() => setIsGalleryOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                galleryCount={gallery.length}
                isConnectionReady={isConnectionReady}
             />
          </div>

          {/* MAIN CONTENT WRAPPER */}
          <div className={`w-full relative flex flex-col ${isTight ? 'flex-none' : 'flex-1 min-h-0'}`}>
             
             {/* VIEWPORT */}
             {shouldShowViewport && (
               <div className={`w-full relative bg-black flex flex-col items-center justify-center border-b border-zinc-900 ${
                 isTight 
                   ? 'h-[100dvh] shrink-0' 
                   : 'flex-1 min-h-0' 
               }`}>
                  <Viewport 
                    asset={currentAsset} 
                    isLoading={isGenerating} 
                    loadingMessage={loadingMessage}
                    isInteractionMode={step === 'INTERACTION_SIM'}
                    onTargetClick={actions.handleTargetClick}
                    targetCoordinates={config.targetCoordinates}
                    isMarkerVisible={config.showTargetMarker ?? true}
                    onDeleteAsset={handleDeleteAsset}
                    onUnloadAsset={handleUnloadViewport}
                    onReplaceAsset={
                        // Replace is only allowed for images in setup/result steps, not video (Motion)
                        currentAsset?.type === 'image' && !isGenerating
                        ? handleViewportReplace 
                        : undefined
                    }
                  />
               </div>
             )}

             {/* CONTROLS */}
             <div className={`w-full z-10 bg-zinc-950 ${!shouldShowViewport && !isTight ? 'flex-1 min-h-0' : 'shrink-0'}`}>
                <ControlPanel 
                  step={step} 
                  setStep={actions.handleStepChange}
                  config={config}
                  updateConfig={actions.updateConfig}
                  onGenerate={actions.handleGenerate} 
                  onReset={() => actions.setIsEditing(true)}
                  onCancelEdit={() => actions.setIsEditing(false)}
                  onRevertToBase={() => {
                      if (masterSubjectImage) {
                        actions.setCurrentAsset(masterSubjectImage);
                        actions.setInteractionImageAsset(null);
                        actions.setHasInteractionImage(false);
                        addToast("View Reset to Base Body", 'info');
                      }
                  }}
                  onUseAsBase={actions.handleUseUploadedAsBase}
                  onInteractionUpload={actions.handleInteractionUpload}
                  onFaceUpload={actions.handleFaceUpload}
                  onDeviceUpload={actions.handleDeviceUpload}
                  onUnloadAsset={actions.handleUnloadAsset}
                  isGenerating={isGenerating}
                  hasBaseAsset={hasSubject}
                  isEditing={isEditing}
                  fullScreenMode={!shouldShowViewport} 
                  hasInteractionImage={hasInteractionImage}
                  isMotionMode={currentAsset?.type === 'video'}
                  isTight={isTight}
                  onHeightChange={setControlPanelContentHeight}
                  isConnectionReady={isConnectionReady}
                  onConfigureRequest={handleConfigureRequest}
                />
             </div>

          </div>

        </div>

        {/* OVERLAYS */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        
        <LoadingOverlay 
          isVisible={isGenerating}
          message={loadingMessage}
          onCancel={actions.handleStopGeneration}
          onRetry={actions.handleTryMore}
        />

        <LogOverlay 
          isVisible={showLogsOverlay}
          onClose={() => setShowLogsOverlay(false)}
          logs={logs}
          onClear={clearLogs}
        />

        {isGalleryOpen && (
          <Gallery 
            items={gallery}
            onClose={() => setIsGalleryOpen(false)}
            onDelete={handleDeleteAsset}
            onClear={handleClearGallery}
            onLoadAsset={actions.handleLoadAsset}
            onEditSettings={actions.handleEditSettings}
            onDownload={actions.handleDownload}
          />
        )}

        {isSettingsOpen && (
          <Settings
            settings={settings}
            updateSettings={updateSettings}
            onClose={() => setIsSettingsOpen(false)}
            onClearGallery={handleClearGallery}
            isConnectionReady={isConnectionReady}
            onConnectionUpdate={checkConnectionStatus}
            addToast={addToast}
            addLog={addLog}
          />
        )}

      </div>
    </div>
  );
};
