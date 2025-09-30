/**
 * Unit Type Service (T021)
 * Manages ingredient unit types with referential integrity enforcement
 *
 * Key Features:
 * - CRUD operations for ingredient unit types
 * - Type category enum enforcement (weight/volume/each)
 * - Deletion blocking when unit type is in use by ingredients
 * - Soft delete pattern (is_active flag)
 * - Dependency checking with detailed error messages
 */

import { MetaobjectsService, MetaobjectUnitType } from './metaobjects';

export interface UnitTypeDependencyCheck {
  canDelete: boolean;
  dependentIngredients: Array<{
    gid: string;
    name: string;
    handle?: string;
  }>;
  totalCount: number;
  message: string;
}

export class UnitTypeDeletionBlockedError extends Error {
  public affectedIngredients: Array<{
    id: string;
    name: string;
    handle?: string;
    url: string;
  }>;
  public totalCount: number;
  public hasMore: boolean;

  constructor(
    message: string,
    affectedIngredients: Array<{ id: string; name: string; handle?: string; url: string }>,
    totalCount: number
  ) {
    super(message);
    this.name = 'UnitTypeDeletionBlockedError';
    this.affectedIngredients = affectedIngredients;
    this.totalCount = totalCount;
    this.hasMore = totalCount > affectedIngredients.length;
  }
}

export class UnitTypeService {
  private metaobjectsService: MetaobjectsService;

  constructor(metaobjectsService: MetaobjectsService) {
    this.metaobjectsService = metaobjectsService;
  }

  /**
   * Create a new unit type
   */
  async create(data: {
    name: string;
    abbreviation?: string;
    typeCategory: 'weight' | 'volume' | 'each';
    isActive?: boolean;
  }): Promise<MetaobjectUnitType> {
    // Validate type category
    if (!['weight', 'volume', 'each'].includes(data.typeCategory)) {
      throw new Error('Invalid type_category: must be weight, volume, or each');
    }

    // Check for duplicate name
    const existing = await this.findByName(data.name);
    if (existing) {
      throw new Error(`Unit type name "${data.name}" already exists`);
    }

    return this.metaobjectsService.createUnitType({
      name: data.name,
      abbreviation: data.abbreviation,
      typeCategory: data.typeCategory,
      isActive: data.isActive !== undefined ? data.isActive : true
    });
  }

  /**
   * Get unit type by GID
   */
  async getByGid(gid: string): Promise<MetaobjectUnitType | null> {
    return this.metaobjectsService.getUnitTypeByGid(gid);
  }

  /**
   * List all unit types
   */
  async list(includeDeleted: boolean = false): Promise<MetaobjectUnitType[]> {
    return this.metaobjectsService.listUnitTypes(includeDeleted);
  }

  /**
   * List unit types grouped by category
   */
  async listByCategory(includeDeleted: boolean = false): Promise<{
    weight: MetaobjectUnitType[];
    volume: MetaobjectUnitType[];
    each: MetaobjectUnitType[];
  }> {
    const allUnitTypes = await this.metaobjectsService.listUnitTypes(includeDeleted);

    return {
      weight: allUnitTypes.filter(ut => ut.typeCategory === 'weight'),
      volume: allUnitTypes.filter(ut => ut.typeCategory === 'volume'),
      each: allUnitTypes.filter(ut => ut.typeCategory === 'each')
    };
  }

