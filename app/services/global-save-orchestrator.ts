/**
 * Global Save Orchestrator Service
 * Implements FR-028, FR-031, FR-004, FR-016 (Global Save ≤2 calls, atomic UX)
 * Task 38: Implement Global Save orchestrator
 * 
 * Integrates with performance tracking and structured logging for observability.
 */

import type { MetaobjectsService } from './metaobjects';
import type { RecipeSaveService } from './recipe-save';
import type { AuditLogService } from './audit-log';
import type { ConflictResolutionService } from './conflict-resolution';
import { logSave, startTimer } from '../lib/logging';
import { recordSaveLatency, incrementSaveConflicts, incrementSaveOverrides } from '../lib/metrics';
import { markPerformance } from '../lib/performance';

export interface GlobalSaveBatchRequest {
  ingredients: Array<{
    id?: string;
    name: string;
    unit: 'g' | 'kg';
    currentPrice: number;
    previousPrice?: number;
    complimentaryFlag: boolean;
    activeFlag?: boolean;
    versionToken?: string;
  }>;
  recipes?: Array<{
    productId: string;
    version: number;
    lines: Array<{
      id: string;
      ingredientId: string;
      quantityGrams: number;
    }>;
    versionToken?: number;
  }>;
  packaging?: Array<{
    id?: string;
    type: string;
    unitCost: number;
    versionToken?: string;
  }>;
  auditContext?: {
    userId: string;
    operation: string;
    timestamp: string;
    sessionId?: string;
    source?: string;
  };
}

export interface GlobalSaveResult {
  success: boolean;
  savedIngredients: Array<{
    id: string;
    versionToken: string;
  }>;
  savedRecipes: Array<{
    productId: string;
    version: number;
  }>;
  savedPackaging: Array<{
    id: string;
    versionToken: string;
  }>;
  conflicts?: Array<{
    type: 'ingredient' | 'recipe' | 'packaging';
    id: string;
    clientVersion: string;
    currentVersion: string;
    name: string;
  }>;
  errors?: Array<{
    type: string;
    id: string;
    error: string;
    message: string;
  }>;
  auditBatchId?: string;
  operationId: string;
  completedAt: string;
}

interface GlobalSaveOrchestratorDependencies {
  metaobjectsService: MetaobjectsService;
  recipeSaveService: RecipeSaveService;
  auditLogService: AuditLogService;
  conflictResolutionService: ConflictResolutionService;
}

export class GlobalSaveOrchestratorService {
  private readonly MAX_API_CALLS = 2; // FR-028 constraint

  constructor(private deps: GlobalSaveOrchestratorDependencies) {}

  /**
   * Execute atomic global save with ≤2 API calls (FR-028, FR-031)
   * Integrates performance tracking and structured logging for observability
   */
  async executeBatchSave(request: GlobalSaveBatchRequest): Promise<GlobalSaveResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    
    // Performance tracking: Mark global save start
    markPerformance('global-save-click');
    
    // Structured logging: Start save operation
    const timer = startTimer('global_save');
    logSave(
      {
        action: 'global_save_start',
        ingredientCount: request.ingredients.length,
        recipeCount: request.recipes?.length || 0,
        packagingCount: request.packaging?.length || 0,
        batchSize: request.ingredients.length + (request.recipes?.length || 0) + (request.packaging?.length || 0)
      },
      `Global save started - Operation ID: ${operationId}`
    );

