/**
 * Global Save Button Component
 * Task 50: Implement Global Save button & conflict banner UI components
 * Implements FR-019, FR-028, FR-031, FR-032
 */

import React, { useState, useEffect } from 'react';
import {
  Button,
  ButtonGroup,
  Tooltip,
  InlineStack,
  Text,
  Icon,
  Spinner,
  Badge
} from '@shopify/polaris';
import {
  SaveIcon,
  RefreshIcon,
  AlertTriangleIcon,
  CheckCircleIcon
} from '@shopify/polaris-icons';
import type { GlobalSaveBatchRequest, GlobalSaveResult } from '../../services/global-save-orchestrator';

export interface GlobalSaveButtonProps {
  /** Callback to execute the global save operation */
  onSave: (request: GlobalSaveBatchRequest) => Promise<GlobalSaveResult>;
  /** Current staged changes to save */
  stagedChanges: GlobalSaveBatchRequest;
  /** Whether the save operation is currently in progress */
  isLoading?: boolean;
  /** Whether there are any changes to save */
  hasChanges?: boolean;
  /** Callback when conflicts are detected */
  onConflictsDetected?: (conflicts: GlobalSaveResult['conflicts']) => void;
  /** Callback when save operation completes successfully */
  onSaveSuccess?: (result: GlobalSaveResult) => void;
  /** Callback when save operation fails */
  onSaveError?: (error: Error) => void;
  /** Button size */
  size?: 'slim' | 'medium' | 'large';
  /** Custom button text */
  customText?: string;
  /** Show detailed tooltip */
  showTooltip?: boolean;
}

/**
 * Global Save Button component implementing FR-028 (≤2 API calls)
 */
