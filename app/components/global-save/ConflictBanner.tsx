/**
 * Conflict Banner Component
 * Task 50: Implement Global Save button & conflict banner UI components
 * Implements FR-019, FR-028, FR-031, FR-032
 */

import React, { useState } from 'react';
import {
  Banner,
  Button,
  ButtonGroup,
  InlineStack,
  BlockStack,
  Text,
  Badge,
  Collapsible,
  Card,
  DataTable,
  Link,
  Icon,
  Tooltip
} from '@shopify/polaris';
import {
  RefreshIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  EditIcon
} from '@shopify/polaris-icons';
import type { GlobalSaveResult } from '../../services/global-save-orchestrator';
import type { ConflictItem } from '../../services/conflict-resolution';

export interface ConflictBannerProps {
  /** List of conflicts detected during save operation */
  conflicts: NonNullable<GlobalSaveResult['conflicts']>;
  /** Callback when user chooses to refresh conflicts */
  onRefreshConflicts: () => Promise<void>;
  /** Callback when user chooses to override all conflicts */
  onOverrideAll: () => Promise<void>;
  /** Whether refresh operation is in progress */
  isRefreshing?: boolean;
  /** Whether override operation is in progress */
  isOverriding?: boolean;
  /** Show detailed conflict information */
  showDetails?: boolean;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
  /** Additional context for conflicts */
  operationId?: string;
}

/**
 * Conflict Banner component implementing FR-019 conflict resolution UX
 */
