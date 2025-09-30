/**
 * Global Save Components
 * Task 50: Implement Global Save button & conflict banner UI components
 * Exports all global save related components and utilities
 */

// Main components
export { GlobalSaveButton, CompactGlobalSaveButton, GlobalSaveWithRefresh } from './GlobalSaveButton';
export type { 
  GlobalSaveButtonProps, 
  CompactGlobalSaveButtonProps, 
  GlobalSaveWithRefreshProps 
} from './GlobalSaveButton';

export { ConflictBanner, CompactConflictBanner, ConflictToast } from './ConflictBanner';
export type { 
  ConflictBannerProps, 
  CompactConflictBannerProps, 
  ConflictToastProps 
} from './ConflictBanner';

export { GlobalSaveManager, useGlobalSave } from './GlobalSaveManager';
export type { GlobalSaveManagerProps } from './GlobalSaveManager';

// Re-export service types for convenience
export type { 
  GlobalSaveBatchRequest, 
  GlobalSaveResult 
} from '../../services/global-save-orchestrator';

export type { 
  ConflictItem, 
  ConflictResolutionRequest, 
  ConflictResolutionResult 
} from '../../services/conflict-resolution';