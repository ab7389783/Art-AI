
import React, { useState, useEffect } from 'react';
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
import { useConnection } from './hooks/useConnection';
import { useAppHandlers } from './hooks/useAppHandlers';

export const App: React.FC = () => {
  // --- HOOKS ---
  const { gallery, isGalleryOpen, setIsGalleryOpen, addToGallery, removeFromGallery, clearGallery } = useGallery();
  const { logs, toasts, showLogsOverlay, setShowLogsOverlay, addLog, addToast, removeToast, clearLogs } = useSystem();
  const { settings, updateSettings } = useSettings();
  
  const { state, actions } = useSimulation({ addToGallery, addLog, addToast, gallery, settings });

  const { 
    step, config, masterCharacterAsset, interactionAsset, motionAsset, 
    isGenerating, isEditing, loadingMessage 
  } = state;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Extracted Connection Logic
  const { isConnectionReady, checkConnectionStatus } = useConnection(isGenerating);

  // Extracted App Logic Handlers
  const { 
      handleDeleteAsset, 
      handleClearGallery, 
      handleViewportReplace,
      handleRevertToBase 
  } = useAppHandlers({
      gallery,
      removeFromGallery,
      clearGallery,
      addToast,
      state,
      actions
  });

  const hasSubject = !!masterCharacterAsset;
  
  // Visibility Logic for Viewport vs Setup
  const shouldShowViewport = hasSubject && (step === 'INTERACTION_SIM' || step === 'INTERACTION_RESULT' || !isEditing);

  // --- LAYOUT LOGIC ---
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [controlPanelContentHeight, setControlPanelContentHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const HEADER_HEIGHT = 48; 
  const chromeHeight = controlPanelContentHeight + HEADER_HEIGHT;
  const isTight = chromeHeight > (windowHeight * 0.65);

  const handleConfigureRequest = () => {
     setIsSettingsOpen(true);
     if (!isConnectionReady) {
        addToast("Please connect your Access Key in settings", "info");
     }
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-zinc-950 text-zinc-300 font-sans flex flex-col items-center overflow-hidden">

      <div className="w-full max-w-3xl h-full flex flex-col relative shadow-[0_0_50px_rgba(0,0,0,0.5)] border-x border-zinc-900 bg-zinc-950">
        
        <div className={`w-full h-full flex flex-col ${isTight ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'}`}>
          
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

          <div className={`w-full relative flex flex-col ${isTight ? 'flex-none' : 'flex-1 min-h-0'}`}>
             
             {shouldShowViewport && (
               <div className={`w-full relative bg-black flex flex-col items-center justify-center border-b border-zinc-900 ${
                 isTight 
                   ? 'h-[100dvh] shrink-0' 
                   : 'flex-1 min-h-0' 
               }`}>
                  <Viewport 
                    step={step}
                    character={masterCharacterAsset}
                    interaction={interactionAsset}
                    motion={motionAsset}
                    isLoading={isGenerating} 
                    loadingMessage={loadingMessage}
                    onTargetClick={actions.handleTargetClick}
                    targetCoordinates={config.targetCoordinates}
                    isMarkerVisible={config.showTargetMarker ?? true}
                    onUnloadAsset={actions.handleUnloadAsset}
                    onReplaceAsset={
                        // Replace allowed for images only, when not generating
                        !isGenerating ? handleViewportReplace : undefined
                    }
                  />
               </div>
             )}

             <div className={`w-full z-10 bg-zinc-950 ${!shouldShowViewport && !isTight ? 'flex-1 min-h-0' : 'shrink-0'}`}>
                <ControlPanel 
                  step={step} 
                  setStep={actions.handleStepChange}
                  config={config}
                  updateConfig={actions.updateConfig}
                  onGenerate={actions.handleGenerate} 
                  onReset={() => actions.setIsEditing(true)}
                  onCancelEdit={() => actions.setIsEditing(false)}
                  onRevertToBase={handleRevertToBase}
                  onUseAsBase={actions.handleUseUploadedAsBase}
                  onInteractionUpload={actions.handleInteractionUpload}
                  onFaceUpload={actions.handleFaceUpload}
                  onDeviceUpload={actions.handleDeviceUpload}
                  onUnloadAsset={actions.handleUnloadAsset}
                  isGenerating={isGenerating}
                  hasBaseAsset={hasSubject}
                  isEditing={isEditing}
                  fullScreenMode={!shouldShowViewport} 
                  hasInteractionImage={!!interactionAsset}
                  isMotionMode={!!motionAsset && step === 'INTERACTION_RESULT'}
                  isTight={isTight}
                  onHeightChange={setControlPanelContentHeight}
                  isConnectionReady={isConnectionReady}
                  onConfigureRequest={handleConfigureRequest}
                />
             </div>

          </div>

        </div>

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