  /**
   * Find unit type by name
   */
  async findByName(name: string): Promise<MetaobjectUnitType | null> {
    const unitTypes = await this.metaobjectsService.listUnitTypes(true);
    return unitTypes.find(ut => ut.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Check if unit type can be deleted (not used by any ingredients)
   */
  async checkDeletionDependencies(unitTypeGid: string): Promise<UnitTypeDependencyCheck> {
    try {
      // Query ingredients that reference this unit type
      const dependentIngredients = await this.findIngredientsUsingUnitType(unitTypeGid);

      const canDelete = dependentIngredients.length === 0;
      const totalCount = dependentIngredients.length;

      let message = '';
      if (canDelete) {
        message = 'Unit type can be safely deleted';
      } else {
        message = `Cannot delete unit type: Used by ${totalCount} ingredient(s)`;
      }

      return {
        canDelete,
        dependentIngredients: dependentIngredients.slice(0, 10), // Limit to 10 for display
        totalCount,
        message
      };
    } catch (error) {
      throw new Error(`Failed to check deletion dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find all ingredients using this unit type
   */
  private async findIngredientsUsingUnitType(unitTypeGid: string): Promise<Array<{
    gid: string;
    name: string;
    handle?: string;
  }>> {
    const ingredients: Array<{ gid: string; name: string; handle?: string }> = [];

    try {
      // Query all ingredients (with pagination support for >250 items)
      let hasMore = true;
      let cursor: string | null = null;

      while (hasMore) {
        const result = await this.metaobjectsService.listIngredients({
          first: 250,
          after: cursor || undefined,
          filter: { includeInactive: true }
        });

        // Filter ingredients that use this unit type
        for (const edge of result.edges) {
          const ingredient = edge.node;
          if (ingredient.unitTypeGid === unitTypeGid) {
            ingredients.push({
              gid: ingredient.gid || '',
              name: ingredient.name,
              handle: undefined
            });
          }
        }

        hasMore = result.pageInfo.hasNextPage;
        cursor = result.pageInfo.endCursor;
      }

      return ingredients;
    } catch (error) {
      throw new Error(`Failed to find ingredients using unit type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete unit type with referential integrity check
   * Blocks deletion if unit type is in use by any ingredients
   */
  async delete(unitTypeGid: string): Promise<MetaobjectUnitType> {
    // Check dependencies
    const dependencyCheck = await this.checkDeletionDependencies(unitTypeGid);

    if (!dependencyCheck.canDelete) {
      // Format affected ingredients for error
      const affectedIngredients = dependencyCheck.dependentIngredients.map(ing => ({
        id: ing.gid,
        name: ing.name,
        handle: ing.handle,
        url: `/app/ingredients/${ing.gid}`
      }));

      throw new UnitTypeDeletionBlockedError(
        dependencyCheck.message,
        affectedIngredients,
        dependencyCheck.totalCount
      );
    }

    // Perform soft delete
    return this.metaobjectsService.softDeleteUnitType(unitTypeGid);
  }

  /**
   * Restore a soft-deleted unit type
   */
  async restore(unitTypeGid: string): Promise<MetaobjectUnitType> {
    const unitType = await this.metaobjectsService.getUnitTypeByGid(unitTypeGid);

    if (!unitType) {
      throw new Error('Unit type not found');
    }

    if (unitType.isActive) {
      // Already active, return as-is
      return unitType;
    }

    // Restore by updating is_active and clearing deleted_at
    const now = new Date().toISOString();
    const response = await this.metaobjectsService.update(unitTypeGid, {
      is_active: 'true',
      deleted_at: '',
      updated_at: now
    });

    // Map response back to MetaobjectUnitType
    const fields = new Map<string, string>();
    if (response.fields && Array.isArray(response.fields)) {
      response.fields.forEach((field: any) => {
        fields.set(field.key, field.value);
      });
    }

    const typeCategory = fields.get('type_category') || 'weight';
    return {
      id: null,
      gid: response.id,
      name: fields.get('name') || unitType.name,
      abbreviation: fields.get('abbreviation') || undefined,
      typeCategory: (typeCategory === 'weight' || typeCategory === 'volume' || typeCategory === 'each')
        ? typeCategory
        : 'weight',
      isActive: fields.get('is_active') === 'true',
      deletedAt: fields.get('deleted_at') || null,
      createdAt: fields.get('created_at'),
      updatedAt: fields.get('updated_at')
    };
  }

  /**
   * Update unit type
   */
  async update(unitTypeGid: string, data: {
    name?: string;
    abbreviation?: string;
    typeCategory?: 'weight' | 'volume' | 'each';
  }): Promise<MetaobjectUnitType> {
    const unitType = await this.metaobjectsService.getUnitTypeByGid(unitTypeGid);

    if (!unitType) {
      throw new Error('Unit type not found');
    }

    // Validate type category if provided
    if (data.typeCategory && !['weight', 'volume', 'each'].includes(data.typeCategory)) {
      throw new Error('Invalid type_category: must be weight, volume, or each');
    }

    // Check for duplicate name if changing name
    if (data.name && data.name !== unitType.name) {
      const existing = await this.findByName(data.name);
      if (existing && existing.gid !== unitTypeGid) {
        throw new Error(`Unit type name "${data.name}" already exists`);
      }
    }

    const now = new Date().toISOString();
    const updates: Record<string, string> = {
      updated_at: now
    };

    if (data.name) updates.name = data.name;
    if (data.abbreviation !== undefined) updates.abbreviation = data.abbreviation;
    if (data.typeCategory) updates.type_category = data.typeCategory;

    const response = await this.metaobjectsService.update(unitTypeGid, updates);

    // Map response back to MetaobjectUnitType
    const fields = new Map<string, string>();
    if (response.fields && Array.isArray(response.fields)) {
      response.fields.forEach((field: any) => {
        fields.set(field.key, field.value);
      });
    }

    const typeCategory = fields.get('type_category') || unitType.typeCategory;
    return {
      id: null,
      gid: response.id,
      name: fields.get('name') || unitType.name,
      abbreviation: fields.get('abbreviation') || undefined,
      typeCategory: (typeCategory === 'weight' || typeCategory === 'volume' || typeCategory === 'each')
        ? typeCategory
        : 'weight',
      isActive: fields.get('is_active') === 'true',
      deletedAt: fields.get('deleted_at') || null,
      createdAt: fields.get('created_at'),
      updatedAt: fields.get('updated_at')
    };
  }
}