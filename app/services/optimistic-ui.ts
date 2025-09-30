/**
 * Optimistic UI Service
 * Implements FR-029, FR-005 (optimistic update + rollback functionality)
 * Task 45: Implement optimistic update + rollback
 */

import type { GlobalSaveOrchestratorService } from './global-save-orchestrator';

export interface OptimisticState<T = any> {
  id: string;
  originalData: T;
  optimisticData: T;
  isOptimistic: boolean;
  timestamp: string;
  operationId: string;
}

export interface OptimisticOperation {
  operationId: string;
  type: 'batch_save' | 'single_update' | 'delete';
  affectedItems: Array<{
    type: 'ingredient' | 'recipe' | 'packaging';
    id: string;
    originalData: any;
    optimisticData: any;
  }>;
  timestamp: string;
  userId: string;
}

export interface RollbackResult {
  success: boolean;
  rolledBackItems: string[];
  errors: Array<{
    id: string;
    error: string;
  }>;
  auditTrail: string;
}

export interface OptimisticUIService {
  applyOptimisticUpdate<T>(
    id: string,
    originalData: T,
    optimisticData: T,
    operationId: string
  ): Promise<void>;
  
  commitOptimisticChanges(operationId: string): Promise<boolean>;
  
  rollbackOptimisticChanges(
    operationId: string,
    reason?: string
  ): Promise<RollbackResult>;
  
  getOptimisticState<T>(id: string): OptimisticState<T> | null;
  
  hasOptimisticChanges(): boolean;
  
  clearOptimisticState(operationId?: string): void;
}

export class OptimisticUIServiceImpl implements OptimisticUIService {
  private optimisticStates = new Map<string, OptimisticState>();
  private activeOperations = new Map<string, OptimisticOperation>();
  private rollbackCallbacks = new Map<string, (data: any) => void>();

  constructor(
    private deps: {
      globalSaveOrchestrator: GlobalSaveOrchestratorService;
      toastService?: {
        showSuccess: (message: string) => void;
        showError: (message: string) => void;
        showInfo: (message: string) => void;
      };
      analyticsService?: {
        trackOptimisticUpdate: (operationId: string, itemCount: number) => void;
        trackRollback: (operationId: string, reason: string) => void;
      };
    }
  ) {}

  /**
   * Apply optimistic update to UI state immediately (FR-029)
   */
  async applyOptimisticUpdate<T>(
    id: string,
    originalData: T,
    optimisticData: T,
    operationId: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    // Store optimistic state
    this.optimisticStates.set(id, {
      id,
      originalData,
      optimisticData,
      isOptimistic: true,
      timestamp,
      operationId
    });

    // Track operation
    if (!this.activeOperations.has(operationId)) {
      this.activeOperations.set(operationId, {
        operationId,
        type: 'batch_save',
        affectedItems: [],
        timestamp,
        userId: 'current_user' // Would come from auth context
      });
    }

    const operation = this.activeOperations.get(operationId)!;
    operation.affectedItems.push({
      type: this.inferEntityType(originalData),
      id,
      originalData,
      optimisticData
    });

    // Analytics tracking
    this.deps.analyticsService?.trackOptimisticUpdate(operationId, operation.affectedItems.length);

    console.log(`Applied optimistic update for ${id} in operation ${operationId}`);
  }

  /**
   * Commit optimistic changes by executing actual save (FR-029)
   */
  async commitOptimisticChanges(operationId: string): Promise<boolean> {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      console.warn(`No optimistic operation found for ID: ${operationId}`);
      return false;
    }

