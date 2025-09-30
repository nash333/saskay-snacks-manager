/**
 * CRITICAL Integration Test: Category/Unit Type Deletion Referential Integrity
 * Tests that deletion is BLOCKED when metaobjects are in use by ingredients
 * Verifies error message lists all affected ingredients
 *
 * This prevents orphaned ingredients without valid category/unit_type references
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { MetaobjectsService } from '../../app/services/metaobjects';

describe('Metaobject Deletion Integrity - CRITICAL', () => {
  let mockGraphQL: jest.MockedFunction<any>;

  beforeEach(() => {
    mockGraphQL = jest.fn();
  });

  describe('Category Deletion Integrity', () => {
    test('CRITICAL: should BLOCK deletion of category in use by ingredients', async () => {
      // Mock query showing 3 ingredients using this category
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-1',
                  fields: [
                    { key: 'name', value: 'All-Purpose Flour' }
                  ]
                }
              },
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-2',
                  fields: [
                    { key: 'name', value: 'Bread Flour' }
                  ]
                }
              },
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-3',
                  fields: [
                    { key: 'name', value: 'Cake Flour' }
                  ]
                }
              }
            ]
          }
        }
      });

      const service = new MetaobjectsService(mockGraphQL as any);

      await expect(
        service.softDeleteCategory('gid://shopify/Metaobject/category-grains')
      ).rejects.toMatchObject({
        message: expect.stringContaining('Used by 3 ingredient(s)'),
        affectedItems: expect.arrayContaining([
          expect.objectContaining({ name: 'All-Purpose Flour' }),
          expect.objectContaining({ name: 'Bread Flour' }),
          expect.objectContaining({ name: 'Cake Flour' })
        ])
      });
    });

    test('CRITICAL: should ALLOW deletion of category NOT in use', async () => {
      // Mock query returning no ingredients
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: [] // No ingredients use this category
          }
        }
      });

      // Mock successful soft delete
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjectUpdate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/category-unused',
              fields: [
                { key: 'is_active', value: 'false' }
              ]
            },
            userErrors: []
          }
        }
      });

      const service = new MetaobjectsService(mockGraphQL as any);
      await expect(
        service.softDeleteCategory('gid://shopify/Metaobject/category-unused')
      ).resolves.toBeTruthy();

      // Ensure that metaobjectUpdate was called for soft delete
      const calledUpdate = mockGraphQL.mock.calls.some((c: any[]) => typeof c[0] === 'string' && c[0].includes('metaobjectUpdate'));
      expect(calledUpdate).toBe(true);
    });

    test('should query ingredients by category reference efficiently', async () => {
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-1',
                  fields: [{ key: 'name', value: 'Test Ingredient' }]
                }
              }
            ]
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  await service.checkCategoryDeletionDependencies('gid://shopify/Metaobject/category-grains');

  expect(mockGraphQL).toHaveBeenCalledTimes(1);
  expect(mockGraphQL.mock.calls[0][0]).toContain('metaobjects(type: "ingredient"');
  expect(mockGraphQL.mock.calls[0][1].variables.query).toContain('category:');
    });
  });

  describe('Unit Type Deletion Integrity', () => {
    test('CRITICAL: should BLOCK deletion of unit_type in use by ingredients', async () => {
      // Mock query showing 5 ingredients using "grams" unit type
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-1',
                  fields: [{ key: 'name', value: 'Flour' }]
                }
              },
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-2',
                  fields: [{ key: 'name', value: 'Sugar' }]
                }
              },
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-3',
                  fields: [{ key: 'name', value: 'Salt' }]
                }
              },
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-4',
                  fields: [{ key: 'name', value: 'Butter' }]
                }
              },
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-5',
                  fields: [{ key: 'name', value: 'Yeast' }]
                }
              }
            ]
          }
        }
      });

      const service = new MetaobjectsService(mockGraphQL as any);
      await expect(
        service.softDeleteUnitType('gid://shopify/Metaobject/unit-type-grams')
      ).rejects.toMatchObject({ message: expect.stringContaining('Used by 5 ingredient(s)') });
    });

    test('CRITICAL: should ALLOW deletion of unit_type NOT in use', async () => {
      // Mock query returning no ingredients
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: []
          }
        }
      });

      // Mock successful soft delete
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjectUpdate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/unit-type-unused',
              fields: [
                { key: 'is_active', value: 'false' }
              ]
            },
            userErrors: []
          }
        }
      });

      const service = new MetaobjectsService(mockGraphQL as any);
      await expect(
        service.softDeleteUnitType('gid://shopify/Metaobject/unit-type-unused')
      ).resolves.toBeTruthy();
    });

    test('should query ingredients by unit_type reference efficiently', async () => {
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-1',
                  fields: [{ key: 'name', value: 'Test Ingredient' }]
                }
              }
            ]
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  await service.checkUnitTypeDeletionDependencies('gid://shopify/Metaobject/unit-type-grams');
  expect(mockGraphQL).toHaveBeenCalledTimes(1);
  expect(mockGraphQL.mock.calls[0][0]).toContain('metaobjects(type: "ingredient"');
  expect(mockGraphQL.mock.calls[0][1].variables.query).toContain('unit_type:');
    });
  });

  describe('Error Message Quality', () => {
    test('should provide ingredient links in error for easy navigation', async () => {
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Metaobject/ingredient-1',
                  handle: 'all-purpose-flour',
                  fields: [{ key: 'name', value: 'All-Purpose Flour' }]
                }
              }
            ]
          }
        }
      });

      const service = new MetaobjectsService(mockGraphQL as any);
      await expect(service.softDeleteCategory('gid://shopify/Metaobject/category-grains')).rejects.toMatchObject({
        affectedItems: [
          expect.objectContaining({
            id: 'gid://shopify/Metaobject/ingredient-1',
            handle: 'all-purpose-flour',
            name: 'All-Purpose Flour',
            url: '/app/ingredients/gid://shopify/Metaobject/ingredient-1'
          })
        ]
      });
    });

    test('should limit error message to first 10 affected items', async () => {
      // Mock 50 ingredients using this category
      const mockIngredients = Array.from({ length: 50 }, (_, i) => ({
        node: {
          id: `gid://shopify/Metaobject/ingredient-${i + 1}`,
          fields: [{ key: 'name', value: `Ingredient ${i + 1}` }]
        }
      }));

      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: mockIngredients
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  const res = await service.checkCategoryDeletionDependencies('gid://shopify/Metaobject/category-large');
  expect(res.totalCount).toBe(50);
  expect(res.recipes).toHaveLength(10);
  expect(res.hasMore).toBe(true);
    });
  });

  describe('Performance Considerations', () => {
    test('should use single GraphQL query per dependency check', async () => {
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: []
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  await service.checkCategoryDeletionDependencies('gid://shopify/Metaobject/category-1');
  expect(mockGraphQL).toHaveBeenCalledTimes(1);
    });

    test('should handle pagination for >250 dependent ingredients', async () => {
      // First page
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: Array.from({ length: 250 }, (_, i) => ({
              node: {
                id: `gid://shopify/Metaobject/ingredient-${i}`,
                fields: [{ key: 'name', value: `Ingredient ${i}` }]
              }
            })),
            pageInfo: {
              hasNextPage: true,
              endCursor: 'cursor250'
            }
          }
        }
      });

      // Second page
      mockGraphQL.mockResolvedValueOnce({
        data: {
          metaobjects: {
            edges: Array.from({ length: 50 }, (_, i) => ({
              node: {
                id: `gid://shopify/Metaobject/ingredient-${250 + i}`,
                fields: [{ key: 'name', value: `Ingredient ${250 + i}` }]
              }
            })),
            pageInfo: {
              hasNextPage: false
            }
          }
        }
      });

  const service = new MetaobjectsService(mockGraphQL as any);
  const res = await service.checkCategoryDeletionDependencies('gid://shopify/Metaobject/category-1');
  expect(res.totalCount).toBe(300);
    });
  });
});