export function ConflictBanner({
  conflicts,
  onRefreshConflicts,
  onOverrideAll,
  isRefreshing = false,
  isOverriding = false,
  showDetails = true,
  onDismiss,
  operationId
}: ConflictBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set());

  // Group conflicts by type
  const conflictsByType = conflicts.reduce((acc, conflict) => {
    if (!acc[conflict.type]) acc[conflict.type] = [];
    acc[conflict.type].push(conflict);
    return acc;
  }, {} as Record<string, typeof conflicts>);

  // Handle individual conflict selection
  const toggleConflictSelection = (conflictId: string) => {
    const newSelection = new Set(selectedConflicts);
    if (newSelection.has(conflictId)) {
      newSelection.delete(conflictId);
    } else {
      newSelection.add(conflictId);
    }
    setSelectedConflicts(newSelection);
  };

  // Select all conflicts
  const selectAllConflicts = () => {
    setSelectedConflicts(new Set(conflicts.map(c => c.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedConflicts(new Set());
  };

  // Handle refresh conflicts
  const handleRefresh = async () => {
    try {
      await onRefreshConflicts();
    } catch (error) {
      console.error('Failed to refresh conflicts:', error);
    }
  };

  // Handle override all
  const handleOverride = async () => {
    try {
      await onOverrideAll();
    } catch (error) {
      console.error('Failed to override conflicts:', error);
    }
  };

  // Create conflict table data
  const conflictTableData = conflicts.map(conflict => [
    <Badge tone="warning" key={`type-${conflict.id}`}>
      {conflict.type}
    </Badge>,
    <Text variant="bodyMd" as="span" key={`name-${conflict.id}`}>
      {conflict.name}
    </Text>,
    <InlineStack gap="100" key={`versions-${conflict.id}`}>
      <Tooltip content="Your version">
        <Badge tone="info" size="small">
          {conflict.clientVersion}
        </Badge>
      </Tooltip>
      <Icon source={ChevronDownIcon} />
      <Tooltip content="Current server version">
        <Badge tone="critical" size="small">
          {conflict.currentVersion}
        </Badge>
      </Tooltip>
    </InlineStack>,
    <Text variant="bodyMd" tone="subdued" as="span" key={`modified-${conflict.id}`}>
      <Icon source={ClockIcon} />
      Recently modified
    </Text>
  ]);

  const conflictTableHeaders = ['Type', 'Item', 'Version Conflict', 'Last Modified'];

  return (
    <Banner
      title="Version Conflicts Detected"
      tone="warning"
      onDismiss={onDismiss}
      icon={AlertTriangleIcon}
    >
      <BlockStack gap="300">
        <Text variant="bodyMd" as="p">
          {conflicts.length} item{conflicts.length !== 1 ? 's' : ''} {conflicts.length === 1 ? 'has' : 'have'} been modified since you started editing. 
          Choose how to resolve these conflicts:
        </Text>

        {/* Conflict Summary */}
        <InlineStack gap="200" wrap={false}>
          {Object.entries(conflictsByType).map(([type, typeConflicts]) => (
            <Badge key={type} tone="warning">
              {`${typeConflicts.length} ${type}${typeConflicts.length !== 1 ? 's' : ''}`}
            </Badge>
          ))}
          {operationId && (
            <Badge tone="info" size="small">
              {`Operation: ${operationId.slice(-8)}`}
            </Badge>
          )}
        </InlineStack>

        {/* Action Buttons */}
        <ButtonGroup>
          <Button
            icon={RefreshIcon}
            loading={isRefreshing}
            onClick={handleRefresh}
            accessibilityLabel="Refresh to get latest versions and discard your changes for conflicted items"
          >
            Refresh Conflicts
          </Button>
          <Button
            icon={EditIcon}
            loading={isOverriding}
            tone="critical"
            onClick={handleOverride}
            accessibilityLabel="Override with your changes and create audit trail"
          >
            Override All
          </Button>
          {showDetails && (
            <Button
              icon={isExpanded ? ChevronUpIcon : ChevronDownIcon}
              onClick={() => setIsExpanded(!isExpanded)}
              accessibilityLabel="Toggle conflict details"
            >
              {isExpanded ? 'Hide' : 'Show'} Details
            </Button>
          )}
        </ButtonGroup>

        {/* Detailed Conflict Information */}
        {showDetails && (
          <Collapsible open={isExpanded} id="conflict-details">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">
                  Conflict Details
                </Text>
                
                <Text variant="bodyMd" tone="subdued" as="p">
                  These items have been modified by someone else while you were editing. 
                  Review the version differences below:
                </Text>

                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text']}
                  headings={conflictTableHeaders}
                  rows={conflictTableData}
                  footerContent={
                    <Text variant="bodyMd" tone="subdued" as="p">
                      {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} found
                    </Text>
                  }
                />

                {/* Resolution Strategy Explanation */}
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h4">
                    Resolution Options
                  </Text>
                  
                  <BlockStack gap="100">
                    <InlineStack gap="200">
                      <Icon source={RefreshIcon} />
                      <BlockStack gap="100">
                        <Text variant="bodyMd" as="span" fontWeight="medium">
                          Refresh Conflicts
                        </Text>
                        <Text variant="bodyMd" tone="subdued" as="span">
                          Discard your changes for conflicted items and use the current server versions. 
                          Non-conflicted items will be preserved.
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    
                    <InlineStack gap="200">
                      <Icon source={EditIcon} />
                      <BlockStack gap="100">
                        <Text variant="bodyMd" as="span" fontWeight="medium">
                          Override All
                        </Text>
                        <Text variant="bodyMd" tone="subdued" as="span">
                          Force save your changes and override the server versions. 
                          Creates an audit trail for compliance (FR-018).
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Collapsible>
        )}

        {/* Helper Text */}
        <Text variant="bodyMd" tone="subdued" as="p">
          <strong>Tip:</strong> Refresh Conflicts is usually the safer option. 
          Use Override All only when you're certain your changes should take precedence.
        </Text>
      </BlockStack>
    </Banner>
  );
}

/**
 * Simplified conflict banner for mobile/compact views
 */
export interface CompactConflictBannerProps extends Omit<ConflictBannerProps, 'showDetails'> {
  /** Show only essential information */
  minimal?: boolean;
}

export function CompactConflictBanner({
  conflicts,
  onRefreshConflicts,
  onOverrideAll,
  isRefreshing = false,
  isOverriding = false,
  minimal = false,
  ...props
}: CompactConflictBannerProps) {
  return (
    <Banner
      title={`${conflicts.length} Conflict${conflicts.length !== 1 ? 's' : ''}`}
      tone="warning"
      onDismiss={props.onDismiss}
    >
      <BlockStack gap="200">
        {!minimal && (
          <Text variant="bodyMd" as="p">
            Items modified while editing. Choose resolution:
          </Text>
        )}
        
        <ButtonGroup>
          <Button
            size="slim"
            icon={RefreshIcon}
            loading={isRefreshing}
            onClick={onRefreshConflicts}
          >
            Refresh
          </Button>
          <Button
            size="slim"
            icon={EditIcon}
            loading={isOverriding}
            tone="critical"
            onClick={onOverrideAll}
          >
            Override
          </Button>
        </ButtonGroup>
      </BlockStack>
    </Banner>
  );
}

/**
 * Conflict notification toast alternative
 */
export interface ConflictToastProps {
  conflicts: NonNullable<GlobalSaveResult['conflicts']>;
  onAction: (action: 'refresh' | 'override' | 'details') => void;
}

export function ConflictToast({ conflicts, onAction }: ConflictToastProps) {
  return {
    content: `${conflicts.length} version conflict${conflicts.length !== 1 ? 's' : ''} detected`,
    action: {
      content: 'Resolve',
      onAction: () => onAction('details')
    },
    duration: 10000, // 10 seconds
    error: false
  };
}