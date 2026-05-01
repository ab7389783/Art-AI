
import { useState, useEffect, useCallback } from 'react';
import { GeneratedAsset } from '../types';
import { AssetStore } from '../services/assetStore';
import { StorageService } from '../services/storageService';

export const useGallery = () => {
  const [gallery, setGallery] = useState<GeneratedAsset[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    const loadGallery = async () => {
      const savedMeta = StorageService.getGalleryMeta();
      const hydratedGallery: GeneratedAsset[] = [];

      for (const meta of savedMeta) {
          try {
              // Priority 1: Use Title directly (New Standard)
              let dbKey = meta.title || meta.id;
              let blob = await AssetStore.getAsset(dbKey);
              
              // Priority 2: Fallback to Legacy 'gallery_' prefix if not found
              if (!blob && meta.title) {
                 blob = await AssetStore.getAsset(`gallery_${meta.title}`);
              }
              
              // Priority 3: Fallback to ID if needed
              if (!blob) {
                 blob = await AssetStore.getAsset(meta.id);
              }

              if (blob) {
                  const objectUrl = URL.createObjectURL(blob);
                  hydratedGallery.push({ ...meta, url: objectUrl });
              }
          } catch (e) {
              console.warn("Skipping broken asset", meta.id);
          }
      }
      setGallery(hydratedGallery);
      setIsInitialized(true);
    };
    loadGallery();
  }, []);

  // 2. Persist Metadata
  useEffect(() => {
    if (!isInitialized) return;
    const metadata = gallery.map(item => ({
        ...item,
        url: '' // Strip URL
    }));
    StorageService.saveGalleryMeta(metadata);
  }, [gallery, isInitialized]);

  // Helper to ensure unique titles
  // Logic: name.ext -> name (1).ext -> name (2).ext
  // Supports handling existing numbered files: name (1).ext -> name (2).ext
  const resolveUniqueTitle = useCallback((baseTitle: string, currentList: GeneratedAsset[]) => {
    // Regex breakdown:
    // ^(.*?)       -> Group 1: Base Name (non-greedy)
    // (\s\((\d+)\))? -> Group 2: Optional " (N)", Group 3: The Number N
    // (\.[^.]*)?$  -> Group 4: Optional Extension
    const regex = /^(.*?)(\s\((\d+)\))?(\.[^.]*)?$/;
    const match = baseTitle.match(regex);
    
    let name = baseTitle;
    let ext = "";
    let number = 0;

    if (match) {
        name = match[1]; // The name part without " (N)" and extension
        if (match[3]) {
            number = parseInt(match[3], 10);
        }
        ext = match[4] || "";
    }

    let finalTitle = baseTitle;
    let conflict = currentList.some(item => item.title === finalTitle);
    
    if (!conflict) return finalTitle;

    // If conflict exists, start incrementing
    // If input was "file (1).png", start checking from 2
    let nextNum = number > 0 ? number + 1 : 1;
    
    while (true) {
        finalTitle = `${name} (${nextNum})${ext}`;
        // eslint-disable-next-line no-loop-func
        const exists = currentList.some(item => item.title === finalTitle);
        if (!exists) break;
        nextNum++;
    }

    return finalTitle;
  }, []);

  // 3. Add Asset
  const addToGallery = useCallback(async (asset: GeneratedAsset): Promise<GeneratedAsset> => {
    // 1. Resolve Unique Title
    const requestedTitle = asset.title || `Asset_${Date.now()}.png`;
    const uniqueTitle = resolveUniqueTitle(requestedTitle, gallery);
    
    // 2. Create Final Asset Object
    const finalAsset = { ...asset, title: uniqueTitle };

    // 3. Get Blob for Storage
    let blob: Blob;
    // Updated check to allow http/https for remote assets (e.g. Veo videos)
    if (finalAsset.url && (
        finalAsset.url.startsWith('data:') || 
        finalAsset.url.startsWith('blob:') || 
        finalAsset.url.startsWith('http:') || 
        finalAsset.url.startsWith('https:')
    )) {
        const res = await fetch(finalAsset.url);
        if (!res.ok) {
            throw new Error(`Failed to download asset: ${res.statusText}`);
        }
        blob = await res.blob();
    } else {
        throw new Error("Invalid asset URL for saving");
    }

    // 4. Save to IDB using Title Key (No 'gallery_' prefix)
    const dbKey = uniqueTitle;
    await AssetStore.saveAsset(dbKey, blob);
    
    // 5. Create new Object URL for state
    const newUrl = URL.createObjectURL(blob);
    const assetWithUrl = { ...finalAsset, url: newUrl };
    
    setGallery(prev => [assetWithUrl, ...prev]);
    return assetWithUrl;
  }, [gallery, resolveUniqueTitle]);

  const removeFromGallery = useCallback(async (id: string) => {
    const itemToRemove = gallery.find(g => g.id === id);
    if (itemToRemove) {
        if (itemToRemove.url) URL.revokeObjectURL(itemToRemove.url);
        
        // Try deleting by Title Key (New Standard)
        if (itemToRemove.title) {
            await AssetStore.deleteAsset(itemToRemove.title);
            // Cleanup Legacy Key if exists
            await AssetStore.deleteAsset(`gallery_${itemToRemove.title}`);
        }
        await AssetStore.deleteAsset(id); // Cleanup legacy ID key
    }
    setGallery(prev => prev.filter(item => item.id !== id));
  }, [gallery]);

  const clearGallery = useCallback(async () => {
    gallery.forEach(item => { if (item.url) URL.revokeObjectURL(item.url); });
    
    for (const item of gallery) {
         if (item.title) {
            // Delete both new and legacy keys
            await AssetStore.deleteAsset(item.title);
            await AssetStore.deleteAsset(`gallery_${item.title}`);
         }
         await AssetStore.deleteAsset(item.id);
    }
    
    setGallery([]);
  }, [gallery]);

  return {
    gallery,
    isGalleryOpen,
    setIsGalleryOpen,
    addToGallery,
    removeFromGallery,
    clearGallery
  };
};
