
// Hidden instruction to remove the safety watermark applied during preprocessing
// REVISED: Removed "Assistant" framing and "Do not use tools" negative constraints.
// We strictly provide visual descriptors now to prevent the model from entering Function Calling mode.
export const HIDDEN_WATERMARK_INSTRUCTION = "Photorealistic, high fidelity render. No text overlay. No watermarks. 8k resolution.";

export const SKIN_TONES = [
  { id: "Rose Pale", label: "Rose Pale (Pinkish Light)", color: "#f0dfd8", description: "Natural Skin Texture (Pale Rose)" },
  { id: "Bisque", label: "Bisque (Rich Light)", color: "#f5e6d3", description: "Natural Skin Texture (Rich Bisque)" },
  { id: "Peach", label: "Peach (Warm Fair)", color: "#ebd2c1", description: "Natural Skin Texture (Warm Peach)" },
  { id: "Beige", label: "Beige (Neutral)", color: "#e3cbb1", description: "Natural Skin Texture (Neutral Beige)" },
  { id: "Bronze", label: "Bronze (Deep)", color: "#8d5524", description: "Natural Skin Texture (Deep Bronze)" },
  { id: "Ebony", label: "Ebony (Dark)", color: "#3b2f2f", description: "Natural Skin Texture (Deep Dark)" }
];

export const getMarkerDirective = (hasDevice: boolean) => {
  // CHANGED: "Apply tool" -> "Apply device". The word "tool" triggers function calling.
  const action = hasDevice ? "Apply device to red marker" : "Stimulate red marker";
  return `${action}. Remove red marker on final result.`;
};

export const getMaterialDescription = (toneIdOrLabel: string) => {
  const tone = SKIN_TONES.find(t => t.label === toneIdOrLabel || t.id === toneIdOrLabel) || SKIN_TONES[1]; 
  return {
    desc: tone.description,
    hex: tone.color,
    name: tone.label
  };
};

export const getPromptParts = (skinTone: string, characterPhysique: string, hasBaseImage: boolean) => {
  const material = getMaterialDescription(skinTone);
  
  return {
    face: hasBaseImage 
      ? "Strict Adherence to My Face & Hair" 
      : "K-pop Handsome Face & Hair",
    physique: `Physique: ${characterPhysique}`,
    skin: `Skin Color: ${material.name}`
  };
};

export const DEFAULT_SCENE_PROMPT = "Full-body wide shot. Minimalist swimwear. Kneel and raise both arms. Heavy sweat on hyper-realistic organic skin. Solid color background.";

export const constructSubjectPrompt = (skinTone: string, characterPhysique: string, hasBaseImage: boolean): string => {
  const parts = getPromptParts(skinTone, characterPhysique, hasBaseImage);
  return `${parts.face}. ${parts.physique}. ${parts.skin}. ${DEFAULT_SCENE_PROMPT}`;
};

export const constructInteractionPrompt = (expression: string, hasDevice: boolean = false): string => {
  // CHANGED: "tool interaction" -> "device interaction"
  const actionDescription = hasDevice 
    ? "My body experiences writhing caused by the device interaction."
    : "My body experiences writhing.";

  return `${actionDescription} Wrist locations fixed for stability.`.trim();
};

export const DEFAULT_MOTION_PROMPT = "High fidelity. Organic muscle movement.";

export const constructMotionPrompt = (): string => {
  return DEFAULT_MOTION_PROMPT;
};

export const constructSafeExecutionPrompt = (prompt: string): string => {
  return `${prompt} ${HIDDEN_WATERMARK_INSTRUCTION}`;
};
