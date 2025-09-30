/**
 * Global Save Integration Component
 * Task 50: Implement Global Save button & conflict banner UI components
 * Integrates GlobalSaveButton and ConflictBanner with orchestrator service
 */

import React, { useState, useCallback } from 'react';
import {
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Toast,
  Frame
} from '@shopify/polaris';
import { GlobalSaveButton, CompactGlobalSaveButton } from './GlobalSaveButton';
import { ConflictBanner, CompactConflictBanner } from './ConflictBanner';
import type { 
  GlobalSaveBatchRequest, 
  GlobalSaveResult 
} from '../../services/global-save-orchestrator';
import type { 
  ConflictResolutionService,
  ConflictResolutionRequest 
} from '../../services/conflict-resolution';

export interface GlobalSaveManagerProps {
  /** Global save orchestrator service instance */
  globalSaveService: {
    executeBatchSave: (request: GlobalSaveBatchRequest) => Promise<GlobalSaveResult>;
    getBatchOperationStatus: (operationId: string) => Promise<{
      status: 'pending' | 'completed' | 'failed';
      progress?: number;
      result?: GlobalSaveResult;
      error?: string;
    }>;
  };
  /** Conflict resolution service instance */
  conflictResolutionService: ConflictResolutionService;
  /** Current staged changes */
  stagedChanges: GlobalSaveBatchRequest;
  /** Callback when changes are successfully saved */
  onSaveSuccess?: (result: GlobalSaveResult) => void;
  /** Callback when changes need to be refreshed */
  onDataRefresh?: () => Promise<void>;
  /** Callback when conflicts are resolved */
  onConflictsResolved?: () => void;
  /** Use compact layout for mobile/toolbar */
  compact?: boolean;
  /** Current user ID for audit trails */
  userId: string;
}

/**
 * Integrated Global Save Manager with conflict resolution
 */
