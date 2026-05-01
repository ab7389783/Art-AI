
export enum SimulationMode {
  RENDER = 'RENDER',
  MOTION = 'MOTION',
  ANALYSIS = 'ANALYSIS'
}

export type SimulationStep = 'CHARACTER_SETUP' | 'INTERACTION_SIM' | 'INTERACTION_RESULT';

export interface SimulationConfig {
  characterPrompt: string;
  lighting: string;
  nationality: string;
  characterPhysique: string;
  
  // Custom Device Config
  interactionPrompt: string; 
  deviceImage?: string;      // Blob URL
  deviceImageRef?: string;   // Title Key
  
  // Session Layers Persistence (Blob URL + Reference Title)
  layerCharacter?: string;
  layerCharacterRef?: string;

  layerInteraction?: string;
  layerInteractionRef?: string;
  
  layerMotion?: string;
  layerMotionRef?: string;
  
  // Video specific prompt
  motionPrompt?: string; 
  
  // Targeting
  targetCoordinates?: { x: number; y: number };
  targetRegionDescription?: string;
  showTargetMarker?: boolean; 

  expression: string; 
  baseImage?: string;      // Blob URL
  baseImageRef?: string;   // Title Key

  // Persisted UI State
  sceneDescription?: string;
  visibleParts?: {
    face: boolean;
    physique: boolean;
    skin: boolean;
  };
  
  // App Navigation State
  currentStep?: SimulationStep;
}

export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video' | 'text';
  url?: string;
  title?: string;
  content?: string;
  timestamp: number;
  metadata?: {
    prompt: string;
    model: string;
    variant?: string; // 'character' | 'interaction' | 'motion' | 'imported' | 'face' | 'device'
  };
}

export interface LogEntry {
  id: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  rawData?: any; 
  rawDataRef?: string; // Reference to IndexedDB key for heavy payload
  timestamp: number;
}

export interface Toast {
  id: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
}