    try {
      // Convert optimistic changes to batch save request
      const batchRequest = this.convertOptimisticOperationToBatchRequest(operation);
      
      // Execute actual save through orchestrator
      const saveResult = await this.deps.globalSaveOrchestrator.executeBatchSave(batchRequest);

      if (saveResult.success) {
        // Success: remove optimistic states for committed items
        operation.affectedItems.forEach(item => {
          this.optimisticStates.delete(item.id);
        });
        this.activeOperations.delete(operationId);

        this.deps.toastService?.showSuccess(
          `Saved ${operation.affectedItems.length} ${operation.affectedItems.length === 1 ? 'item' : 'items'} successfully`
        );

        return true;
      } else {
        // Conflicts detected - need user resolution
        if (saveResult.conflicts && saveResult.conflicts.length > 0) {
          this.deps.toastService?.showInfo(
            `${saveResult.conflicts.length} conflicts detected. Please resolve them to continue.`
          );
        }
        return false;
      }

    } catch (error) {
      console.error(`Commit failed for operation ${operationId}:`, error);
      
      // Auto-rollback on commit failure
      await this.rollbackOptimisticChanges(
        operationId, 
        error instanceof Error ? error.message : 'Save operation failed'
      );
      
      return false;
    }
  }

  /**
   * Rollback optimistic changes and restore original state (FR-029)
   */
  async rollbackOptimisticChanges(
    operationId: string,
    reason?: string
  ): Promise<RollbackResult> {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      return {
        success: false,
        rolledBackItems: [],
        errors: [{ id: operationId, error: 'Operation not found' }],
        auditTrail: ''
      };
    }

    const rolledBackItems: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    try {
      // Restore original data for each optimistic item
      for (const item of operation.affectedItems) {
        try {
          const optimisticState = this.optimisticStates.get(item.id);
          if (optimisticState) {
            // Trigger rollback callback if registered
            const callback = this.rollbackCallbacks.get(item.id);
            if (callback) {
              callback(optimisticState.originalData);
            }

            // Remove optimistic state
            this.optimisticStates.delete(item.id);
            rolledBackItems.push(item.id);
          }
        } catch (itemError) {
          errors.push({
            id: item.id,
            error: itemError instanceof Error ? itemError.message : 'Rollback failed'
          });
        }
      }

      // Clean up operation tracking
      this.activeOperations.delete(operationId);

      // Show user feedback
      if (errors.length === 0) {
        this.deps.toastService?.showInfo(
          `Changes reverted${reason ? ` due to: ${reason}` : ''}`
        );
      } else {
        this.deps.toastService?.showError(
          `Partial rollback completed. ${errors.length} items failed to revert.`
        );
      }

      // Analytics tracking
      this.deps.analyticsService?.trackRollback(operationId, reason || 'unknown');

      const auditTrail = `rollback_${operationId}_${Date.now()}`;

      return {
        success: errors.length === 0,
        rolledBackItems,
        errors,
        auditTrail
      };

    } catch (error) {
      console.error(`Rollback failed for operation ${operationId}:`, error);
      
      this.deps.toastService?.showError(
        'Critical error during rollback. Please refresh the page.'
      );

      return {
        success: false,
        rolledBackItems,
        errors: [{ 
          id: operationId, 
          error: error instanceof Error ? error.message : 'Rollback operation failed'
        }],
        auditTrail: ''
      };
    }
  }

  /**
   * Get current optimistic state for an item
   */
  getOptimisticState<T>(id: string): OptimisticState<T> | null {
    const state = this.optimisticStates.get(id);
    return state ? (state as OptimisticState<T>) : null;
  }

  /**
   * Check if there are any pending optimistic changes
   */
  hasOptimisticChanges(): boolean {
    return this.optimisticStates.size > 0;
  }

  /**
   * Clear optimistic state (for cleanup or hard reset)
   */
  clearOptimisticState(operationId?: string): void {
    if (operationId) {
      // Clear only specific operation
      const operation = this.activeOperations.get(operationId);
      if (operation) {
        operation.affectedItems.forEach(item => {
          this.optimisticStates.delete(item.id);
        });
        this.activeOperations.delete(operationId);
      }
    } else {
      // Clear all optimistic state
      this.optimisticStates.clear();
      this.activeOperations.clear();
      this.rollbackCallbacks.clear();
    }
  }

  /**
   * Register callback for when item is rolled back
   */
  onRollback(itemId: string, callback: (originalData: any) => void): void {
    this.rollbackCallbacks.set(itemId, callback);
  }

  /**
   * Get all items with optimistic changes for debugging
   */
  getOptimisticItems(): Array<{ id: string; hasChanges: boolean; operationId: string }> {
    return Array.from(this.optimisticStates.entries()).map(([id, state]) => ({
      id,
      hasChanges: state.isOptimistic,
      operationId: state.operationId
    }));
  }

  /**
   * Convert optimistic operation to batch save request
   */
  private convertOptimisticOperationToBatchRequest(
    operation: OptimisticOperation
  ): any {
    const ingredients: any[] = [];
    const recipes: any[] = [];
    const packaging: any[] = [];

    operation.affectedItems.forEach(item => {
      switch (item.type) {
        case 'ingredient':
          ingredients.push(item.optimisticData);
          break;
        case 'recipe':
          recipes.push(item.optimisticData);
          break;
        case 'packaging':
          packaging.push(item.optimisticData);
          break;
      }
    });

    return {
      ingredients,
      recipes,
      packaging,
      auditContext: {
        userId: operation.userId,
        operation: 'OPTIMISTIC_COMMIT',
        timestamp: operation.timestamp,
        source: 'optimistic_ui'
      }
    };
  }

  /**
   * Infer entity type from data structure
   */
  private inferEntityType(data: any): 'ingredient' | 'recipe' | 'packaging' {
    if (data.unit && data.currentPrice !== undefined) return 'ingredient';
    if (data.lines && Array.isArray(data.lines)) return 'recipe';
    if (data.unitCost !== undefined) return 'packaging';
    return 'ingredient'; // fallback
  }

  /**
   * Generate unique operation ID
   */
  generateOperationId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * React Hook for optimistic UI state management
 */
export interface UseOptimisticUpdateResult<T> {
  data: T;
  isOptimistic: boolean;
  update: (newData: T) => Promise<void>;
  commit: () => Promise<boolean>;
  rollback: () => Promise<void>;
  hasChanges: boolean;
}

export function createOptimisticUpdateHook<T>(
  optimisticService: OptimisticUIService,
  initialData: T,
  itemId: string
): UseOptimisticUpdateResult<T> {
  let currentData = initialData;
  let operationId: string | null = null;

  const update = async (newData: T): Promise<void> => {
    if (!operationId) {
      operationId = (optimisticService as OptimisticUIServiceImpl).generateOperationId();
    }
    
    await optimisticService.applyOptimisticUpdate(
      itemId,
      initialData,
      newData,
      operationId
    );
    
    currentData = newData;
  };

  const commit = async (): Promise<boolean> => {
    if (!operationId) return false;
    return await optimisticService.commitOptimisticChanges(operationId);
  };

  const rollback = async (): Promise<void> => {
    if (operationId) {
      await optimisticService.rollbackOptimisticChanges(operationId);
      currentData = initialData;
      operationId = null;
    }
  };

  const state = optimisticService.getOptimisticState<T>(itemId);

  return {
    data: state?.optimisticData || currentData,
    isOptimistic: state?.isOptimistic || false,
    update,
    commit,
    rollback,
    hasChanges: state?.isOptimistic || false
  };
}