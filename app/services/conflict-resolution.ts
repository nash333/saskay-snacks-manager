/**
 * Conflict Resolution Service
 * Implements FR-019, FR-032, FR-018 (conflict resolution - refresh vs override)
 * Task 39: Implement conflict resolution service
 */

import type { MetaobjectsService } from './metaobjects';
import type { AuditLogService } from './audit-log';

export interface ConflictItem {
  type: 'ingredient' | 'recipe' | 'packaging';
  id: string;
  clientVersion: string;
  currentVersion: string;
  name: string;
  lastModified?: string;
  modifiedBy?: string;
  conflictFields?: string[];
  clientData?: any;
  serverData?: any;
}

export interface ConflictDetectionResult {
  conflicts: ConflictItem[];
  nonConflicted: Array<{
    type: 'ingredient' | 'recipe' | 'packaging';
    id: string;
    clientVersion: string;
    currentVersion: string;
  }>;
}

export interface ConflictResolutionRequest {
  conflictedItems: Array<{
    type: 'ingredient' | 'recipe' | 'packaging';
    id: string;
    resolution: 'refresh' | 'override_with_client' | 'override_with_server' | 'attempt_merge';
    clientData?: any;
    serverData?: any;
    mergeStrategy?: string;
  }>;
  nonConflictedItems: Array<{
    type: 'ingredient' | 'recipe' | 'packaging';
    id: string;
    data: any;
  }>;
  userId: string;
  operationId: string;
}

export interface ConflictResolutionResult {
  resolved: Array<{
    type: string;
    id: string;
    finalData: any;
    resolutionApplied: string;
  }>;
  unresolved: Array<{
    type: string;
    id: string;
    error: string;
    reason: string;
  }>;
  auditTrail: string;
}

interface ConflictResolutionServiceDependencies {
  metaobjectsService: MetaobjectsService;
  auditLogService: AuditLogService;
}

export class ConflictResolutionService {
  constructor(private deps: ConflictResolutionServiceDependencies) {}

  /**
   * Detect version conflicts in batch operations (FR-019)
   */
  async detectBatchConflicts(batch: {
    ingredients: Array<{ id: string; versionToken: string }>;
    recipes: Array<{ productId: string; versionToken: number }>;
    packaging: Array<{ id: string; versionToken: string }>;
  }): Promise<ConflictDetectionResult> {
    const conflicts: ConflictItem[] = [];
    const nonConflicted: ConflictDetectionResult['nonConflicted'] = [];

    // Check ingredient conflicts
    for (const ingredient of batch.ingredients) {
      const currentVersion = await this.getCurrentVersion('ingredient', ingredient.id);
      
      if (currentVersion !== ingredient.versionToken) {
        const serverData = await this.deps.metaobjectsService.getByGid(ingredient.id);
        conflicts.push({
          type: 'ingredient',
          id: ingredient.id,
          clientVersion: ingredient.versionToken,
          currentVersion: currentVersion || 'unknown',
          name: serverData?.fields?.name || 'Unknown Ingredient',
          lastModified: serverData?.fields?.lastModified,
          modifiedBy: serverData?.fields?.modifiedBy,
          conflictFields: this.identifyConflictFields('ingredient', ingredient, serverData),
          serverData
        });
      } else {
        nonConflicted.push({
          type: 'ingredient',
          id: ingredient.id,
          clientVersion: ingredient.versionToken,
          currentVersion: currentVersion || ingredient.versionToken
        });
      }
    }

    // Check recipe conflicts
    for (const recipe of batch.recipes) {
      const currentVersion = await this.getCurrentVersion('recipe', recipe.productId);
      const currentVersionNum = parseInt(currentVersion || '0');
      
      if (currentVersionNum !== recipe.versionToken) {
        const serverData = await this.deps.metaobjectsService.getByGid(recipe.productId);
        conflicts.push({
          type: 'recipe',
          id: recipe.productId,
          clientVersion: recipe.versionToken.toString(),
          currentVersion: currentVersionNum.toString(),
          name: serverData?.fields?.name || 'Unknown Recipe',
          lastModified: serverData?.fields?.lastModified,
          modifiedBy: serverData?.fields?.modifiedBy,
          conflictFields: this.identifyConflictFields('recipe', recipe, serverData),
          serverData
        });
      } else {
        nonConflicted.push({
          type: 'recipe',
          id: recipe.productId,
          clientVersion: recipe.versionToken.toString(),
          currentVersion: currentVersionNum.toString()
        });
      }
    }

    // Check packaging conflicts
    for (const pkg of batch.packaging) {
      const currentVersion = await this.getCurrentVersion('packaging', pkg.id);
      
      if (currentVersion !== pkg.versionToken) {
        const serverData = await this.deps.metaobjectsService.getByGid(pkg.id);
        conflicts.push({
          type: 'packaging',
          id: pkg.id,
          clientVersion: pkg.versionToken,
          currentVersion: currentVersion || 'unknown',
          name: serverData?.fields?.type || 'Unknown Packaging',
          lastModified: serverData?.fields?.lastModified,
          modifiedBy: serverData?.fields?.modifiedBy,
          conflictFields: this.identifyConflictFields('packaging', pkg, serverData),
          serverData
        });
      } else {
        nonConflicted.push({
          type: 'packaging',
          id: pkg.id,
          clientVersion: pkg.versionToken,
          currentVersion: currentVersion || pkg.versionToken
        });
      }
    }

    return { conflicts, nonConflicted };
  }

