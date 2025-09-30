/**
 * React Hooks for Optimistic UI
 * Task 45: Implement optimistic update + rollback
 * Provides React integration for optimistic UI functionality
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { OptimisticUIService, OptimisticState } from '../services/optimistic-ui';

export interface UseOptimisticOptions {
  autoCommit?: boolean;
  commitDelay?: number;
  onRollback?: () => void;
  onCommit?: () => void;
  onError?: (error: Error) => void;
}

export interface UseOptimisticResult<T> {
  data: T;
  isOptimistic: boolean;
  hasChanges: boolean;
  update: (newData: T) => Promise<void>;
  commit: () => Promise<boolean>;
  rollback: () => Promise<void>;
  operationId: string | null;
  error: Error | null;
}

/**
 * Hook for managing optimistic UI updates
 */
export function useOptimistic<T>(
  optimisticService: OptimisticUIService,
  itemId: string,
  initialData: T,
  options: UseOptimisticOptions = {}
): UseOptimisticResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isOptimistic, setIsOptimistic] = useState(false);
  
  const commitTimeoutRef = useRef<NodeJS.Timeout>();
  const originalDataRef = useRef<T>(initialData);

  // Update original data when initial data changes
  useEffect(() => {
    if (!isOptimistic) {
      originalDataRef.current = initialData;
      setData(initialData);
    }
  }, [initialData, isOptimistic]);

  // Auto-commit logic
  useEffect(() => {
    if (options.autoCommit && operationId && isOptimistic) {
      const delay = options.commitDelay || 2000;
      
      commitTimeoutRef.current = setTimeout(() => {
        commit();
      }, delay);

      return () => {
        if (commitTimeoutRef.current) {
          clearTimeout(commitTimeoutRef.current);
        }
      };
    }
  }, [operationId, isOptimistic, options.autoCommit, options.commitDelay]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current);
      }
    };
  }, []);

  const update = useCallback(async (newData: T): Promise<void> => {
    try {
      setError(null);
      
      // Generate operation ID if not exists
      const currentOperationId = operationId || `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (!operationId) {
        setOperationId(currentOperationId);
      }

      // Apply optimistic update
      await optimisticService.applyOptimisticUpdate(
        itemId,
        originalDataRef.current,
        newData,
        currentOperationId
      );

      // Update local state
      setData(newData);
      setIsOptimistic(true);

      // Clear any pending auto-commit
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Update failed');
      setError(error);
      options.onError?.(error);
    }
  }, [optimisticService, itemId, operationId, options]);

  const commit = useCallback(async (): Promise<boolean> => {
    if (!operationId) {
      return false;
    }

    try {
      setError(null);
      
      const success = await optimisticService.commitOptimisticChanges(operationId);
      
      if (success) {
        // Update original data and clear optimistic state
        originalDataRef.current = data;
        setIsOptimistic(false);
        setOperationId(null);
        options.onCommit?.();
      }

      return success;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Commit failed');
      setError(error);
      options.onError?.(error);
      return false;
    }
  }, [optimisticService, operationId, data, options]);

  const rollback = useCallback(async (): Promise<void> => {
    if (!operationId) {
      return;
    }

    try {
      setError(null);
      
      await optimisticService.rollbackOptimisticChanges(operationId, 'User initiated rollback');
      
      // Restore original data
      setData(originalDataRef.current);
      setIsOptimistic(false);
      setOperationId(null);
      options.onRollback?.();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Rollback failed');
      setError(error);
      options.onError?.(error);
    }
  }, [optimisticService, operationId, options]);

  return {
    data,
    isOptimistic,
    hasChanges: isOptimistic,
    update,
    commit,
    rollback,
    operationId,
    error
  };
}

/**
 * Hook for batch optimistic updates
 */
export interface UseBatchOptimisticOptions extends UseOptimisticOptions {
  batchSize?: number;
  batchDelay?: number;
}

export interface UseBatchOptimisticResult<T> {
  items: Map<string, T>;
  optimisticItems: Set<string>;
  updateItem: (id: string, data: T) => Promise<void>;
  commitAll: () => Promise<boolean>;
  rollbackAll: () => Promise<void>;
  hasChanges: boolean;
  operationId: string | null;
  error: Error | null;
}

export function useBatchOptimistic<T>(
  optimisticService: OptimisticUIService,
  initialItems: Map<string, T>,
  options: UseBatchOptimisticOptions = {}
): UseBatchOptimisticResult<T> {
  const [items, setItems] = useState<Map<string, T>>(new Map(initialItems));
  const [optimisticItems, setOptimisticItems] = useState<Set<string>>(new Set());
  const [operationId, setOperationId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const originalItemsRef = useRef<Map<string, T>>(new Map(initialItems));
  const batchTimeoutRef = useRef<NodeJS.Timeout>();

  // Update original items when initial data changes
  useEffect(() => {
    if (optimisticItems.size === 0) {
      originalItemsRef.current = new Map(initialItems);
      setItems(new Map(initialItems));
    }
  }, [initialItems, optimisticItems]);

  const updateItem = useCallback(async (id: string, data: T): Promise<void> => {
    try {
      setError(null);
      
      // Generate operation ID if not exists
      const currentOperationId = operationId || `batch_opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (!operationId) {
        setOperationId(currentOperationId);
      }

      // Get original data
      const originalData = originalItemsRef.current.get(id) || data;

      // Apply optimistic update
      await optimisticService.applyOptimisticUpdate(
        id,
        originalData,
        data,
        currentOperationId
      );

      // Update local state
      setItems(prev => new Map(prev.set(id, data)));
      setOptimisticItems(prev => new Set(prev.add(id)));

      // Auto-commit logic for batches
      if (options.autoCommit) {
        const delay = options.batchDelay || 3000;
        
        if (batchTimeoutRef.current) {
          clearTimeout(batchTimeoutRef.current);
        }
        
        batchTimeoutRef.current = setTimeout(() => {
          commitAll();
        }, delay);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch update failed');
      setError(error);
      options.onError?.(error);
    }
  }, [optimisticService, operationId, options]);

  const commitAll = useCallback(async (): Promise<boolean> => {
    if (!operationId) {
      return false;
    }

    try {
      setError(null);
      
      const success = await optimisticService.commitOptimisticChanges(operationId);
      
      if (success) {
        // Update original data and clear optimistic state
        originalItemsRef.current = new Map(items);
        setOptimisticItems(new Set());
        setOperationId(null);
        options.onCommit?.();
      }

      return success;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch commit failed');
      setError(error);
      options.onError?.(error);
      return false;
    }
  }, [optimisticService, operationId, items, options]);

  const rollbackAll = useCallback(async (): Promise<void> => {
    if (!operationId) {
      return;
    }

    try {
      setError(null);
      
      await optimisticService.rollbackOptimisticChanges(operationId, 'Batch rollback initiated');
      
      // Restore original data
      setItems(new Map(originalItemsRef.current));
      setOptimisticItems(new Set());
      setOperationId(null);
      options.onRollback?.();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch rollback failed');
      setError(error);
      options.onError?.(error);
    }
  }, [optimisticService, operationId, options]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return {
    items,
    optimisticItems,
    updateItem,
    commitAll,
    rollbackAll,
    hasChanges: optimisticItems.size > 0,
    operationId,
    error
  };
}

/**
 * Hook for global optimistic state management
 */
export interface UseOptimisticStatusResult {
  hasOptimisticChanges: boolean;
  optimisticItemCount: number;
  commitAllChanges: () => Promise<void>;
  rollbackAllChanges: () => Promise<void>;
  clearOptimisticState: () => void;
}

export function useOptimisticStatus(
  optimisticService: OptimisticUIService
): UseOptimisticStatusResult {
  const [hasChanges, setHasChanges] = useState(false);
  const [itemCount, setItemCount] = useState(0);

  // Poll for optimistic changes status
  useEffect(() => {
    const checkStatus = () => {
      const hasOptimisticChanges = optimisticService.hasOptimisticChanges();
      setHasChanges(hasOptimisticChanges);
      
      if (hasOptimisticChanges && 'getOptimisticItems' in optimisticService) {
        const items = (optimisticService as any).getOptimisticItems();
        setItemCount(items.length);
      } else {
        setItemCount(0);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, [optimisticService]);

  const commitAllChanges = useCallback(async (): Promise<void> => {
    // This would need to be implemented to handle multiple operations
    // For now, we'll clear the state as a placeholder
    optimisticService.clearOptimisticState();
    setHasChanges(false);
    setItemCount(0);
  }, [optimisticService]);

  const rollbackAllChanges = useCallback(async (): Promise<void> => {
    // This would need to be implemented to handle multiple operations
    // For now, we'll clear the state as a placeholder
    optimisticService.clearOptimisticState();
    setHasChanges(false);
    setItemCount(0);
  }, [optimisticService]);

  const clearOptimisticState = useCallback((): void => {
    optimisticService.clearOptimisticState();
    setHasChanges(false);
    setItemCount(0);
  }, [optimisticService]);

  return {
    hasOptimisticChanges: hasChanges,
    optimisticItemCount: itemCount,
    commitAllChanges,
    rollbackAllChanges,
    clearOptimisticState
  };
}