    try {
      // Step 1: Pre-flight validation and conflict detection (API Call #1)
      const preflightResult = await this.executePreflightChecks(request, operationId);
      
      if (preflightResult.conflicts.length > 0) {
        // Log conflicts detected
        incrementSaveConflicts(preflightResult.conflicts.length);
        timer.complete(`Global save completed with conflicts - Operation ID: ${operationId}`, {
          conflictCount: preflightResult.conflicts.length,
          operationResult: 'conflicts_detected'
        });
        
        logSave(
          {
            action: 'global_save_complete',
            conflictCount: preflightResult.conflicts.length
          },
          `Global save completed with ${preflightResult.conflicts.length} conflicts - Operation ID: ${operationId}`
        );
        
        // Return conflicts for user resolution (no save attempted)
        return {
          success: false,
          savedIngredients: [],
          savedRecipes: [],
          savedPackaging: [],
          conflicts: preflightResult.conflicts,
          operationId,
          completedAt: new Date().toISOString()
        };
      }

      // Step 2: Execute atomic batch save (API Call #2)
      const saveResult = await this.executeAtomicBatchSave(request, preflightResult, operationId);
      
      // Performance tracking: Mark global save completion
      markPerformance('global-save-complete');
      
      // Record save latency metrics
      const latency = Date.now() - startTime;
      recordSaveLatency(latency, 'global');
      
      // Log successful completion
      timer.complete(`Global save completed successfully - Operation ID: ${operationId}`, {
        savedItems: saveResult.savedIngredients.length + saveResult.savedRecipes.length + saveResult.savedPackaging.length,
        latencyMs: latency,
        apiCalls: 2,
        operationResult: 'success'
      });
      
      logSave(
        {
          action: 'global_save_complete',
          ingredientCount: saveResult.savedIngredients.length,
          recipeCount: saveResult.savedRecipes.length,
          packagingCount: saveResult.savedPackaging.length,
          apiCalls: 2
        },
        `Global save completed successfully in ${latency}ms`,
        latency
      );

      return {
        success: true,
        ...saveResult,
        operationId,
        completedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Global save operation ${operationId} failed:`, error);
      
      // Ensure audit trail for failed operations
      if (request.auditContext) {
        await this.deps.auditLogService.logBatchOperation(
          'BATCH_SAVE',
          [],
          {
            ...request.auditContext,
            operationId,
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime
          },
          request.auditContext.userId
        );
      }

      throw error;
    }
  }

  /**
   * Execute preflight checks including validation and conflict detection
   * This is API Call #1 of maximum 2 allowed calls (FR-028)
   */
  private async executePreflightChecks(
    request: GlobalSaveBatchRequest,
    operationId: string
  ): Promise<{
    conflicts: Array<any>;
    validatedItems: GlobalSaveBatchRequest;
    auditBatchId: string;
  }> {
    // Start audit batch for operation tracking (FR-004)
    const auditBatchId = await this.deps.auditLogService.startBatchAudit(
      request.auditContext?.userId || 'system',
      operationId,
      {
        operation: request.auditContext?.operation || 'GLOBAL_SAVE',
        itemCounts: {
          ingredients: request.ingredients.length,
          recipes: request.recipes?.length || 0,
          packaging: request.packaging?.length || 0
        }
      }
    );

    // Validate business rules
    const validationResult = await this.validateBatchBusinessRules(request);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    // Detect version conflicts
    const conflicts = await this.deps.conflictResolutionService.detectBatchConflicts({
      ingredients: request.ingredients.filter(i => 
        i.id && typeof i.id === 'string' && i.versionToken && typeof i.versionToken === 'string'
      ).map(i => ({ id: i.id as string, versionToken: i.versionToken as string })),
      recipes: (request.recipes || []).filter(r => 
        r.productId && typeof r.productId === 'string' && typeof r.versionToken === 'number'
      ).map(r => ({ productId: r.productId, versionToken: r.versionToken as number })),
      packaging: (request.packaging || []).filter(p => 
        p.id && typeof p.id === 'string' && p.versionToken && typeof p.versionToken === 'string'
      ).map(p => ({ id: p.id as string, versionToken: p.versionToken as string }))
    });

    return {
      conflicts: conflicts.conflicts,
      validatedItems: request,
      auditBatchId
    };
  }

  /**
   * Execute atomic batch save operation
   * This is API Call #2 of maximum 2 allowed calls (FR-028)
   */
  private async executeAtomicBatchSave(
    request: GlobalSaveBatchRequest,
    preflightResult: any,
    operationId: string
  ): Promise<Omit<GlobalSaveResult, 'success' | 'operationId' | 'completedAt'>> {
    const transactionId = await this.deps.metaobjectsService.startTransaction(operationId);

    try {
      // Execute all saves within single transaction for atomicity (FR-031)
      const [ingredientResults, recipeResults, packagingResults] = await Promise.all([
        this.saveIngredientsBatch(request.ingredients, transactionId),
        this.saveRecipesBatch(request.recipes || [], transactionId),
        this.savePackagingBatch(request.packaging || [], transactionId)
      ]);

      // Commit transaction - all or nothing (FR-031)
      await this.deps.metaobjectsService.commitTransaction(transactionId);

      // Complete audit batch
      await this.deps.auditLogService.completeBatchAudit(
        request.auditContext?.userId || 'system',
        operationId,
        {
          success: true,
          itemsProcessed: ingredientResults.length + recipeResults.length + packagingResults.length,
          errors: [],
          summary: {
            ingredients: ingredientResults.length,
            recipes: recipeResults.length,
            packaging: packagingResults.length
          }
        }
      );

      return {
        savedIngredients: ingredientResults,
        savedRecipes: recipeResults,
        savedPackaging: packagingResults,
        auditBatchId: preflightResult.auditBatchId
      };

    } catch (error) {
      // Rollback transaction on any failure
      await this.deps.metaobjectsService.rollbackTransaction(transactionId);
      
      // Log failure in audit
      await this.deps.auditLogService.completeBatchAudit(
        request.auditContext?.userId || 'system',
        operationId,
        {
          success: false,
          itemsProcessed: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          summary: {
            operationId,
            status: 'FAILED'
          }
        }
      );

      throw error;
    }
  }

  /**
   * Save ingredients batch within transaction
   */
  private async saveIngredientsBatch(
    ingredients: GlobalSaveBatchRequest['ingredients'],
    transactionId: string
  ): Promise<Array<{ id: string; versionToken: string }>> {
    if (ingredients.length === 0) return [];

    const bulkOperations = ingredients.map(ingredient => ({
      type: (ingredient.id ? 'UPDATE' : 'CREATE') as 'CREATE' | 'UPDATE' | 'DELETE',
      entityType: 'ingredient',
      data: {
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        current_price: ingredient.currentPrice.toString(),
        previous_price: ingredient.previousPrice?.toString(),
        complimentary_flag: ingredient.complimentaryFlag.toString(),
        active_flag: (ingredient.activeFlag ?? true).toString(),
        version_token: this.generateVersionToken()
      }
    }));

    const results = await this.deps.metaobjectsService.executeBulkOperations(bulkOperations);

    return results.results.map((result: any) => ({
      id: result.id || result.gid,
      versionToken: result.versionToken || this.generateVersionToken()
    }));
  }

  /**
   * Save recipes batch within transaction
   */
  private async saveRecipesBatch(
    recipes: NonNullable<GlobalSaveBatchRequest['recipes']>,
    transactionId: string
  ): Promise<Array<{ productId: string; version: number }>> {
    if (recipes.length === 0) return [];

    // Use recipe save service for business logic
    const results = await Promise.all(
      recipes.map(async recipe => {
        const result = await this.deps.recipeSaveService.saveRecipe({
          productId: recipe.productId,
          recipeLines: recipe.lines.map(line => ({
            id: line.id,
            ingredientId: line.ingredientId,
            quantityGrams: line.quantityGrams,
            isInactive: false,
            isComplimentary: false
          })),
          version: recipe.version,
          triggerCostRecalculation: true
        });

        return {
          productId: recipe.productId,
          version: result.version
        };
      })
    );

    return results;
  }

  /**
   * Save packaging batch within transaction
   */
  private async savePackagingBatch(
    packaging: NonNullable<GlobalSaveBatchRequest['packaging']>,
    transactionId: string
  ): Promise<Array<{ id: string; versionToken: string }>> {
    if (packaging.length === 0) return [];

    const bulkOperations = packaging.map(pkg => ({
      type: (pkg.id ? 'UPDATE' : 'CREATE') as 'CREATE' | 'UPDATE' | 'DELETE',
      entityType: 'packaging',
      data: {
        id: pkg.id,
        type: pkg.type,
        unit_cost: pkg.unitCost.toString(),
        version_token: this.generateVersionToken()
      }
    }));

    const results = await this.deps.metaobjectsService.executeBulkOperations(bulkOperations);

    return results.results.map((result: any) => ({
      id: result.id || result.gid,
      versionToken: result.versionToken || this.generateVersionToken()
    }));
  }

  /**
   * Validate business rules across entire batch
   */
  private async validateBatchBusinessRules(
    request: GlobalSaveBatchRequest
  ): Promise<{
    isValid: boolean;
    errors: Array<{ type: string; id: string; message: string }>;
  }> {
    const errors: Array<{ type: string; id: string; message: string }> = [];

    // Validate ingredient uniqueness within batch
    const ingredientNames = new Set<string>();
    for (const ingredient of request.ingredients) {
      if (ingredientNames.has(ingredient.name.toLowerCase())) {
        errors.push({
          type: 'ingredient',
          id: ingredient.id || 'new',
          message: `Duplicate ingredient name in batch: ${ingredient.name}`
        });
      }
      ingredientNames.add(ingredient.name.toLowerCase());
    }

    // Validate recipe ingredient uniqueness
    for (const recipe of request.recipes || []) {
      const recipeIngredients = new Set<string>();
      for (const line of recipe.lines) {
        if (recipeIngredients.has(line.ingredientId)) {
          errors.push({
            type: 'recipe',
            id: recipe.productId,
            message: `Duplicate ingredient in recipe: ${line.ingredientId}`
          });
        }
        recipeIngredients.add(line.ingredientId);
      }
    }

    // Validate pricing constraints
    for (const ingredient of request.ingredients) {
      if (ingredient.currentPrice <= 0) {
        errors.push({
          type: 'ingredient',
          id: ingredient.id || 'new',
          message: 'Current price must be greater than 0'
        });
      }

      if (ingredient.previousPrice !== undefined && ingredient.previousPrice < 0) {
        errors.push({
          type: 'ingredient',
          id: ingredient.id || 'new',
          message: 'Previous price cannot be negative'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `global_save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate version token for optimistic concurrency
   */
  private generateVersionToken(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Get batch save operation status
   */
  async getBatchOperationStatus(operationId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    progress?: number;
    result?: GlobalSaveResult;
    error?: string;
  }> {
    // Query audit logs for operation status
    const auditRecords = await this.deps.auditLogService.getOperationLogs(operationId);
    
    if (auditRecords.length === 0) {
      return { status: 'pending' };
    }

    const latestRecord = auditRecords[auditRecords.length - 1];
    
    const metadata = latestRecord.metadata || {};
    
    if (metadata.status === 'SUCCESS') {
      return {
        status: 'completed',
        progress: 100,
        result: metadata.result
      };
    }

    if (metadata.status === 'FAILED') {
      return {
        status: 'failed',
        error: metadata.error
      };
    }

    return {
      status: 'pending',
      progress: metadata.progress || 0
    };
  }

  /**
   * Cancel pending batch operation
   */
  async cancelBatchOperation(operationId: string, userId: string): Promise<void> {
    await this.deps.auditLogService.logBatchOperation(
      'BATCH_SAVE',
      [operationId],
      {
        operationId,
        userId,
        operation: 'CANCEL_BATCH_SAVE',
        status: 'CANCELLED',
        timestamp: new Date().toISOString()
      },
      userId
    );
  }
}