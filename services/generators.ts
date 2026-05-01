
import { getClient, OFF_SAFETY_SETTINGS, DEFAULT_IMAGE_MODEL, DEFAULT_VIDEO_MODEL } from "./apiClient";
import { executeWithPooling } from "./pooling";
import { extractErrorMessage, formatSafetyRatings } from "./errorHandler";
import { prepareImagePayload, prepareVideoPayload } from "./payloadFactory";
import { AuthService } from "./apiKeyService";

export const executeImageGeneration = async (
  prompt: string, 
  baseImage: string | undefined, 
  mainImageLabel: string, 
  secondImage: string | undefined,
  onStatusUpdate?: (status: string) => void,
  getMaxRetries: () => number = () => 1, 
  signal?: AbortSignal,
  onBackgroundSuccess?: (url: string) => void,
  onError?: (error: any, attempt: number) => void,
  statusPrefix: string = "Generating Image...",
  model: string = DEFAULT_IMAGE_MODEL // Accept model param
): Promise<string> => {
  const maxRetries = getMaxRetries();
  
  // 1. Prepare Payload (CACHED)
  const parts = await prepareImagePayload(prompt, baseImage, mainImageLabel, secondImage, onStatusUpdate, statusPrefix, maxRetries);

  // 2. Define Execution Unit
  const performSingleCall = async (): Promise<string> => {
    // STRICT KEY CHECK: Ensure we have a key before starting
    if (!AuthService.hasKey()) throw new Error("Access Key not found. Please check your settings.");

    // Client handles key resolution internally via AuthService
    const ai = getClient();
    
    // Map internal model ID (which might include quality suffix) to actual API model + config
    let apiModel = model;
    const imageConfig: any = { aspectRatio: '9:16' };

    if (model === 'gemini-3.1-flash-image-preview-4k') {
        imageConfig.imageSize = '4K';
    } else if (model === 'gemini-3.1-flash-image-preview-2k') {
        imageConfig.imageSize = '2K';
    }

    // Generate a random seed to ensure variety even at low temperature
    const randomSeed = Math.floor(Math.random() * 2147483647);

    let response;
    try {
        response = await ai.models.generateContent({
          model: apiModel, 
          contents: [{ parts: parts }],
          config: {
            imageConfig: imageConfig,
            safetySettings: OFF_SAFETY_SETTINGS,
            temperature: 0.4,
            seed: randomSeed,
            tools: [],
          },
        } as any);

    } catch (e: any) {
        throw new Error(extractErrorMessage(e));
    }

    if (response.promptFeedback) {
        if (response.promptFeedback.blockReason) {
             const reason = response.promptFeedback.blockReason;
             const ratings = formatSafetyRatings(response.promptFeedback.safetyRatings);
             let errorMsg = `Blocked: ${reason}`;
             if (ratings) {
                errorMsg += `\nSafety Ratings: ${ratings}`;
             }
             const err = new Error(errorMsg);
             (err as any).promptFeedback = response.promptFeedback;
             throw err;
        }
    }

    const candidate = response.candidates?.[0];
    
    if (candidate) {
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            let errorDetails = `Finish Reason: ${candidate.finishReason}`;
            if (candidate.finishMessage) {
                errorDetails += `\nMessage: ${candidate.finishMessage}`;
            }
            const ratings = formatSafetyRatings(candidate.safetyRatings);
            if (ratings) {
                errorDetails += `\nSafety Ratings: ${ratings}`;
            }
            const err = new Error(errorDetails);
            (err as any).candidate = candidate;
            throw err;
        }
    }

    if (candidate?.content?.parts) {
      const imagePart = candidate.content.parts.find((p: any) => p.inlineData);
      if (imagePart?.inlineData) {
        return `data:image/png;base64,${imagePart.inlineData.data}`;
      }
    }

    if (candidate) {
        const textPart = candidate.content?.parts?.find((p: any) => p.text);
        if (textPart?.text) throw new Error(`Model returned text instead of image: "${textPart.text}"`);
    }
    
    throw new Error("No image data found in response");
  };

  // 3. Execute with Pooling/Retry Logic
  return executeWithPooling<string>(
    performSingleCall,
    getMaxRetries,
    onStatusUpdate,
    onBackgroundSuccess,
    signal,
    onError,
    statusPrefix
  );
};

export const executeVideoGeneration = async (
  prompt: string,
  inputImage: string,
  onStatusUpdate?: (status: string) => void,
  getMaxRetries: () => number = () => 1,
  signal?: AbortSignal,
  onBackgroundSuccess?: (url: string) => void,
  onError?: (error: any, attempt: number) => void,
  statusPrefix: string = "Generating Video...",
  model: string = DEFAULT_VIDEO_MODEL // Accept model param
): Promise<string> => {
  const maxRetries = getMaxRetries();
  
  // 1. Prepare Payload (CACHED)
  const { base64Data, mimeType } = await prepareVideoPayload(inputImage, onStatusUpdate, statusPrefix, maxRetries);
  const aspectRatio = '9:16'; 

  // 2. Define Execution Unit
  const performSingleCall = async (): Promise<string> => {
      // STRICT KEY RESOLUTION: We need the actual string for the download link later.
      const authKey = AuthService.getEffectiveKey();
      if (!authKey) throw new Error("Access Key not found. Please check your settings.");

      // Client handles key resolution internally via AuthService
      const ai = getClient();
      let operation;
      
      const videoConfig: any = { 
        numberOfVideos: 1, 
        aspectRatio: aspectRatio,
        safetySettings: OFF_SAFETY_SETTINGS,
      };

      // Veo 2.0 does not support the resolution parameter
      if (model !== 'veo-2.0-generate-001') {
        videoConfig.resolution = '1080p';
      }

      try {
          operation = await ai.models.generateVideos({
            model: model, 
            prompt: prompt,
            image: { imageBytes: base64Data, mimeType: mimeType }, 
            config: videoConfig,
          } as any);

      } catch (e: any) {
          throw new Error(extractErrorMessage(e));
      }

      while (!operation.done) {
        if (signal?.aborted) throw new Error("Operation Cancelled");
        
        await new Promise(resolve => setTimeout(resolve, 5000)); 
        
        try {
            operation = await ai.operations.getVideosOperation({ operation: operation });
        } catch (pollErr: any) {
            // Squelched console warning
            const errMsg = extractErrorMessage(pollErr);
            if (errMsg.includes("NOT_FOUND") || errMsg.includes("PERMISSION_DENIED")) {
                throw new Error(errMsg);
            }
        }
      }

      if (operation.error) {
          throw new Error(extractErrorMessage(operation.error));
      }

      const generatedVideos = operation.response?.generatedVideos;
      if (!generatedVideos || generatedVideos.length === 0) {
          throw new Error("No generated content returned by API.");
      }

      const downloadLink = generatedVideos[0].video?.uri;
      if (!downloadLink) {
          throw new Error("Video URI missing in response");
      }

      // STRICT BYOK: Append the EXPLICIT manual key used for generation to the download link
      return `${downloadLink}&key=${encodeURIComponent(authKey)}`;
  };

  // 3. Execute with Pooling/Retry Logic
  return executeWithPooling<string>(
    performSingleCall,
    getMaxRetries,
    onStatusUpdate,
    onBackgroundSuccess,
    signal,
    onError,
    statusPrefix
  );
};