  /**
   * Refresh conflicted items while keeping non-conflicted ones (FR-019)
   */
  async refreshConflicts(
    conflicts: ConflictItem[],
    nonConflictedData: Array<{ type: string; id: string; data: any }>,
    userId: string,
    operationId: string
  ): Promise<{
    refreshedItems: Array<{ type: string; id: string; refreshedData: any }>;
    preservedItems: Array<{ type: string; id: string; data: any }>;
    auditTrail: string;
  }> {
    const auditTrail = await this.deps.auditLogService.logBatchOperation(
      'CONFLICT_REFRESH',
      conflicts.map(c => c.id),
      {
        operationId,
        conflictCount: conflicts.length,
        preservedCount: nonConflictedData.length,
        conflictedItems: conflicts.map(c => ({ type: c.type, id: c.id, name: c.name }))
      },
      userId
    );

    // Refresh conflicted items with latest server data
    const refreshedItems = await Promise.all(
      conflicts.map(async (conflict) => {
        const refreshedData = await this.deps.metaobjectsService.getByGid(conflict.id);
        
        // Log individual refresh
        await this.deps.auditLogService.logBatchOperation(
          'CONFLICT_REFRESH',
          [conflict.id],
          {
            operationId,
            itemType: conflict.type,
            itemId: conflict.id,
            clientVersion: conflict.clientVersion,
            refreshedVersion: conflict.currentVersion
          },
          userId
        );

        return {
          type: conflict.type,
          id: conflict.id,
          refreshedData: refreshedData?.fields || {}
        };
      })
    );

    return {
      refreshedItems,
      preservedItems: nonConflictedData,
      auditTrail: auditTrail.id
    };
  }

  /**
   * Override conflicts with resolution strategy (FR-032)
   */
  async resolveConflicts(request: ConflictResolutionRequest): Promise<ConflictResolutionResult> {
    const resolved: ConflictResolutionResult['resolved'] = [];
    const unresolved: ConflictResolutionResult['unresolved'] = [];

    const auditTrail = await this.deps.auditLogService.logBatchOperation(
      'CONFLICT_OVERRIDE',
      [...request.conflictedItems.map(i => i.id), ...request.nonConflictedItems.map(i => i.id)],
      {
        operationId: request.operationId,
        conflictedItemCount: request.conflictedItems.length,
        nonConflictedItemCount: request.nonConflictedItems.length,
        resolutionStrategies: request.conflictedItems.map(item => ({
          id: item.id,
          type: item.type,
          resolution: item.resolution
        }))
      },
      request.userId
    );

    // Process conflicted items with resolution strategies
    for (const item of request.conflictedItems) {
      try {
        const resolutionResult = await this.applyResolutionStrategy(item, request.userId, request.operationId);
        resolved.push(resolutionResult);
      } catch (error) {
        unresolved.push({
          type: item.type,
          id: item.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          reason: `Failed to apply resolution strategy: ${item.resolution}`
        });
      }
    }

    // Process non-conflicted items (pass through)
    for (const item of request.nonConflictedItems) {
      resolved.push({
        type: item.type,
        id: item.id,
        finalData: item.data,
        resolutionApplied: 'no_conflict'
      });
    }

    return {
      resolved,
      unresolved,
      auditTrail: auditTrail.id
    };
  }