export function GlobalSaveButton({
  onSave,
  stagedChanges,
  isLoading = false,
  hasChanges = false,
  onConflictsDetected,
  onSaveSuccess,
  onSaveError,
  size = 'medium',
  customText,
  showTooltip = true
}: GlobalSaveButtonProps) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success' | 'error' | 'conflicts'>('idle');
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);

  // Calculate change counts for display
  const totalChanges = (stagedChanges.ingredients?.length || 0) + 
                      (stagedChanges.recipes?.length || 0) + 
                      (stagedChanges.packaging?.length || 0);

  // Handle save operation
  const handleSave = async () => {
    if (!hasChanges || isLoading) return;

    setSaveState('saving');
    const startTime = new Date();
    
    try {
      // Execute global save with performance tracking
      const result = await onSave(stagedChanges);
      setOperationId(result.operationId);
      setLastSaveTime(startTime);

      if (result.success) {
        setSaveState('success');
        onSaveSuccess?.(result);
        
        // Reset to idle after success feedback
        setTimeout(() => setSaveState('idle'), 2000);
      } else if (result.conflicts && result.conflicts.length > 0) {
        setSaveState('conflicts');
        onConflictsDetected?.(result.conflicts);
      } else {
        throw new Error('Save operation failed');
      }
    } catch (error) {
      setSaveState('error');
      onSaveError?.(error instanceof Error ? error : new Error('Unknown error'));
      
      // Reset to idle after error feedback
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  // Reset state when changes are cleared
  useEffect(() => {
    if (!hasChanges && saveState !== 'saving') {
      setSaveState('idle');
    }
  }, [hasChanges, saveState]);

  // Button appearance based on state
  const getButtonProps = () => {
    switch (saveState) {
      case 'saving':
        return {
          loading: true,
          disabled: true
        };
      case 'success':
        return {
          tone: 'success' as const,
          disabled: false,
          icon: CheckCircleIcon
        };
      case 'error':
        return {
          tone: 'critical' as const,
          disabled: false,
          icon: AlertTriangleIcon
        };
      case 'conflicts':
        return {
          disabled: false,
          icon: AlertTriangleIcon
        };
      default:
        return {
          disabled: !hasChanges,
          icon: SaveIcon
        };
    }
  };

  // Button text based on state
  const getButtonText = () => {
    if (customText && saveState === 'idle') return customText;
    
    switch (saveState) {
      case 'saving':
        return 'Saving...';
      case 'success':
        return 'Saved!';
      case 'error':
        return 'Save Failed';
      case 'conflicts':
        return 'Conflicts Detected';
      default:
        return totalChanges > 0 ? `Save Changes (${totalChanges})` : 'Save Changes';
    }
  };

  // Tooltip content
  const getTooltipContent = () => {
    if (!showTooltip) return '';
    
    switch (saveState) {
      case 'saving':
        return 'Executing global save operation...';
      case 'success':
        return lastSaveTime ? `Last saved at ${lastSaveTime.toLocaleTimeString()}` : 'Save completed successfully';
      case 'error':
        return 'Save operation failed. Click to retry.';
      case 'conflicts':
        return 'Version conflicts detected. Resolve conflicts to proceed.';
      default:
        if (!hasChanges) return 'No changes to save';
        
  const breakdown: string[] = [];
        if (stagedChanges.ingredients?.length) breakdown.push(`${stagedChanges.ingredients.length} ingredients`);
        if (stagedChanges.recipes?.length) breakdown.push(`${stagedChanges.recipes.length} recipes`);
        if (stagedChanges.packaging?.length) breakdown.push(`${stagedChanges.packaging.length} packaging options`);
        
        return `Save ${breakdown.join(', ')} using atomic batch operation (≤2 API calls)`;
    }
  };

  const buttonProps = getButtonProps();
  const buttonText = getButtonText();
  const tooltipContent = getTooltipContent();

  const saveButton = (
    <Button
      {...buttonProps}
      size={size}
      onClick={handleSave}
      accessibilityLabel={`Global save button. ${tooltipContent}`}
    >
      {buttonText}
    </Button>
  );

  if (!showTooltip || !tooltipContent) {
    return saveButton;
  }

  return (
    <Tooltip content={tooltipContent} dismissOnMouseOut>
      {saveButton}
    </Tooltip>
  );
}

/**
 * Compact Global Save button for toolbars
 */
export interface CompactGlobalSaveButtonProps extends Omit<GlobalSaveButtonProps, 'size' | 'customText' | 'showTooltip'> {
  showChangeCount?: boolean;
}

export function CompactGlobalSaveButton({
  showChangeCount = true,
  ...props
}: CompactGlobalSaveButtonProps) {
  const totalChanges = (props.stagedChanges.ingredients?.length || 0) + 
                      (props.stagedChanges.recipes?.length || 0) + 
                      (props.stagedChanges.packaging?.length || 0);

  return (
    <InlineStack gap="200" align="center">
      <GlobalSaveButton
        {...props}
        size="slim"
        showTooltip={true}
        customText="Save"
      />
      {showChangeCount && totalChanges > 0 && (
        <Badge tone="info" size="small">
          {totalChanges.toString()}
        </Badge>
      )}
    </InlineStack>
  );
}

/**
 * Global Save button with refresh option
 */
export interface GlobalSaveWithRefreshProps extends GlobalSaveButtonProps {
  /** Callback to refresh/reload current data */
  onRefresh?: () => Promise<void>;
  /** Whether refresh operation is in progress */
  isRefreshing?: boolean;
}

export function GlobalSaveWithRefresh({
  onRefresh,
  isRefreshing = false,
  ...saveProps
}: GlobalSaveWithRefreshProps) {
  const [refreshState, setRefreshState] = useState<'idle' | 'refreshing' | 'success'>('idle');

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;

    setRefreshState('refreshing');
    try {
      await onRefresh();
      setRefreshState('success');
      setTimeout(() => setRefreshState('idle'), 1000);
    } catch (error) {
      setRefreshState('idle');
      console.error('Refresh failed:', error);
    }
  };

  return (
    <ButtonGroup>
      <GlobalSaveButton {...saveProps} />
      <Tooltip content="Refresh to get latest data and check for conflicts">
        <Button
          icon={RefreshIcon}
          loading={refreshState === 'refreshing'}
          onClick={handleRefresh}
          tone={refreshState === 'success' ? 'success' : undefined}
          accessibilityLabel="Refresh data to check for conflicts"
        />
      </Tooltip>
    </ButtonGroup>
  );
}