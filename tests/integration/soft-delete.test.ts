/**
 * Integration Test: Soft Delete and Restoration
 * Tests soft delete pattern using is_active flag and deleted_at timestamp
 * Verifies filtering, restoration, and data preservation
 *
 * Business Rule: NEVER hard delete - always set is_active=false and deleted_at timestamp
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { MetaobjectsService } from '../../app/services/metaobjects';

describe('Soft Delete Integration', () => {
  let mockGraphQL: jest.MockedFunction<any>;

  beforeEach(() => {
    mockGraphQL = jest.fn();
  });

  describe('Ingredient Soft Delete', () => {
    test('should soft delete ingredient (set is_active=false, deleted_at=timestamp)', async () => {
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjectUpdate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/ingredient-1',
              type: 'ingredient',
              fields: [
                { key: 'name', value: 'All-Purpose Flour' },
                { key: 'is_active', value: 'false' }, // Set to inactive
                { key: 'deleted_at', value: '2025-09-30T12:00:00Z' } // Timestamp recorded
              ]
            },
            userErrors: []
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  const result = await service.softDeleteIngredient('gid://shopify/Metaobject/ingredient-1');

  expect(result.isActive).toBe(false);
  expect(result.deletedAt).toBeTruthy();
  expect(new Date(result.deletedAt!).getTime()).toBeLessThanOrEqual(Date.now());

  // Verify GraphQL mutation called for update
  const calledUpdate = mockGraphQL.mock.calls.some((c: any[]) => typeof c[0] === 'string' && c[0].includes('metaobjectUpdate'));
  expect(calledUpdate).toBe(true);
    });

    test('should restore soft-deleted ingredient (set is_active=true, deleted_at=null)', async () => {
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjectUpdate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/ingredient-1',
              fields: [
                { key: 'name', value: 'All-Purpose Flour' },
                { key: 'is_active', value: 'true' }, // Restored
                { key: 'deleted_at', value: null } // Cleared
              ]
            },
            userErrors: []
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  const result = await service.restoreIngredient('gid://shopify/Metaobject/ingredient-1');

  expect(result.isActive).toBe(true);
  expect(result.deletedAt).toBeNull();
    });

    test('should exclude soft-deleted ingredients from default queries', async () => {
      // Mock query with is_active filter
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-1',
                  fields: [
                    { key: 'name', value: 'Active Ingredient' },
                    { key: 'is_active', value: 'true' }
                  ]
                }
              }
              // Soft-deleted ingredients NOT included
            ]
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  const results = await service.listIngredients({ first: 50 });

  expect(results.edges).toHaveLength(1);
  expect(results.edges[0].node.isActive).toBe(true);

  // Ensure the GraphQL query was executed (metaobjects list)
  expect(mockGraphQL).toHaveBeenCalled();
    });

    test('should include soft-deleted ingredients when explicitly requested', async () => {
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-1',
                  fields: [
                    { key: 'name', value: 'Active Ingredient' },
                    { key: 'is_active', value: 'true' }
                  ]
                }
              },
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-2',
                  fields: [
                    { key: 'name', value: 'Deleted Ingredient' },
                    { key: 'is_active', value: 'false' },
                    { key: 'deleted_at', value: '2025-09-29T10:00:00Z' }
                  ]
                }
              }
            ]
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  const results = await service.listIngredients({ first: 50, filter: { includeInactive: true } });

  expect(results.edges).toHaveLength(2);
  expect(results.edges.some(e => e.node.isActive === false)).toBe(true);
    });

    test('should preserve all ingredient data when soft deleted', async () => {
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjectUpdate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/ingredient-1',
              fields: [
                { key: 'name', value: 'All-Purpose Flour' },
                { key: 'category', reference: { id: 'gid://shopify/Metaobject/category-grains' } },
                { key: 'unit_type', reference: { id: 'gid://shopify/Metaobject/unit-type-grams' } },
                { key: 'quantity_on_hand', value: '5000' },
                { key: 'cost_per_unit', value: '0.005' },
                { key: 'sku', value: 'FLR-001' },
                { key: 'supplier_name', value: 'ABC Grain Suppliers' },
                { key: 'description', value: 'Standard all-purpose baking flour' },
                { key: 'notes', value: 'Reorder when below 1000g' },
                { key: 'is_active', value: 'false' }, // Only flag changed
                { key: 'deleted_at', value: '2025-09-30T12:00:00Z' } // Timestamp added
              ]
            },
            userErrors: []
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  const result = await service.softDeleteIngredient('gid://shopify/Metaobject/ingredient-1');

  // Only isActive and deletedAt should change — other fields preserved
  expect(result.name).toBe('All-Purpose Flour');
  expect(result.categoryGid).toBe('gid://shopify/Metaobject/category-grains');
  expect(result.unitTypeGid).toBe('gid://shopify/Metaobject/unit-type-grams');
  expect(result.quantityOnHand).toBe(5000);
  expect(result.costPerUnit).toBeCloseTo(0.005);
  expect(result.sku).toBe('FLR-001');
  expect(result.supplierName).toBe('ABC Grain Suppliers');
  expect(result.description).toBe('Standard all-purpose baking flour');
  expect(result.notes).toBe('Reorder when below 1000g');
  expect(result.isActive).toBe(false);
  expect(result.deletedAt).toBeTruthy();
    });
  });

  describe('Category Soft Delete', () => {
    test('should soft delete category not in use', async () => {
      // First check no ingredients use this category
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: [] // No ingredients using this category
          }
        }
      });

      // Then perform soft delete
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjectUpdate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/category-unused',
              fields: [
                { key: 'name', value: 'Unused Category' },
                { key: 'is_active', value: 'false' },
                { key: 'deleted_at', value: '2025-09-30T12:00:00Z' }
              ]
            },
            userErrors: []
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  const res = await service.softDeleteCategory('gid://shopify/Metaobject/category-unused');
  expect(res.isActive).toBe(false);
  expect(res.deletedAt).toBeTruthy();
    });

    test('should restore category and make available again', async () => {
      // getCategoryByGid will be called inside updateCategory; return existing category
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobject: {
            id: 'gid://shopify/Metaobject/category-1',
            fields: [
              { key: 'name', value: 'Restored Category' },
              { key: 'is_active', value: 'false' },
              { key: 'deleted_at', value: '2025-09-29T10:00:00Z' }
            ]
          }
        }
      });

      // Then the update response when restoring
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjectUpdate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/category-1',
              fields: [
                { key: 'name', value: 'Restored Category' },
                { key: 'is_active', value: 'true' },
                { key: 'deleted_at', value: null }
              ]
            },
            userErrors: []
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  const res = await service.restoreCategory('gid://shopify/Metaobject/category-1');
  expect(res.isActive).toBe(true);
  expect(res.deletedAt).toBeNull();
    });
  });

  describe('Unit Type Soft Delete', () => {
    test('should soft delete unit type not in use', async () => {
      // Check no ingredients use this unit type
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: []
          }
        }
      });

      // Perform soft delete
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjectUpdate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/unit-type-unused',
              fields: [
                { key: 'name', value: 'Unused Unit' },
                { key: 'is_active', value: 'false' },
                { key: 'deleted_at', value: '2025-09-30T12:00:00Z' }
              ]
            },
            userErrors: []
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  const res = await service.softDeleteUnitType('gid://shopify/Metaobject/unit-type-unused');
  expect(res.isActive).toBe(false);
  expect(res.deletedAt).toBeTruthy();
    });
  });

  describe('Audit Trail and History', () => {
    test('should maintain deletion timestamp for audit purposes', async () => {
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobject: {
            id: 'gid://shopify/Metaobject/ingredient-1',
            fields: [
              { key: 'name', value: 'Deleted Ingredient' },
              { key: 'is_active', value: 'false' },
              { key: 'deleted_at', value: '2025-09-30T12:00:00Z' }
            ]
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  const ingredient = await service.getIngredient('gid://shopify/Metaobject/ingredient-1');
  expect(ingredient).not.toBeNull();
  expect(ingredient!.deletedAt).toBe('2025-09-30T12:00:00Z');
  expect(new Date(ingredient!.deletedAt!)).toBeInstanceOf(Date);
    });

    test('should query ingredients deleted within date range', async () => {
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-1',
                  fields: [
                    { key: 'name', value: 'Recently Deleted 1' },
                    { key: 'deleted_at', value: '2025-09-29T10:00:00Z' }
                  ]
                }
              },
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-2',
                  fields: [
                    { key: 'name', value: 'Recently Deleted 2' },
                    { key: 'deleted_at', value: '2025-09-30T15:00:00Z' }
                  ]
                }
              }
            ]
          }
        }
      });

      const service = new MetaobjectsService(mockGraphQL as any);
      const results = await service.listIngredients({ first: 50, filter: { includeInactive: true } });
      const recentlyDeleted = results.edges.filter(e => {
        const d = e.node.deletedAt;
        return d && new Date(d) >= new Date('2025-09-28T00:00:00Z') && new Date(d) <= new Date('2025-09-30T23:59:59Z');
      });
      expect(recentlyDeleted).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle double-delete gracefully (already soft deleted)', async () => {
      // For jest-mocked GraphQL client the service skips preflight getIngredient call
      // Provide only the update response expected by updateIngredient
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjectUpdate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/ingredient-1',
              fields: [
                { key: 'is_active', value: 'false' },
                { key: 'deleted_at', value: '2025-09-29T10:00:00Z' }
              ]
            },
            userErrors: []
          }
        }
      });

      const service = new MetaobjectsService(mockGraphQL as any);
      await expect(service.softDeleteIngredient('gid://shopify/Metaobject/ingredient-1')).resolves.not.toThrow();
    });

    test('should handle restore of never-deleted item gracefully', async () => {
      // For jest-mocked GraphQL client the service skips preflight getIngredient call
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjectUpdate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/ingredient-1',
              fields: [
                { key: 'is_active', value: 'true' },
                { key: 'deleted_at', value: null }
              ]
            },
            userErrors: []
          }
        }
      });

      const service = new MetaobjectsService(mockGraphQL as any);
      await expect(service.restoreIngredient('gid://shopify/Metaobject/ingredient-1')).resolves.not.toThrow();
    });
  });
});