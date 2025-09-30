/**
 * Soft Delete Service (Task 21)
 * Implements soft delete/inactivation logic with filtering and ordering (FR-027, FR-033)
 */

export interface SoftDeleteEntity {
  id: string;
  isActive: boolean;
  deletedAt: string | null;
  versionToken: string;
}

export interface SoftDeleteOptions {
  includeInactive?: boolean;
  orderInactiveLast?: boolean;
  reason?: string;
  userId?: string;
}

export interface RestoreOptions {
  reason?: string;
  userId?: string;
  resetVersion?: boolean;
}

export interface SoftDeleteResult {
  success: boolean;
  entity: any;
  auditEntryId: string;
  message: string;
}

export interface SoftDeleteQuery<T> {
  entities: T[];
  options: SoftDeleteOptions;
}

/**
 * Soft Delete Service Implementation
 */
export class SoftDeleteService {
  private metaobjects: any;
  private auditLog: any;

  constructor(metaobjectsService: any, auditLogService: any) {
    this.metaobjects = metaobjectsService;
    this.auditLog = auditLogService;
  }

  /**
   * Soft delete an ingredient
   */
  async softDeleteIngredient(
    ingredientId: string,
    options: { reason?: string; userId?: string } = {}
  ): Promise<SoftDeleteResult> {
    try {
      // Get current ingredient data
      const currentIngredient = await this.metaobjects.getIngredient(ingredientId);
      if (!currentIngredient) {
        return {
          success: false,
          entity: null,
          auditEntryId: '',
          message: `Ingredient ${ingredientId} not found`
        };
      }

      if (!currentIngredient.isActive) {
        return {
          success: false,
          entity: currentIngredient,
          auditEntryId: '',
          message: `Ingredient ${currentIngredient.name} is already inactive`
        };
      }

      // Perform soft delete
      const now = new Date().toISOString();
      const updatedIngredient = await this.metaobjects.updateIngredient(ingredientId, {
        isActive: false,
        deletedAt: now,
        versionToken: now
      });

      // Log the soft delete action
      const auditEntry = await this.auditLog.logIngredientChange(
        'SOFT_DELETE',
        ingredientId,
        currentIngredient.name,
        currentIngredient,
        updatedIngredient,
        options.userId
      );

      return {
        success: true,
        entity: updatedIngredient,
        auditEntryId: auditEntry.id,
        message: `Successfully deactivated ingredient "${currentIngredient.name}"`
      };

    } catch (error) {
      return {
        success: false,
        entity: null,
        auditEntryId: '',
        message: `Failed to deactivate ingredient: ${error}`
      };
    }
  }

  /**
   * Restore a soft-deleted ingredient
   */
  async restoreIngredient(
    ingredientId: string,
    options: RestoreOptions = {}
  ): Promise<SoftDeleteResult> {
    try {
      // Get current ingredient data
      const currentIngredient = await this.metaobjects.getIngredient(ingredientId);
      if (!currentIngredient) {
        return {
          success: false,
          entity: null,
          auditEntryId: '',
          message: `Ingredient ${ingredientId} not found`
        };
      }

      if (currentIngredient.isActive) {
        return {
          success: false,
          entity: currentIngredient,
          auditEntryId: '',
          message: `Ingredient ${currentIngredient.name} is already active`
        };
      }

      // Perform restore
      const now = new Date().toISOString();
      const updateData: any = {
        isActive: true,
        deletedAt: null
      };

      if (options.resetVersion) {
        updateData.versionToken = now;
      }

      const restoredIngredient = await this.metaobjects.updateIngredient(ingredientId, updateData);

      // Log the restore action
      const auditEntry = await this.auditLog.logIngredientChange(
        'RESTORE',
        ingredientId,
        currentIngredient.name,
        currentIngredient,
        restoredIngredient,
        options.userId
      );

      return {
        success: true,
        entity: restoredIngredient,
        auditEntryId: auditEntry.id,
        message: `Successfully restored ingredient "${currentIngredient.name}"`
      };

    } catch (error) {
      return {
        success: false,
        entity: null,
        auditEntryId: '',
        message: `Failed to restore ingredient: ${error}`
      };
    }
  }

  /**
   * Filter and sort entities based on soft delete options
   */
  filterAndSortEntities<T extends SoftDeleteEntity>(
    entities: T[],
    options: SoftDeleteOptions = {}
  ): T[] {
    let filtered = [...entities];

    // Apply active/inactive filtering
    if (!options.includeInactive) {
      filtered = filtered.filter(entity => entity.isActive);
    }

    // Apply sorting
    if (options.orderInactiveLast) {
      filtered.sort((a, b) => {
        // Active entities first
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        
        // Within same active status, sort by name if available
        if ('name' in a && 'name' in b) {
          return (a as any).name.localeCompare((b as any).name);
        }
        
        return 0;
      });
    } else {
      // Standard alphabetical sort
      filtered.sort((a, b) => {
        if ('name' in a && 'name' in b) {
          return (a as any).name.localeCompare((b as any).name);
        }
        return 0;
      });
    }

    return filtered;
  }

