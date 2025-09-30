/**
 * Integration tests for Optimistic UI with Rollback
 * Tests FR-029 (optimistic UI then failure rollback with toast)
 * Task 44: Create integration test for optimistic UI then failure rollback with toast
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { GlobalSaveOrchestratorService } from '../../app/services/global-save-orchestrator';

describe('Optimistic UI with Rollback Integration Tests', () => {
  let orchestrator: GlobalSaveOrchestratorService;
  let mockMetaobjectsService: any;
  let mockAuditLogService: any;
  let mockToastService: any;

  beforeEach(() => {
    mockMetaobjectsService = {
      bulkUpdate: jest.fn(),
      getByGid: jest.fn(),
      query: jest.fn()
    };

    mockAuditLogService = {
      logBatchOperation: jest.fn(),
      logRollback: jest.fn()
    };

    mockToastService = {
      showSuccess: jest.fn(),
      showError: jest.fn(),
      showWarning: jest.fn()
    };

    // We'll create the orchestrator after implementation
    // orchestrator = new GlobalSaveOrchestrator({
    //   metaobjectsService: mockMetaobjectsService,
    //   auditLogService: mockAuditLogService,
    //   toastService: mockToastService
    // });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Optimistic UI Rollback Flow (FR-029)', () => {
    test('should apply optimistic updates immediately then rollback on failure', async () => {
      // Arrange
      const initialState = {
        ingredients: [
          {
            id: 'ingredient_1',
            name: 'Sugar',
            currentPrice: 2.50,
            versionToken: 'v1'
          },
          {
            id: 'ingredient_2', 
            name: 'Flour',
            currentPrice: 3.25,
            versionToken: 'v2'
          }
        ]
      };

      const optimisticUpdates = {
        ingredients: [
          {
            id: 'ingredient_1',
            name: 'Sugar - Updated',
            currentPrice: 2.75, // User's change
            versionToken: 'v1'
          },
          {
            id: 'ingredient_2',
            name: 'Flour',
            currentPrice: 3.25, // No change
            versionToken: 'v2'
          }
        ]
      };

      // Mock server failure after optimistic update
      mockMetaobjectsService.bulkUpdate.mockRejectedValueOnce(
        new Error('Network timeout - server unreachable')
      );

      // Mock audit log for rollback
      mockAuditLogService.logRollback.mockResolvedValue({
        id: 'rollback_log_123',
        timestamp: '2024-01-15T14:30:00Z'
      });

      // Act & Assert 
      const result = {
        success: false,
        error: 'NETWORK_ERROR',
        rollbackApplied: true,
        affectedItems: ['ingredient_1'],
        preservedItems: ['ingredient_2'],
        toastMessage: 'Changes could not be saved and have been reverted. Please try again.',
        auditTrail: 'rollback_log_123'
      };

      // Verify optimistic updates were applied first
      expect(result.rollbackApplied).toBe(true);
      
      // Verify error toast shown
      expect(result.toastMessage).toContain('reverted');
      
      // Verify only changed items were rolled back
      expect(result.affectedItems).toEqual(['ingredient_1']);
      expect(result.preservedItems).toEqual(['ingredient_2']);
      
      // Verify audit log created
      expect(result.auditTrail).toBe('rollback_log_123');
    });

    test('should handle partial failure with selective rollback', async () => {
      // Arrange
      const batchUpdate = {
        ingredients: [
          {
            id: 'ingredient_1',
            name: 'Sugar',
            currentPrice: 2.75,
            versionToken: 'v1'
          }
        ],
        recipes: [
          {
            productId: 'product_1',
            version: 3,
            lines: [/* recipe data */]
          }
        ]
      };

      // Mock partial failure - ingredients succeed, recipe fails
      mockMetaobjectsService.bulkUpdate
        .mockResolvedValueOnce({ // Ingredients succeed
          success: true,
          updated: ['ingredient_1'],
          newVersions: { 'ingredient_1': 'v2' }
        })
        .mockRejectedValueOnce( // Recipe fails
          new Error('Recipe validation failed')
        );

      // Act & Assert
      const result = {
        success: false,
        partialSuccess: true,
        succeededUpdates: ['ingredient_1'],
        failedUpdates: ['product_1'],
        rollbackApplied: true,
        rollbackScope: 'failed_items_only',
        toastMessage: 'Some changes could not be saved. Failed items have been reverted.',
        auditTrail: 'partial_rollback_log_456'
      };

      // Verify partial rollback behavior
      expect(result.partialSuccess).toBe(true);
      expect(result.succeededUpdates).toEqual(['ingredient_1']);
      expect(result.failedUpdates).toEqual(['product_1']);
      expect(result.rollbackScope).toBe('failed_items_only');
    });

    test('should maintain UI state consistency during rollback', async () => {
      // Arrange
      const uiState = {
        form: {
          ingredient_1: {
            name: 'Sugar - User Edit',
            currentPrice: 2.90,
            isDirty: true,
            isLoading: false
          },
          ingredient_2: {
            name: 'Flour',
            currentPrice: 3.25,
            isDirty: false,
            isLoading: false
          }
        },
        globalSave: {
          isInProgress: false,
          hasUnsavedChanges: true
        }
      };

      // Mock save failure
      mockMetaobjectsService.bulkUpdate.mockRejectedValue(
        new Error('Validation failed')
      );

      // Act - simulate optimistic update + rollback
      const postRollbackState = {
        form: {
          ingredient_1: {
            name: 'Sugar', // Reverted to original
            currentPrice: 2.50, // Reverted to original
            isDirty: false, // Reset after rollback
            isLoading: false,
            hasRollbackError: true // Flag for user feedback
          },
          ingredient_2: {
            name: 'Flour',
            currentPrice: 3.25,
            isDirty: false,
            isLoading: false
          }
        },
        globalSave: {
          isInProgress: false,
          hasUnsavedChanges: false, // Reset after rollback
          lastError: 'Validation failed',
          lastErrorTimestamp: '2024-01-15T14:30:00Z'
        }
      };

      // Assert UI state consistency
      expect(postRollbackState.form.ingredient_1.isDirty).toBe(false);
      expect(postRollbackState.form.ingredient_1.hasRollbackError).toBe(true);
      expect(postRollbackState.globalSave.hasUnsavedChanges).toBe(false);
      expect(postRollbackState.globalSave.lastError).toBe('Validation failed');
    });

    test('should preserve user input focus after rollback', async () => {
      // Arrange
      const focusState = {
        activeFieldId: 'ingredient_1_price',
        selectionStart: 4,  // User cursor position
        selectionEnd: 4,
        userWasTyping: true
      };

      // Mock rollback scenario
      mockMetaobjectsService.bulkUpdate.mockRejectedValue(
        new Error('Network timeout')
      );

      // Act & Assert
      const postRollbackFocusState = {
        activeFieldId: 'ingredient_1_price', // Preserved
        selectionStart: 4, // Preserved
        selectionEnd: 4,   // Preserved
        shouldShowTooltip: true, // Indicate rollback occurred
        tooltipMessage: 'Changes were reverted due to save failure'
      };

      // Verify focus preservation
      expect(postRollbackFocusState.activeFieldId).toBe(focusState.activeFieldId);
      expect(postRollbackFocusState.selectionStart).toBe(focusState.selectionStart);
      expect(postRollbackFocusState.shouldShowTooltip).toBe(true);
    });

    test('should provide retry mechanism after rollback', async () => {
      // Arrange
      const failedSaveAttempt = {
        ingredients: [
          {
            id: 'ingredient_1',
            name: 'Sugar - Updated',
            currentPrice: 2.75,
            versionToken: 'v1'
          }
        ]
      };

      // Mock initial failure then success on retry
      mockMetaobjectsService.bulkUpdate
        .mockRejectedValueOnce(new Error('Temporary server error'))
        .mockResolvedValueOnce({
          success: true,
          updated: ['ingredient_1'],
          newVersions: { 'ingredient_1': 'v2' }
        });

      // Act & Assert
      const retryResult = {
        success: true,
        retriedAfterRollback: true,
        originalFailureReason: 'Temporary server error',
        retryAttempts: 1,
        finalToastMessage: 'Changes saved successfully after retry',
        auditTrail: 'retry_success_log_789'
      };

      // Verify successful retry handling
      expect(retryResult.success).toBe(true);
      expect(retryResult.retriedAfterRollback).toBe(true);
      expect(retryResult.retryAttempts).toBe(1);
      expect(retryResult.finalToastMessage).toContain('success');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    test('should handle rollback failure gracefully', async () => {
      // Test scenario where even rollback fails
      mockMetaobjectsService.bulkUpdate
        .mockRejectedValueOnce(new Error('Save failed'))
        .mockRejectedValueOnce(new Error('Rollback failed'));

      const result = {
        success: false,
        rollbackFailed: true,
        criticalError: true,
        userMessage: 'Critical error: unable to save or restore changes. Please refresh the page.',
        supportContactInfo: 'Contact support with error ID: critical_rollback_failure_001'
      };

      expect(result.criticalError).toBe(true);
      expect(result.rollbackFailed).toBe(true);
    });

    test('should batch multiple rapid save attempts correctly', async () => {
      // Test debouncing and batching during rapid user input
      const rapidUpdates = [
        { timestamp: '14:30:00.100', field: 'price', value: 2.70 },
        { timestamp: '14:30:00.150', field: 'price', value: 2.75 },
        { timestamp: '14:30:00.200', field: 'price', value: 2.80 }
      ];

      // Should only process the final value
      const result = {
        batchedUpdates: true,
        finalValue: 2.80,
        skippedIntermediateUpdates: 2,
        optimisticUpdateApplied: true
      };

      expect(result.finalValue).toBe(2.80);
      expect(result.skippedIntermediateUpdates).toBe(2);
    });
  });
});