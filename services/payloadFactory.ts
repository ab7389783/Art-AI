
import { constructSafeExecutionPrompt } from "./promptFactory";
import { addSafetyWatermark } from "./imageProcessing";

// Prepares the API payload once to avoid redundant image processing during retries.
export const prepareImagePayload = async (
  prompt: string, 
  baseImage: string | undefined,
  mainImageLabel: string, 
  secondImage: string | undefined,
  onStatusUpdate: ((status: string) => void) | undefined,
  statusPrefix: string,
  totalRetries: number
) => {
  if (onStatusUpdate) {
      onStatusUpdate(`Preprocessing...`);
  }

  // 1. Minimum Message Display Timer (800ms)
  const hasBaseImage = !!baseImage;
  const minDisplayTime = hasBaseImage 
      ? new Promise(resolve => setTimeout(resolve, 800))
      : Promise.resolve();

  // Stats tracking for UX
  let totalInputBytes = 0;
  let totalOutputBytes = 0;
  
  const updateStats = () => {
      if (onStatusUpdate) {
          const inKB = Math.round(totalInputBytes / 1024);
          const outKB = Math.round(totalOutputBytes / 1024);
          onStatusUpdate(`Preprocessing... (${inKB}KB → ${outKB}KB)`);
      }
  };

  // 2. Actual Processing Work
  const processingWork = async () => {
    const safePrompt = constructSafeExecutionPrompt(prompt);
    const parts: any[] = [];
    
    // Order: [Image], [Device Image], [Text Prompt]
    if (baseImage) {
      // STRICT LIMIT: 512KB (0.5MB)
      const watermarkedBase = await addSafetyWatermark(baseImage, 512 * 1024, true, (orig, fin) => {
          totalInputBytes += orig;
          totalOutputBytes += fin;
          updateStats();
      });
      
      const mimeType = 'image/jpeg';
      let base64Data = "";

      const partsArr = watermarkedBase.split(',');
      if (partsArr.length > 1) {
          base64Data = partsArr.slice(1).join('');
      } else {
          base64Data = watermarkedBase;
      }

      base64Data = base64Data.replace(/\s/g, '');

      if (!base64Data) {
          throw new Error("Failed to process base image: Invalid Data URL format");
      }
      
      parts.push({ inlineData: { mimeType, data: base64Data } });
      
      if (secondImage) {
        // STRICT LIMIT: 256KB (0.25MB)
        const processedDevice = await addSafetyWatermark(secondImage, 256 * 1024, false, (orig, fin) => {
            totalInputBytes += orig;
            totalOutputBytes += fin;
            updateStats();
        });
        
        const deviceMimeType = 'image/jpeg';
        let deviceBase64Data = "";

        const devicePartsArr = processedDevice.split(',');
        if (devicePartsArr.length > 1) {
            deviceBase64Data = devicePartsArr.slice(1).join('');
        } else {
            deviceBase64Data = processedDevice;
        }
        
        deviceBase64Data = deviceBase64Data.replace(/\s/g, '');
        
        parts.push({ inlineData: { mimeType: deviceMimeType, data: deviceBase64Data } });
      }
    }

    // Removed any "Reference: ..." prefixes. Just the pure prompt now.
    const finalPrompt = safePrompt.trim();
    parts.push({ text: finalPrompt });
    
    return parts;
  };

  const [_, parts] = await Promise.all([minDisplayTime, processingWork()]);
  return parts;
};

export const prepareVideoPayload = async (
    inputImage: string,
    onStatusUpdate: ((status: string) => void) | undefined,
    statusPrefix: string,
    totalRetries: number
) => {
    if (onStatusUpdate) {
        onStatusUpdate(`Preprocessing...`);
    }
    
    const minDisplayTime = new Promise(resolve => setTimeout(resolve, 600));

    let inputSize = 0;
    let outputSize = 0;

    const processingWork = async () => {
        const markedStartImage = await addSafetyWatermark(inputImage, 512 * 1024, false, (orig, fin) => {
            inputSize = orig;
            outputSize = fin;
            if (onStatusUpdate) {
                const inKB = Math.round(inputSize / 1024);
                const outKB = Math.round(outputSize / 1024);
                onStatusUpdate(`Preprocessing... (${inKB}KB → ${outKB}KB)`);
            }
        });
        
        const mimeType = 'image/jpeg';
        let base64Data = "";

        const partsArr = markedStartImage.split(',');
        if (partsArr.length > 1) {
            base64Data = partsArr.slice(1).join('');
        } else {
            base64Data = markedStartImage;
        }

        base64Data = base64Data.replace(/\s/g, '');
        
        return { mimeType, base64Data };
    };

    const [_, result] = await Promise.all([minDisplayTime, processingWork()]);
    return result;
};