export function GlobalSaveManager({
  globalSaveService,
  conflictResolutionService,
  stagedChanges,
  onSaveSuccess,
  onDataRefresh,
  onConflictsResolved,
  compact = false,
  userId
}: GlobalSaveManagerProps) {
  const [conflicts, setConflicts] = useState<GlobalSaveResult['conflicts']>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);
  const [currentOperationId, setCurrentOperationId] = useState<string | null>(null);
  const [toastProps, setToastProps] = useState<{
    content: string;
    error?: boolean;
    action?: { content: string; onAction: () => void };
  } | null>(null);

  // Check if there are changes to save
  const hasChanges = (stagedChanges.ingredients?.length || 0) + 
                    (stagedChanges.recipes?.length || 0) + 
                    (stagedChanges.packaging?.length || 0) > 0;

  // Handle global save operation
  const handleSave = useCallback(async (request: GlobalSaveBatchRequest): Promise<GlobalSaveResult> => {
    setIsLoading(true);
    setToastProps(null);
    
    try {
      const result = await globalSaveService.executeBatchSave(request);
      setCurrentOperationId(result.operationId);
      
      if (result.success) {
        setConflicts([]);
        setShowConflicts(false);
        onSaveSuccess?.(result);
        
        setToastProps({
          content: `Successfully saved ${
            result.savedIngredients.length + 
            result.savedRecipes.length + 
            result.savedPackaging.length
          } items`,
        });
      } else if (result.conflicts && result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        setShowConflicts(true);
        
        setToastProps({
          content: `${result.conflicts.length} conflict${result.conflicts.length !== 1 ? 's' : ''} detected`,
          error: false,
          action: {
            content: 'Resolve',
            onAction: () => setShowConflicts(true)
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Global save failed:', error);
      
      setToastProps({
        content: 'Save failed. Please try again.',
        error: true
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [globalSaveService, onSaveSuccess]);

  // Handle conflict refresh
  const handleRefreshConflicts = useCallback(async () => {
    if (!conflicts?.length || !currentOperationId) return;
    
    setIsRefreshing(true);
    setToastProps(null);
    
    try {
      // Use conflict resolution service to refresh conflicts
      const refreshResult = await conflictResolutionService.refreshConflicts(
        conflicts.map(c => ({
          type: c.type,
          id: c.id,
          clientVersion: c.clientVersion,
          currentVersion: c.currentVersion,
          name: c.name,
          lastModified: new Date().toISOString(),
          modifiedBy: 'system',
          conflictFields: [],
          serverData: null
        })),
        [], // non-conflicted data will be preserved
        userId,
        currentOperationId
      );
      
      // Refresh the data
      await onDataRefresh?.();
      
      // Clear conflicts
      setConflicts([]);
      setShowConflicts(false);
      onConflictsResolved?.();
      
      setToastProps({
        content: `Refreshed ${refreshResult.refreshedItems.length} conflicted items`,
      });
    } catch (error) {
      console.error('Conflict refresh failed:', error);
      
      setToastProps({
        content: 'Failed to refresh conflicts. Please try again.',
        error: true
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [conflicts, currentOperationId, conflictResolutionService, userId, onDataRefresh, onConflictsResolved]);

  // Handle override all conflicts
  const handleOverrideAll = useCallback(async () => {
    if (!conflicts?.length || !currentOperationId) return;
    
    setIsOverriding(true);
    setToastProps(null);
    
    try {
      // Prepare conflict resolution request
      const resolutionRequest: ConflictResolutionRequest = {
        conflictedItems: conflicts.map(conflict => ({
          type: conflict.type,
          id: conflict.id,
          resolution: 'override_with_client',
          clientData: {}, // This should contain the actual client data
        })),
        nonConflictedItems: [],
        userId,
        operationId: currentOperationId
      };
      
      // Execute override resolution
      const resolutionResult = await conflictResolutionService.resolveConflicts(resolutionRequest);
      
      // Execute the save with override
      const saveResult = await globalSaveService.executeBatchSave({
        ...stagedChanges,
        auditContext: {
          userId,
          operation: 'OVERRIDE_ALL',
          timestamp: new Date().toISOString()
        }
      });
      
      if (saveResult.success) {
        setConflicts([]);
        setShowConflicts(false);
        onSaveSuccess?.(saveResult);
        onConflictsResolved?.();
        
        setToastProps({
          content: `Override successful. Saved ${
            saveResult.savedIngredients.length + 
            saveResult.savedRecipes.length + 
            saveResult.savedPackaging.length
          } items with audit trail`,
        });
      }
    } catch (error) {
      console.error('Override all failed:', error);
      
      setToastProps({
        content: 'Failed to override conflicts. Please try again.',
        error: true
      });
    } finally {
      setIsOverriding(false);
    }
  }, [conflicts, currentOperationId, conflictResolutionService, globalSaveService, stagedChanges, userId, onSaveSuccess, onConflictsResolved]);

  // Handle save errors
  const handleSaveError = useCallback((error: Error) => {
    console.error('Save operation error:', error);
    
    setToastProps({
      content: error.message || 'Save operation failed',
      error: true
    });
  }, []);

  // Handle conflicts detected
  const handleConflictsDetected = useCallback((detectedConflicts: GlobalSaveResult['conflicts']) => {
    if (detectedConflicts) {
      setConflicts(detectedConflicts);
      setShowConflicts(true);
    }
  }, []);

  // Close toast
  const closeToast = useCallback(() => {
    setToastProps(null);
  }, []);

  const saveButtonProps = {
    onSave: handleSave,
    stagedChanges,
    isLoading,
    hasChanges,
    onConflictsDetected: handleConflictsDetected,
    onSaveSuccess,
    onSaveError: handleSaveError
  };

  const conflictBannerProps = {
    conflicts: conflicts || [],
    onRefreshConflicts: handleRefreshConflicts,
    onOverrideAll: handleOverrideAll,
    isRefreshing,
    isOverriding,
    operationId: currentOperationId || undefined,
    onDismiss: () => setShowConflicts(false)
  };

  if (compact) {
    return (
      <Frame>
        <BlockStack gap="200">
          {showConflicts && conflicts && conflicts.length > 0 && (
            <CompactConflictBanner {...conflictBannerProps} />
          )}
          
          <InlineStack align="end">
            <CompactGlobalSaveButton {...saveButtonProps} />
          </InlineStack>
        </BlockStack>
        
        {toastProps && (
          <Toast
            content={toastProps.content}
            error={toastProps.error}
            onDismiss={closeToast}
            action={toastProps.action}
          />
        )}
      </Frame>
    );
  }

  return (
    <Frame>
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {showConflicts && conflicts && conflicts.length > 0 && (
              <ConflictBanner {...conflictBannerProps} />
            )}
            
            <Card>
              <InlineStack align="end">
                <GlobalSaveButton {...saveButtonProps} />
              </InlineStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
      
      {toastProps && (
        <Toast
          content={toastProps.content}
          error={toastProps.error}
          onDismiss={closeToast}
          action={toastProps.action}
        />
      )}
    </Frame>
  );
}

/**
 * Hook for managing global save state
 */
export function useGlobalSave(
  globalSaveService: GlobalSaveManagerProps['globalSaveService'],
  conflictResolutionService: ConflictResolutionService
) {
  const [operationId, setOperationId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'conflicts' | 'success' | 'error'>('idle');
  const [conflicts, setConflicts] = useState<GlobalSaveResult['conflicts']>([]);

  const executeSave = useCallback(async (request: GlobalSaveBatchRequest) => {
    setStatus('saving');
    try {
      const result = await globalSaveService.executeBatchSave(request);
      setOperationId(result.operationId);
      
      if (result.success) {
        setStatus('success');
        setConflicts([]);
      } else if (result.conflicts && result.conflicts.length > 0) {
        setStatus('conflicts');
        setConflicts(result.conflicts);
      }
      
      return result;
    } catch (error) {
      setStatus('error');
      throw error;
    }
  }, [globalSaveService]);

  const resolveConflicts = useCallback(async (strategy: 'refresh' | 'override') => {
    if (!conflicts?.length || !operationId) return;
    
    if (strategy === 'refresh') {
      const refreshResult = await conflictResolutionService.refreshConflicts(
        conflicts.map(c => ({
          type: c.type,
          id: c.id,
          clientVersion: c.clientVersion,
          currentVersion: c.currentVersion,
          name: c.name,
          lastModified: new Date().toISOString(),
          modifiedBy: 'system',
          conflictFields: [],
          serverData: null
        })),
        [],
        'current-user',
        operationId
      );
      
      setStatus('idle');
      setConflicts([]);
      return refreshResult;
    } else {
      // Override logic would go here
      setStatus('idle');
      setConflicts([]);
    }
  }, [conflicts, operationId, conflictResolutionService]);

  return {
    operationId,
    status,
    conflicts,
    executeSave,
    resolveConflicts
  };
}