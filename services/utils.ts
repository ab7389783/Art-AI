import { GeneratedAsset } from "../types";

// Utility to read image files as Base64 Data URLs without compression.
// Optimization/Compression happens only before sending to API (payloadFactory) or if needed for specific UI compositing.
export const resizeImage = (file: File, maxWidth = 1920): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
       // Return original Data URL (No canvas processing/compression)
       // Persistence is handled by IndexedDB, so size is less of a concern for storage.
       resolve(event.target?.result as string);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const downloadAsset = async (
    asset: GeneratedAsset | null, 
    onLoading: (msg: string) => void
): Promise<void> => {
    if (!asset?.url) return;
    try {
        if (asset.type === 'video') {
            onLoading("Downloading Video...");
            const response = await fetch(asset.url);
            if (!response.ok) throw new Error("Network response was not ok");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            // Use title if available, otherwise fallback to ID. Title format matches Art_AI_YYYYMMDD_HHMMSS
            link.download = asset.title || `Art_AI_Video_${Date.now()}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            onLoading("");
        } else {
            const link = document.createElement('a');
            link.href = asset.url;
            // Use title if available, otherwise fallback to ID
            link.download = asset.title || `Art_AI_Image_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (e: any) {
        onLoading("");
        throw e;
    }
};

/**
 * Converts a Base64 string (Data URL) to a Blob.
 */
export const base64ToBlob = (base64: string): Blob => {
  const arr = base64.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/**
 * Converts a Blob or Blob URL to a Base64 string (Data URL).
 * Includes robust error handling for stale or revoked blob URLs.
 */
export const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
  try {
    const response = await fetch(blobUrl);
    if (!response.ok) {
        throw new Error(`Failed to load blob data: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          if (typeof reader.result === 'string') {
              resolve(reader.result);
          } else {
              reject(new Error("Failed to convert blob to base64"));
          }
      };
      reader.onerror = () => reject(new Error("FileReader failed to read blob"));
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    console.error("blobUrlToBase64 Error:", error);
    throw new Error("Unable to access image data. The asset may have been unloaded. Please try re-selecting or re-uploading the image.");
  }
};

export const getTimestampName = (prefix: string, ext: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${prefix}_${year}${month}${day}_${hour}${minute}${second}.${ext}`;
};