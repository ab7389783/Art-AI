
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedAsset } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { SelectionGroup, SelectionOption } from './SelectionGroup';
import { OverlayActions } from './OverlayActions';

interface GalleryProps {
  items: GeneratedAsset[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onLoadAsset: (asset: GeneratedAsset, role: 'main' | 'device' | 'face') => void;
  onEditSettings: (asset: GeneratedAsset) => void;
  onDownload: (asset: GeneratedAsset) => void;
}

// Sub-component for handling Video rendering and playback logic within the gallery
const GalleryVideo: React.FC<{ 
  item: GeneratedAsset; 
  isSelected: boolean; 
  onClick: () => void;
  onDelete: () => void;
  onDownload: () => void;
}> = ({ item, isSelected, onClick, onDelete, onDownload }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const loadVideo = async () => {
      if (!item.url) return;
      setIsLoading(true);
      try {
        const response = await fetch(item.url);
        const blob = await response.blob();
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setVideoSrc(objectUrl);
        }
      } catch (e) {
        if (active) setVideoSrc(item.url);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadVideo();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, item.url]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play().catch(() => {});
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
       {isLoading && (
         <div className="absolute inset-0 flex items-center justify-center z-0 text-zinc-600">
             <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
         </div>
       )}

       {videoSrc && (
           <video 
             ref={videoRef}
             src={videoSrc}
             className={`w-full h-full object-contain transition-all duration-300 ${isSelected && !isPlaying ? 'opacity-40' : 'opacity-100'}`}
             loop
             playsInline
             onPlay={() => setIsPlaying(true)}
             onPause={() => setIsPlaying(false)}
           />
       )}
       
       {/* Overlay Actions for Video (Backdrop only, Delete moved) */}
       <OverlayActions
          visible={isSelected}
          onClose={onClick}
          isVideo={true}
       />
       
       {/* Play Button (Custom) - Centered when selected */}
       <div 
         className={`absolute inset-0 flex items-center justify-center z-30 transition-opacity duration-200 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
         onClick={onClick}
       >
         <button 
           onClick={togglePlay}
           disabled={isLoading || !videoSrc}
           className="w-12 h-12 rounded-full bg-green-900/80 border border-green-500 hover:bg-green-600 hover:border-green-400 text-green-100 hover:text-white flex items-center justify-center transition-all shadow-xl hover:scale-110 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed" 
         >
           {isPlaying ? (
             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
           ) : (
             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
           )}
         </button>
       </div>
       
       {/* Top Right Actions: Download & Delete */}
       <div className={`absolute top-2 right-2 flex flex-row gap-2 transition-opacity duration-200 z-30 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <button 
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className="w-8 h-8 rounded-full bg-blue-900/80 border border-blue-700 hover:bg-blue-600 hover:border-blue-500 text-blue-200 hover:text-white flex items-center justify-center transition-all shadow-lg backdrop-blur-sm"
              title="Download"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>

          <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-8 h-8 rounded-full bg-red-900/80 border border-red-700 hover:bg-red-600 hover:border-red-500 text-red-200 hover:text-white flex items-center justify-center transition-all shadow-lg backdrop-blur-sm"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
       </div>
    </div>
  );
};

export const Gallery: React.FC<GalleryProps> = ({ 
  items, 
  onClose, 
  onDelete, 
  onClear,
  onLoadAsset,
  onDownload
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const [confirmAction, setConfirmAction] = useState<{ type: 'DELETE' | 'CLEAR', id?: string } | null>(null);
  
  // New state for Import Modal
  const [importModal, setImportModal] = useState<{
    isOpen: boolean;
    asset: GeneratedAsset | null;
    selectedRole: 'main' | 'device' | 'face';
  }>({
    isOpen: false,
    asset: null,
    selectedRole: 'main'
  });

  const handleClearClick = () => {
    setConfirmAction({ type: 'CLEAR' });
  };

  const handleDeleteClick = (id: string) => {
    setConfirmAction({ type: 'DELETE', id });
  };

  const handleImportClick = (asset: GeneratedAsset) => {
    setImportModal({
        isOpen: true,
        asset: asset,
        selectedRole: 'main' // default
    });
  };

  const executeConfirm = () => {
    if (confirmAction?.type === 'CLEAR') {
      onClear();
    } else if (confirmAction?.type === 'DELETE' && confirmAction.id) {
      onDelete(confirmAction.id);
      if (selectedItemId === confirmAction.id) {
        setSelectedItemId(null);
      }
    }
    setConfirmAction(null);
  };

  const executeImport = () => {
    if (importModal.asset) {
        onLoadAsset(importModal.asset, importModal.selectedRole);
        onClose(); // Close gallery after import
    }
    setImportModal({ ...importModal, isOpen: false });
  };

  // Options for the import modal
  const importOptions: SelectionOption[] = [
      { id: 'main', label: 'Character & Interaction' },
      { id: 'device', label: 'Device Reference' },
      { id: 'face', label: 'Face Reference' }
  ];

  return (
    <>
      <ConfirmationModal 
        isOpen={!!confirmAction}
        title={confirmAction?.type === 'CLEAR' ? "Clear Gallery" : "Delete Asset"}
        message={confirmAction?.type === 'CLEAR' 
          ? "Are you sure you want to delete all generated assets? This action cannot be undone." 
          : "Are you sure you want to delete this asset? This action cannot be undone."
        }
        confirmLabel="Delete"
        isDanger={true}
        onConfirm={executeConfirm}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmationModal
        isOpen={importModal.isOpen}
        title="Import Asset"
        confirmLabel="Load Asset"
        onConfirm={executeImport}
        onCancel={() => setImportModal({ ...importModal, isOpen: false })}
        variant="success"
      >
         <div className="flex flex-col gap-2">
            <SelectionGroup 
                options={importOptions}
                selectedValue={importModal.selectedRole}
                onChange={(val) => setImportModal(prev => ({ ...prev, selectedRole: val as any }))}
                colorTheme="orange"
            />
         </div>
      </ConfirmationModal>

      <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
        <div className="w-full h-full max-w-3xl mx-auto flex flex-col bg-zinc-950/50">
          <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-bold tracking-widest text-white">Gallery</h2>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700 whitespace-nowrap min-w-fit">
                {items.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                 <button 
                   onClick={handleClearClick}
                   className="text-[10px] text-red-500 hover:text-red-400 px-3 py-1 bg-red-950/20 border border-red-900/50 rounded font-bold mr-2 transition-colors hover:bg-red-900/40"
                 >
                   Clear
                 </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6" onClick={() => setSelectedItemId(null)}>
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4 opacity-50">
                 <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 <p className="text-sm font-bold tracking-widest">Gallery Empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4">
                {items.map(item => {
                  const isSelected = selectedItemId === item.id;
                  // Badge logic: use metadata.variant if available (uppercased), else type
                  const label = item.metadata?.variant ? item.metadata.variant.toUpperCase() : item.type.toUpperCase();

                  return (
                    <div 
                      key={item.id} 
                      onClick={(e) => { e.stopPropagation(); setSelectedItemId(item.id); }}
                      className={`group relative bg-zinc-900 border border-zinc-800 aspect-[9/16] rounded-sm overflow-hidden flex flex-col shadow-lg transition-transform hover:scale-[1.02] cursor-pointer ${isSelected ? 'ring-1 ring-orange-500' : ''}`}
                    >
                      {item.type === 'video' ? (
                        <GalleryVideo 
                          item={item} 
                          isSelected={isSelected} 
                          onClick={() => setSelectedItemId(isSelected ? null : item.id)} 
                          onDelete={() => handleDeleteClick(item.id)}
                          onDownload={() => onDownload(item)}
                        />
                      ) : (
                        <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
                          <img 
                            src={item.url} 
                            alt="Gallery Item" 
                            className={`w-full h-full object-contain transition-all duration-300 ${isSelected ? 'opacity-40' : 'opacity-80'}`} 
                          />
                          
                          {/* Replaced manual Overlay with OverlayActions. Delete moved to corner. */}
                          <OverlayActions 
                             visible={isSelected}
                             onClose={() => setSelectedItemId(null)}
                             onImport={() => handleImportClick(item)}
                          />

                          {/* Top Right Actions: Download & Delete */}
                          <div 
                              className={`absolute top-2 right-2 flex flex-row gap-2 transition-opacity duration-200 z-30 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                          >
                               <button 
                                  onClick={(e) => { e.stopPropagation(); onDownload(item); }}
                                  className="w-8 h-8 rounded-full bg-blue-900/80 border border-blue-700 hover:bg-blue-600 hover:border-blue-500 text-blue-200 hover:text-white flex items-center justify-center transition-all shadow-lg backdrop-blur-sm"
                                  title="Download"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </button>

                               <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id); }}
                                  className="w-8 h-8 rounded-full bg-red-900/80 border border-red-700 hover:bg-red-600 hover:border-red-500 text-red-200 hover:text-white flex items-center justify-center transition-all shadow-lg backdrop-blur-sm"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Badge for Type */}
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-bold text-zinc-400 tracking-tighter z-10 pointer-events-none">
                        {label}
                      </div>

                      {/* Info Footer */}
                      <div className="p-2 bg-zinc-950 border-t border-zinc-800 z-20 relative">
                        <div className="text-[8px] text-zinc-600 font-mono truncate" title={item.title}>
                            {item.title || "NO DATA"}
                        </div>
                        <div className="text-[7px] text-zinc-500 mt-1">
                            {new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
