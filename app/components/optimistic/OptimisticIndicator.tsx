/**
 * Optimistic UI Indicator Component
 * Task 45: Implement optimistic update + rollback
 * Provides visual feedback for optimistic UI states
 */

import React from 'react';
import { Banner, Button, Icon, Text, Badge } from '@shopify/polaris';
import { SaveIcon, UndoIcon, AlertTriangleIcon } from '@shopify/polaris-icons';
import { useOptimisticStatus } from '../../hooks/useOptimistic';
import type { OptimisticUIService } from '../../services/optimistic-ui';

export interface OptimisticIndicatorProps {
  optimisticService: OptimisticUIService;
  position?: 'top' | 'bottom' | 'floating';
  showItemCount?: boolean;
  allowManualCommit?: boolean;
  allowManualRollback?: boolean;
  compact?: boolean;
}

/**
 * Shows global optimistic UI status and provides commit/rollback actions
 */
export function OptimisticIndicator({
  optimisticService,
  position = 'top',
  showItemCount = true,
  allowManualCommit = true,
  allowManualRollback = true,
  compact = false
}: OptimisticIndicatorProps) {
  const {
    hasOptimisticChanges,
    optimisticItemCount,
    commitAllChanges,
    rollbackAllChanges
  } = useOptimisticStatus(optimisticService);

  if (!hasOptimisticChanges) {
    return null;
  }

  const itemText = showItemCount
    ? `${optimisticItemCount} ${optimisticItemCount === 1 ? 'item' : 'items'} pending`
    : 'Changes pending';

  if (compact) {
    return (
      <div style={{
        position: position === 'floating' ? 'fixed' : 'relative',
        top: position === 'floating' ? '20px' : undefined,
        right: position === 'floating' ? '20px' : undefined,
        zIndex: position === 'floating' ? 1000 : undefined,
        marginBottom: position === 'bottom' ? 0 : '16px'
      }}>
        <Badge tone="attention">
          {itemText}
        </Badge>
      </div>
    );
  }

  return (
    <div style={{
      position: position === 'floating' ? 'fixed' : 'relative',
      top: position === 'floating' ? '20px' : undefined,
      right: position === 'floating' ? '20px' : undefined,
      left: position === 'floating' ? '20px' : undefined,
      zIndex: position === 'floating' ? 1000 : undefined,
      marginBottom: position === 'bottom' ? 0 : '16px'
    }}>
      <Banner
        title="Unsaved Changes"
        tone="warning"
        action={allowManualCommit ? {
          content: 'Save All',
          onAction: commitAllChanges
        } : undefined}
        secondaryAction={allowManualRollback ? {
          content: 'Discard All',
          onAction: rollbackAllChanges
        } : undefined}
      >
        <Text as="p">
          You have {itemText}. These changes will be automatically saved or you can save/discard them manually.
        </Text>
      </Banner>
    </div>
  );
}

/**
 * Item-level optimistic UI indicator for individual components
 */
export interface OptimisticItemIndicatorProps {
  isOptimistic: boolean;
  onCommit?: () => Promise<boolean>;
  onRollback?: () => Promise<void>;
  showActions?: boolean;
  inline?: boolean;
  size?: 'small' | 'medium';
}

export function OptimisticItemIndicator({
  isOptimistic,
  onCommit,
  onRollback,
  showActions = true,
  inline = false,
  size = 'small'
}: OptimisticItemIndicatorProps) {
  if (!isOptimistic) {
    return null;
  }

  const handleCommit = async () => {
    if (onCommit) {
      await onCommit();
    }
  };

  const handleRollback = async () => {
    if (onRollback) {
      await onRollback();
    }
  };

  if (inline) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '4px 8px',
        backgroundColor: '#FFF7ED',
        border: '1px solid #FBBF24',
        borderRadius: '4px',
        fontSize: size === 'small' ? '12px' : '14px'
      }}>
        <Icon source={AlertTriangleIcon} tone="warning" />
        <Text variant="bodySm" as="span">
          Pending changes
        </Text>
        {showActions && (
          <>
            <Button
              size="micro"
              onClick={handleCommit}
              disabled={!onCommit}
              icon={SaveIcon}
            >
              Save
            </Button>
            <Button
              size="micro"
              onClick={handleRollback}
              disabled={!onRollback}
              icon={UndoIcon}
              variant="plain"
            >
              Undo
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <Banner
      title="Unsaved Changes"
      tone="warning"
      action={showActions && onCommit ? {
        content: 'Save',
        onAction: handleCommit
      } : undefined}
      secondaryAction={showActions && onRollback ? {
        content: 'Undo',
        onAction: handleRollback
      } : undefined}
    >
      <Text as="p">
        This item has unsaved changes that will be automatically saved.
      </Text>
    </Banner>
  );
}

/**
 * Loading state component for optimistic operations
 */
export interface OptimisticLoadingProps {
  isCommitting?: boolean;
  isRollingBack?: boolean;
  operationId?: string;
  itemCount?: number;
}

export function OptimisticLoading({
  isCommitting = false,
  isRollingBack = false,
  operationId,
  itemCount = 0
}: OptimisticLoadingProps) {
  if (!isCommitting && !isRollingBack) {
    return null;
  }

  const operation = isCommitting ? 'Saving' : 'Discarding';
  const itemText = itemCount > 0 
    ? ` ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`
    : ' changes';

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 2000,
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '200px'
    }}>
      <div style={{
        width: '20px',
        height: '20px',
        border: '2px solid #E1E3E5',
        borderTop: '2px solid #006FBB',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <Text variant="bodyMd" as="p">
        {operation}{itemText}...
      </Text>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
}

/**
 * Hook for managing optimistic loading states
 */
export function useOptimisticLoading() {
  const [isCommitting, setIsCommitting] = React.useState(false);
  const [isRollingBack, setIsRollingBack] = React.useState(false);
  const [operationId, setOperationId] = React.useState<string | null>(null);

  const startCommitting = (opId?: string) => {
    setIsCommitting(true);
    setOperationId(opId || null);
  };

  const startRollingBack = (opId?: string) => {
    setIsRollingBack(true);
    setOperationId(opId || null);
  };

  const stopLoading = () => {
    setIsCommitting(false);
    setIsRollingBack(false);
    setOperationId(null);
  };

  return {
    isCommitting,
    isRollingBack,
    operationId,
    startCommitting,
    startRollingBack,
    stopLoading
  };
}