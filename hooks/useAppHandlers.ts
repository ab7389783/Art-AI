
import { GeneratedAsset, SimulationConfig, SimulationStep } from '../types';

interface UseAppHandlersProps {
    gallery: GeneratedAsset[];
    removeFromGallery: (id: string) => void;
    clearGallery: () => Promise<void>;
    addToast: (msg: string, level?: 'info' | 'warning' | 'error' | 'success') => void;
    state: {
        config: SimulationConfig;
        masterCharacterAsset: GeneratedAsset | null;
        interactionAsset: GeneratedAsset | null;
        motionAsset: GeneratedAsset | null;
        step: SimulationStep;
        hasInteractionImage?: boolean; // Optional depending on useSimulation structure
    };
    actions: {
        handleUnloadAsset: (role: 'motion' | 'interaction' | 'character' | 'face' | 'device', silent?: boolean) => void;
        setMotionAsset: (asset: GeneratedAsset | null) => void;
        setInteractionAsset: (asset: GeneratedAsset | null) => void;
        setMasterCharacterAsset: (asset: GeneratedAsset | null) => void;
        setStep: (step: SimulationStep) => void;
        setIsEditing: (val: boolean) => void;
        updateConfig: (updates: Partial<SimulationConfig>) => void;
        handleUseUploadedAsBase: (b64: string, name: string) => Promise<void>;
        handleInteractionUpload: (b64: string, name: string) => Promise<void>;
        // Fallback for other actions
        [key: string]: any;
    };
}

export const useAppHandlers = ({
    gallery,
    removeFromGallery,
    clearGallery,
    addToast,
    state,
    actions
}: UseAppHandlersProps) => {
    const { config, motionAsset, interactionAsset, masterCharacterAsset, step } = state;

    const handleDeleteAsset = (id: string) => {
        const assetToDelete = gallery.find(a => a.id === id);
        if (!assetToDelete) return;

        const typeLabel = assetToDelete.metadata?.variant 
            ? assetToDelete.metadata.variant.toUpperCase() 
            : assetToDelete.type.toUpperCase();
        const title = assetToDelete.title || "Untitled";
        
        // 1. Show Delete Toast
        addToast(`Delete ${typeLabel}: ${title}`, 'info');

        // 2. Remove from Gallery
        removeFromGallery(id);

        // 3. Unload references silently if they match the deleted asset
        // Check Face
        if (config.baseImageRef === assetToDelete.title || config.baseImage === assetToDelete.url) {
            actions.handleUnloadAsset('face', true);
        }
        // Check Device
        if (config.deviceImageRef === assetToDelete.title || config.deviceImage === assetToDelete.url) {
            actions.handleUnloadAsset('device', true);
        }

        // 4. Check & Clear Layers silently
        if (motionAsset?.id === id) {
            actions.handleUnloadAsset('motion', true);
        }
        if (interactionAsset?.id === id) {
            actions.handleUnloadAsset('interaction', true);
        }
        if (masterCharacterAsset?.id === id) {
            actions.handleUnloadAsset('character', true);
        }
    };

    const handleClearGallery = async () => {
        await clearGallery();

        // Reset workspace state
        actions.setMotionAsset(null);
        actions.setInteractionAsset(null);
        actions.setMasterCharacterAsset(null);
        actions.setStep('CHARACTER_SETUP');
        actions.setIsEditing(false);

        // Clear config references
        actions.updateConfig({
            baseImage: undefined,
            deviceImage: undefined,
            currentStep: 'CHARACTER_SETUP'
        });

        addToast("Gallery cleared and workspace reset", 'info');
    };

    const handleViewportReplace = async (base64: string, filename: string) => {
        // Logic for replacing via Viewport overlay based on current step
        if (step === 'CHARACTER_SETUP' || step === 'INTERACTION_SIM') {
            // Generally replacing character base
            await actions.handleUseUploadedAsBase(base64, filename);
        } else if (step === 'INTERACTION_RESULT') {
            // Replacing Interaction result (Motion input)
            await actions.handleInteractionUpload(base64, filename);
        }
    };

    const handleRevertToBase = () => {
        actions.handleUnloadAsset('interaction');
    };

    return {
        handleDeleteAsset,
        handleClearGallery,
        handleViewportReplace,
        handleRevertToBase
    };
};
