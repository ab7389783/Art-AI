
import { GoogleGenAI } from "@google/genai";
import { AuthService } from "./apiKeyService";

// Centralized Constants
// Defaults (can be overridden by user settings)
export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
export const DEFAULT_VIDEO_MODEL = 'veo-2.0-generate-001';

export const AVAILABLE_IMAGE_MODELS = [
  { id: 'gemini-3.1-flash-image-preview-4k', label: 'Nano Banana 2 (4K)' },
  { id: 'gemini-3.1-flash-image-preview-2K', label: 'Nano Banana 2 (2K)' },
  { id: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2 (1080p)' },
];

export const AVAILABLE_VIDEO_MODELS = [
  { id: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast (1080p)' },
  { id: 'veo-3.1-generate-preview', label: 'Veo 3.1 (1080p)' },
  { id: 'veo-2.0-generate-001', label: 'Veo 2.0 (1080p)' }
];

// Deprecated: Kept for backward compatibility if needed, but logic prefers dynamic now
export const IMAGE_MODEL = DEFAULT_IMAGE_MODEL;
export const VIDEO_MODEL = DEFAULT_VIDEO_MODEL;

// CONCURRENCY & RETRY STRATEGY
// Limit set to 5 to allow parallel pooling (racing multiple requests) if the first one hangs or fails.
export const API_CONCURRENCY_LIMIT = 5; 

// Default to 3 attempts total.
export const DEFAULT_RETRIES = 3;

export const getClient = () => {
  // Use the service to determine the correct key based on mode (Auto/Manual)
  // We no longer accept overrides; the mode dictates the key source strictly.
  const authKey = AuthService.getEffectiveKey();

  if (!authKey) {
    throw new Error("No Access Key");
  }
  return new GoogleGenAI({ apiKey: authKey });
};

// --- REUSABLE SAFETY CONFIGURATION ---
// Explicitly configured for the 4 supported categories with BLOCK_NONE.
// Saved as a constant to be reused across API calls.
export const OFF_SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];