  /**
   * Apply specific resolution strategy to conflicted item
   */
  private async applyResolutionStrategy(
    item: ConflictResolutionRequest['conflictedItems'][0],
    userId: string,
    operationId: string
  ): Promise<{
    type: string;
    id: string;
    finalData: any;
    resolutionApplied: string;
  }> {
    let finalData: any;
    let resolutionApplied: string;

    switch (item.resolution) {
      case 'refresh':
        // Use server version
        const serverData = await this.deps.metaobjectsService.getByGid(item.id);
        finalData = serverData?.fields || {};
        resolutionApplied = 'refreshed_from_server';
        break;

      case 'override_with_client':
        // Use client version
        finalData = item.clientData || {};
        resolutionApplied = 'overridden_with_client';
        break;

      case 'override_with_server':
        // Use server version (same as refresh but explicit choice)
        const serverOverrideData = await this.deps.metaobjectsService.getByGid(item.id);
        finalData = serverOverrideData?.fields || {};
        resolutionApplied = 'overridden_with_server';
        break;

      case 'attempt_merge':
        // Attempt automatic merge
        const mergeResult = await this.attemptAutoMerge(item, item.mergeStrategy || 'default');
        finalData = mergeResult.mergedData;
        resolutionApplied = mergeResult.success ? 'auto_merged' : 'merge_failed';
        
        if (!mergeResult.success) {
          throw new Error(`Auto-merge failed: ${mergeResult.reason}`);
        }
        break;

      default:
        throw new Error(`Unknown resolution strategy: ${item.resolution}`);
    }

    // Log resolution decision
    await this.deps.auditLogService.logBatchOperation(
      'CONFLICT_OVERRIDE',
      [item.id],
      {
        operationId,
        itemType: item.type,
        itemId: item.id,
        resolution: item.resolution,
        resolutionApplied,
        hasClientData: !!item.clientData,
        hasServerData: !!item.serverData
      },
      userId
    );

    return {
      type: item.type,
      id: item.id,
      finalData,
      resolutionApplied
    };
  }