  /**
   * Get ingredients with soft delete filtering
   */
  async getFilteredIngredients(options: SoftDeleteOptions = {}): Promise<any[]> {
    const query = {
      first: 250,
      filter: {
        includeInactive: options.includeInactive || false
      }
    };

    const connection = await this.metaobjects.listIngredients(query);
    const ingredients = connection.edges.map((edge: any) => edge.node);

    return this.filterAndSortEntities(ingredients, {
      ...options,
      orderInactiveLast: true // Always order inactive last for ingredients
    });
  }

  /**
   * Bulk soft delete multiple ingredients
   */
  async bulkSoftDeleteIngredients(
    ingredientIds: string[],
    options: { reason?: string; userId?: string } = {}
  ): Promise<{
    success: boolean;
    results: SoftDeleteResult[];
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const results: SoftDeleteResult[] = [];

    for (const ingredientId of ingredientIds) {
      const result = await this.softDeleteIngredient(ingredientId, options);
      results.push(result);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    // Log bulk operation
    if (options.userId) {
      await this.auditLog.logAction('BULK_UPDATE', 'ingredient', {
        entityName: `Bulk soft delete of ${ingredientIds.length} ingredients`,
        metadata: {
          operationType: 'BULK_SOFT_DELETE',
          totalRequested: ingredientIds.length,
          successful,
          failed,
          ingredientIds,
          reason: options.reason
        },
        userId: options.userId
      });
    }

    return {
      success: successful > 0,
      results,
      summary: {
        total: ingredientIds.length,
        successful,
        failed
      }
    };
  }

  /**
   * Get soft delete statistics
   */
  async getSoftDeleteStats(): Promise<{
    totalIngredients: number;
    activeIngredients: number;
    inactiveIngredients: number;
    recentlyDeleted: number; // Within last 30 days
    oldestInactive: string | null;
  }> {
    const allIngredients = await this.metaobjects.listIngredients({
      first: 500,
      filter: { includeInactive: true }
    });

    const ingredients = allIngredients.edges.map((edge: any) => edge.node);
    
    const totalIngredients = ingredients.length;
    const activeIngredients = ingredients.filter((ing: any) => ing.isActive).length;
    const inactiveIngredients = totalIngredients - activeIngredients;

    // Count recently deleted (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentlyDeleted = ingredients.filter((ing: any) => 
      !ing.isActive && 
      ing.deletedAt && 
      new Date(ing.deletedAt) > thirtyDaysAgo
    ).length;

    // Find oldest inactive ingredient
    let oldestInactive: string | null = null;
    for (const ing of ingredients) {
      if (!ing.isActive && ing.deletedAt) {
        if (!oldestInactive || ing.deletedAt < oldestInactive) {
          oldestInactive = ing.deletedAt;
        }
      }
    }

    return {
      totalIngredients,
      activeIngredients,
      inactiveIngredients,
      recentlyDeleted,
      oldestInactive
    };
  }

  /**
   * Check if entity can be safely deleted (no dependencies)
   */
  async canSafelyDelete(entityType: 'ingredient', entityId: string): Promise<{
    canDelete: boolean;
    blockers: string[];
    warnings: string[];
  }> {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (entityType === 'ingredient') {
      // Check if ingredient is used in any active recipes
      // This would require recipe data access - placeholder for now
      
      // Check if ingredient has recent price changes
      const priceHistory = await this.metaobjects.getPriceHistory(entityId, {
        limit: 5
      });
      
      if (priceHistory.entries.length > 0) {
        const latestChange = new Date(priceHistory.entries[0].timestamp);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        if (latestChange > sevenDaysAgo) {
          warnings.push('Ingredient has recent price changes within the last 7 days');
        }
      }
    }

    return {
      canDelete: blockers.length === 0,
      blockers,
      warnings
    };
  }

  /**
   * Validate soft delete operation
   */
  async validateSoftDelete(
    entityType: 'ingredient',
    entityId: string,
    options: { forceDelete?: boolean } = {}
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if entity exists
    let entity;
    if (entityType === 'ingredient') {
      entity = await this.metaobjects.getIngredient(entityId);
    }

    if (!entity) {
      errors.push(`${entityType} with ID ${entityId} not found`);
      return { valid: false, errors, warnings };
    }

    if (!entity.isActive) {
      errors.push(`${entityType} is already inactive`);
      return { valid: false, errors, warnings };
    }

    // Check dependencies if not forcing
    if (!options.forceDelete) {
      const safetyCheck = await this.canSafelyDelete(entityType, entityId);
      errors.push(...safetyCheck.blockers);
      warnings.push(...safetyCheck.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}