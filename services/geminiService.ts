import { GeneratedAsset } from "../types";
import { executeImageGeneration, executeVideoGeneration } from "./generators";
import { getTimestampName } from "./utils";

// --- PUBLIC API ---

export const generateCharacterRender = async (
  characterPrompt: string,
  baseImage: string | undefined,
  onStatusUpdate: ((status: string) => void) | undefined,
  getMaxRetries: (() => number) | undefined,
  signal: AbortSignal | undefined,
  onBackgroundSuccess: ((url: string) => void) | undefined,
  onError: ((error: any, attempt: number) => void) | undefined,
  modelName: string // New param
): Promise<GeneratedAsset> => {
  const finalImageUrl = await executeImageGeneration(
      characterPrompt, baseImage, "face", undefined, onStatusUpdate, getMaxRetries, signal, onBackgroundSuccess, onError,
      "Generating Character...",
      modelName // Pass to generator
  );
  return {
    id: crypto.randomUUID(),
    type: 'image',
    url: finalImageUrl,
    title: getTimestampName("Art_AI", "png"), 
    timestamp: Date.now(),
    metadata: { prompt: characterPrompt, model: modelName }
  };
};

export const generateInteractionResult = async (
  baseImage: string, 
  interactionPrompt: string,
  deviceImage: string | undefined,
  onStatusUpdate: ((status: string) => void) | undefined,
  getMaxRetries: (() => number) | undefined,
  signal: AbortSignal | undefined,
  onBackgroundSuccess: ((url: string) => void) | undefined,
  onError: ((error: any, attempt: number) => void) | undefined,
  modelName: string // New param
): Promise<string> => {
  return await executeImageGeneration(
      interactionPrompt, baseImage, "character", deviceImage, onStatusUpdate, getMaxRetries, signal, onBackgroundSuccess, onError,
      "Generating Interaction...",
      modelName // Pass to generator
  );
};

export const generateMotionSimulation = async (
  prompt: string, 
  startImage: string,
  onStatusUpdate: ((status: string) => void) | undefined,
  getMaxRetries: () => number = () => 1, 
  signal: AbortSignal | undefined,
  onBackgroundSuccess: ((url: string) => void) | undefined,
  onError: ((error: any, attempt: number) => void) | undefined,
  modelName: string // New param
): Promise<GeneratedAsset> => {
  const finalVideoUrl = await executeVideoGeneration(
    prompt, startImage, onStatusUpdate, getMaxRetries, signal, onBackgroundSuccess, onError, "Generating Motion...",
    modelName // Pass to generator
  );

  return {
      id: crypto.randomUUID(),
      type: 'video',
      url: finalVideoUrl,
      title: getTimestampName("Art_AI", "mp4"),
      timestamp: Date.now(),
      metadata: { prompt: prompt, model: modelName }
  };
};