  /**
   * Attempt automatic merge of conflicted data
   */
  private async attemptAutoMerge(
    item: ConflictResolutionRequest['conflictedItems'][0],
    strategy: string
  ): Promise<{
    success: boolean;
    mergedData?: any;
    reason?: string;
  }> {
    if (!item.clientData || !item.serverData) {
      return {
        success: false,
        reason: 'Missing client or server data for merge'
      };
    }

    try {
      switch (item.type) {
        case 'ingredient':
          return this.mergeIngredientData(item.clientData, item.serverData, strategy);
        
        case 'recipe':
          return this.mergeRecipeData(item.clientData, item.serverData, strategy);
          
        case 'packaging':
          return this.mergePackagingData(item.clientData, item.serverData, strategy);
          
        default:
          return {
            success: false,
            reason: `No merge strategy for type: ${item.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : 'Merge operation failed'
      };
    }
  }

  /**
   * Merge ingredient data using specified strategy
   */
  private mergeIngredientData(
    clientData: any,
    serverData: any,
    strategy: string
  ): { success: boolean; mergedData?: any; reason?: string } {
    const merged = { ...serverData };

    // Use most recent price (higher timestamp wins)
    const clientPrice = parseFloat(clientData.currentPrice || '0');
    const serverPrice = parseFloat(serverData.currentPrice || '0');
    
    if (clientData.priceUpdatedAt && serverData.priceUpdatedAt) {
      const clientTime = new Date(clientData.priceUpdatedAt).getTime();
      const serverTime = new Date(serverData.priceUpdatedAt).getTime();
      
      if (clientTime > serverTime) {
        merged.currentPrice = clientPrice;
        merged.previousPrice = serverPrice;
      }
    } else {
      // Fallback: use non-zero price
      merged.currentPrice = clientPrice || serverPrice;
    }

    // Merge flags conservatively (active=true wins, complimentary=false wins)
    merged.activeFlag = clientData.activeFlag || serverData.activeFlag;
    merged.complimentaryFlag = clientData.complimentaryFlag && serverData.complimentaryFlag;

    return {
      success: true,
      mergedData: merged
    };
  }

  /**
   * Merge recipe data using specified strategy
   */
  private mergeRecipeData(
    clientData: any,
    serverData: any,
    strategy: string
  ): { success: boolean; mergedData?: any; reason?: string } {
    if (strategy === 'union_ingredients') {
      // Union of all ingredient lines (no duplicates)
      const clientLines = clientData.lines || [];
      const serverLines = serverData.lines || [];
      
      const mergedLines = [...serverLines];
      const serverIngredients = new Set(serverLines.map((line: any) => line.ingredientId));
      
      for (const clientLine of clientLines) {
        if (!serverIngredients.has(clientLine.ingredientId)) {
          mergedLines.push(clientLine);
        }
      }
      
      return {
        success: true,
        mergedData: {
          ...serverData,
          lines: mergedLines
        }
      };
    }

    return {
      success: false,
      reason: `Unknown recipe merge strategy: ${strategy}`
    };
  }

  /**
   * Merge packaging data using specified strategy
   */
  private mergePackagingData(
    clientData: any,
    serverData: any,
    strategy: string
  ): { success: boolean; mergedData?: any; reason?: string } {
    // Simple merge - use client cost if more recent
    const merged = { ...serverData };
    
    if (clientData.unitCost && parseFloat(clientData.unitCost) > 0) {
      merged.unitCost = clientData.unitCost;
    }

    return {
      success: true,
      mergedData: merged
    };
  }

  /**
   * Get current version token for entity
   */
  private async getCurrentVersion(type: string, id: string): Promise<string | null> {
    try {
      const entity = await this.deps.metaobjectsService.getByGid(id);
      
      if (type === 'recipe') {
        return entity?.fields?.version?.toString() || null;
      } else {
        return entity?.fields?.versionToken || null;
      }
    } catch (error) {
      console.warn(`Failed to get current version for ${type} ${id}:`, error);
      return null;
    }
  }

  /**
   * Identify which fields are in conflict
   */
  private identifyConflictFields(type: string, clientItem: any, serverItem: any): string[] {
    if (!serverItem?.fields) return [];

    const conflictFields: string[] = [];
    const serverFields = serverItem.fields;

    switch (type) {
      case 'ingredient':
        if (clientItem.name !== serverFields.name) conflictFields.push('name');
        if (clientItem.currentPrice !== parseFloat(serverFields.currentPrice || '0')) conflictFields.push('currentPrice');
        if (clientItem.complimentaryFlag !== (serverFields.complimentaryFlag === 'true')) conflictFields.push('complimentaryFlag');
        if (clientItem.activeFlag !== (serverFields.activeFlag === 'true')) conflictFields.push('activeFlag');
        break;
        
      case 'recipe':
        if (clientItem.version !== parseInt(serverFields.version || '0')) conflictFields.push('version');
        // Line comparison would need deeper analysis
        break;
        
      case 'packaging':
        if (clientItem.unitCost !== parseFloat(serverFields.unitCost || '0')) conflictFields.push('unitCost');
        if (clientItem.type !== serverFields.type) conflictFields.push('type');
        break;
    }

    return conflictFields;
  }
}