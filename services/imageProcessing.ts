
// --- SHARED KERNEL ---

/**
 * Helper to estimate byte size of base64 string (decoded).
 */
const getByteSize = (dataUrl: string) => {
  const commaIndex = dataUrl.indexOf(',');
  const base64 = commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
  const cleanBase64 = base64.replace(/\s/g, '');
  const padding = (cleanBase64.match(/=+$/) || [''])[0].length;
  // Standard base64 decoding size
  return Math.floor((cleanBase64.length * 3) / 4) - padding;
};

/**
 * Core function that handles downscaling and compression.
 * OPTIMIZED: Uses JPEG for efficient compression (sanitizing input by re-encoding).
 * Resizes dimensions to strictly fit byte limits.
 */
const optimizeImage = (
  img: HTMLImageElement,
  maxSizeBytes: number,
  options: { addWatermark: boolean; startQuality?: number }
): string => {
  const { addWatermark, startQuality = 1.0 } = options;
  
  // Use JPEG for better compression/size ratio than PNG. 
  // Canvas re-encoding fixes "malformed" headers from original files.
  const MIME_TYPE = 'image/jpeg';
  
  let width = img.width;
  let height = img.height;
  
  // Heuristic: JPEG is lighter. 
  // 1MB ~ 800KB payload. JPEG is ~0.5-1 byte/pixel depending on content.
  // We can afford more pixels than PNG.
  const targetPixels = Math.floor(maxSizeBytes / 0.5); 
  const currentPixels = width * height;

  if (currentPixels > targetPixels) {
    const scale = Math.sqrt(targetPixels / currentPixels);
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
  }

  // Canvas Setup
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return "";

  // Drawing Helper
  const draw = (w: number, h: number) => {
    canvas.width = w;
    canvas.height = h;
    
    // Fill background for JPEG transparency handling (prevents artifacts)
    // Using black to match app theme/dark mode if transparency exists
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    if (addWatermark) {
        const fontSize = Math.max(20, Math.floor(w * 0.03));
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        
        const p = Math.floor(w * 0.02); // padding

        // Stroke
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = Math.max(2, fontSize * 0.1);
        ctx.strokeText("My Selfie", p, p);

        // Fill
        ctx.fillStyle = "rgba(255,0,0,0.9)";
        ctx.fillText("My Selfie", p, p);
    }
  };

  // 1. Initial Processing
  draw(width, height);
  let resultUrl = canvas.toDataURL(MIME_TYPE, startQuality);

  // 2. Size Check & Retry Loop
  const maxChars = Math.floor((maxSizeBytes * 4) / 3);
  let retries = 3; // Safety break

  while (resultUrl.length > maxChars && retries > 0) {
      // Calculate overshoot ratio
      const ratio = resultUrl.length / maxChars;
      // Scale down
      const scale = 1 / Math.sqrt(ratio * 1.15);
      
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
      
      // Stop if too small
      if (width < 32 || height < 32) break;

      draw(width, height);
      resultUrl = canvas.toDataURL(MIME_TYPE, startQuality);
      retries--;
  }

  return resultUrl;
};

// --- PUBLIC EXPORTS ---

export const compressToMaxBytes = (
  img: HTMLImageElement, 
  maxSizeBytes: number,
  startQuality: number = 1.0
): string => {
  return optimizeImage(img, maxSizeBytes, { addWatermark: false, startQuality });
};

export const addSafetyWatermark = (
  base64DataUrl: string, 
  maxSizeBytes: number = 1024 * 1024, 
  addText: boolean = true,
  onStats?: (originalBytes: number, finalBytes: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If it's a blob URL, getByteSize is meaningless but we can still load it.
    const originalBytes = base64DataUrl.startsWith('data:') ? getByteSize(base64DataUrl) : 0;

    const img = new Image();
    
    // Security: Only set crossOrigin if strictly needed (HTTPS URLs), not Data/Blob
    if (!base64DataUrl.startsWith('data:') && !base64DataUrl.startsWith('blob:')) {
        img.crossOrigin = "anonymous";
    }
    
    img.onload = () => {
      try {
          const result = optimizeImage(img, maxSizeBytes, { addWatermark: addText });
          if (!result || result === "data:,") {
             reject(new Error("Image optimization produced empty result"));
             return;
          }
          if (onStats) {
              onStats(originalBytes, getByteSize(result));
          }
          resolve(result);
      } catch (e) {
          reject(e);
      }
    };
    
    img.onerror = () => {
      // CRITICAL FIX: Do NOT return the original if it fails to load,
      // especially if it's a blob URL that the API cannot handle.
      reject(new Error("Failed to process image for API payload. Image source may be invalid or tainted."));
    };
    
    img.src = base64DataUrl;
  });
};

export const determineAspectRatio = (dataUrl: string): Promise<'9:16' | '16:9'> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.width > img.height ? '16:9' : '9:16');
    };
    img.onerror = () => {
      resolve('9:16'); 
    };
    img.src = dataUrl;
  });
};

export const createMarkedImage = async (imageUrl: string, x: number, y: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // Security: Only set crossOrigin if strictly needed
      if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('blob:')) {
          img.crossOrigin = "anonymous";
      }

      img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error("No Canvas Context")); return; }
            
            ctx.drawImage(img, 0, 0);
            
            const px = (x / 100) * canvas.width;
            const py = (y / 100) * canvas.height;
            
            const gradient = ctx.createRadialGradient(px, py, 5, px, py, 40);
            gradient.addColorStop(0, "rgba(255, 0, 0, 0.8)");
            gradient.addColorStop(1, "rgba(255, 0, 0, 0)");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(px, py, 40, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = "#FF0000";
            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(px, py, 15, 0, Math.PI * 2);
            ctx.stroke();
            
            // Return JPEG to keep size low
            resolve(canvas.toDataURL('image/jpeg', 1.0));
        } catch (err) {
            reject(err);
        }
      };
      img.onerror = () => reject(new Error("Failed to load base image for marking"));
      img.src = imageUrl;
    });
};
