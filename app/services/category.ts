/**
 * Category Service (T020)
 * Manages ingredient categories with referential integrity enforcement
 *
 * Key Features:
 * - CRUD operations for ingredient categories
 * - Deletion blocking when category is in use by ingredients
 * - Soft delete pattern (is_active flag)
 * - Dependency checking with detailed error messages
 */

import { MetaobjectsService, MetaobjectCategory } from './metaobjects';

export interface CategoryDependencyCheck {
  canDelete: boolean;
  dependentIngredients: Array<{
    gid: string;
    name: string;
    handle?: string;
  }>;
  totalCount: number;
  message: string;
}

export class DeletionBlockedError extends Error {
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
    this.name = 'DeletionBlockedError';
    this.affectedIngredients = affectedIngredients;
    this.totalCount = totalCount;
    this.hasMore = totalCount > affectedIngredients.length;
  }
}

export class CategoryService {
  private metaobjectsService: MetaobjectsService;

  constructor(metaobjectsService: MetaobjectsService) {
    this.metaobjectsService = metaobjectsService;
  }

  /**
   * Create a new category
   */
  async create(data: { name: string; isActive?: boolean }): Promise<MetaobjectCategory> {
    // Check for duplicate name
    const existing = await this.findByName(data.name);
    if (existing) {
      throw new Error(`Category name "${data.name}" already exists`);
    }

    return this.metaobjectsService.createCategory({
      name: data.name,
      isActive: data.isActive !== undefined ? data.isActive : true
    });
  }

  /**
   * Get category by GID
   */
  async getByGid(gid: string): Promise<MetaobjectCategory | null> {
    return this.metaobjectsService.getCategoryByGid(gid);
  }

  /**
   * List all categories
   */
  async list(includeDeleted: boolean = false): Promise<MetaobjectCategory[]> {
    return this.metaobjectsService.listCategories(includeDeleted);
  }

  /**
   * Find category by name
   */
  async findByName(name: string): Promise<MetaobjectCategory | null> {
    const categories = await this.metaobjectsService.listCategories(true);
    return categories.find(cat => cat.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Check if category can be deleted (not used by any ingredients)
   */
  async checkDeletionDependencies(categoryGid: string): Promise<CategoryDependencyCheck> {
    try {
      // Query ingredients that reference this category
      const dependentIngredients = await this.findIngredientsUsingCategory(categoryGid);

      const canDelete = dependentIngredients.length === 0;
      const totalCount = dependentIngredients.length;

      let message = '';
      if (canDelete) {
        message = 'Category can be safely deleted';
      } else {
        message = `Cannot delete category: Used by ${totalCount} ingredient(s)`;
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
   * Find all ingredients using this category
   */
  private async findIngredientsUsingCategory(categoryGid: string): Promise<Array<{
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

        // Filter ingredients that use this category
        for (const edge of result.edges) {
          const ingredient = edge.node;
          if (ingredient.categoryGid === categoryGid) {
            ingredients.push({
              gid: ingredient.gid || '',
              name: ingredient.name,
              handle: undefined // Handle not included in current implementation
            });
          }
        }

        hasMore = result.pageInfo.hasNextPage;
        cursor = result.pageInfo.endCursor;
      }

      return ingredients;
    } catch (error) {
      throw new Error(`Failed to find ingredients using category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete category with referential integrity check
   * Blocks deletion if category is in use by any ingredients
   */
  async delete(categoryGid: string): Promise<MetaobjectCategory> {
    // Check dependencies
    const dependencyCheck = await this.checkDeletionDependencies(categoryGid);

    if (!dependencyCheck.canDelete) {
      // Format affected ingredients for error
      const affectedIngredients = dependencyCheck.dependentIngredients.map(ing => ({
        id: ing.gid,
        name: ing.name,
        handle: ing.handle,
        url: `/app/ingredients/${ing.gid}`
      }));

      throw new DeletionBlockedError(
        dependencyCheck.message,
        affectedIngredients,
        dependencyCheck.totalCount
      );
    }

    // Perform soft delete
    return this.metaobjectsService.softDeleteCategory(categoryGid);
  }

  /**
   * Restore a soft-deleted category
   */
  async restore(categoryGid: string): Promise<MetaobjectCategory> {
    const category = await this.metaobjectsService.getCategoryByGid(categoryGid);

    if (!category) {
      throw new Error('Category not found');
    }

    if (category.isActive) {
      // Already active, return as-is
      return category;
    }

    // Restore by updating is_active and clearing deleted_at
    // Note: MetaobjectsService doesn't have a restore method yet, so we'll use the generic update
    const now = new Date().toISOString();
    const response = await this.metaobjectsService.update(categoryGid, {
      is_active: 'true',
      deleted_at: '',
      updated_at: now
    });

    // Map response back to MetaobjectCategory
    const fields = new Map<string, string>();
    if (response.fields && Array.isArray(response.fields)) {
      response.fields.forEach((field: any) => {
        fields.set(field.key, field.value);
      });
    }

    return {
      id: null,
      gid: response.id,
      name: fields.get('name') || category.name,
      isActive: fields.get('is_active') === 'true',
      deletedAt: fields.get('deleted_at') || null,
      createdAt: fields.get('created_at'),
      updatedAt: fields.get('updated_at')
    };
  }

  /**
   * Update category name
   */
  async update(categoryGid: string, data: { name?: string }): Promise<MetaobjectCategory> {
    const category = await this.metaobjectsService.getCategoryByGid(categoryGid);

    if (!category) {
      throw new Error('Category not found');
    }

    // Check for duplicate name if changing name
    if (data.name && data.name !== category.name) {
      const existing = await this.findByName(data.name);
      if (existing && existing.gid !== categoryGid) {
        throw new Error(`Category name "${data.name}" already exists`);
      }
    }

    const now = new Date().toISOString();
    const updates: Record<string, string> = {
      updated_at: now
    };

    if (data.name) {
      updates.name = data.name;
    }

    const response = await this.metaobjectsService.update(categoryGid, updates);

    // Map response back to MetaobjectCategory
    const fields = new Map<string, string>();
    if (response.fields && Array.isArray(response.fields)) {
      response.fields.forEach((field: any) => {
        fields.set(field.key, field.value);
      });
    }

    return {
      id: null,
      gid: response.id,
      name: fields.get('name') || category.name,
      isActive: fields.get('is_active') === 'true',
      deletedAt: fields.get('deleted_at') || null,
      createdAt: fields.get('created_at'),
      updatedAt: fields.get('updated_at')
    };
  }
}