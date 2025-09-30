/**
 * CRITICAL Integration Test: Ingredient Deletion Referential Integrity
 * Tests that deletion is BLOCKED when ingredient is used in recipes
 * Verifies error message lists all affected recipes
 *
 * This is the MOST IMPORTANT test - it ensures data integrity
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { MetaobjectsService } from '../../app/services/metaobjects';

describe('Ingredient Deletion Integrity - CRITICAL', () => {
  let mockGraphQL: jest.MockedFunction<any>;

  beforeEach(() => {
    mockGraphQL = jest.fn();
  });

  test('CRITICAL: should BLOCK deletion of ingredient used in recipes', async () => {
    // Step 1: Mock query to check recipes using this ingredient
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjects: {
          edges: [
            {
              node: {
                id: 'gid://shopify/Metaobject/recipe-1',
                type: 'recipe',
                fields: [
                  { key: 'name', value: 'Basic White Bread' }
                ]
              }
            },
            {
              node: {
                id: 'gid://shopify/Metaobject/recipe-2',
                type: 'recipe',
                fields: [
                  { key: 'name', value: 'Chocolate Chip Cookies' }
                ]
              }
            }
          ]
        }
      }
    });

    const service = new MetaobjectsService(mockGraphQL as any);

    await expect(
      service.deleteIngredient('gid://shopify/Metaobject/11111')
    ).rejects.toMatchObject({
      message: expect.stringContaining('Used in 2 recipe(s)'),
      affectedRecipes: expect.arrayContaining([
        expect.objectContaining({ name: 'Basic White Bread' }),
        expect.objectContaining({ name: 'Chocolate Chip Cookies' })
      ])
    });
  });

  test('CRITICAL: should ALLOW deletion of ingredient NOT used in recipes', async () => {
    // Mock query returning no recipes
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjects: {
          edges: [] // No recipes use this ingredient
        }
      }
    });

    // Mock successful soft delete
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectUpdate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/11111',
            fields: [
              { key: 'is_active', value: 'false' },
              { key: 'deleted_at', value: '2025-09-30T12:00:00Z' }
            ]
          },
          userErrors: []
        }
      }
    });

    const service = new MetaobjectsService(mockGraphQL as any);

    await expect(
      service.deleteIngredient('gid://shopify/Metaobject/11111')
    ).resolves.toBeTruthy();

    // Verify that a metaobjectUpdate mutation was sent (soft-delete)
    const calledWithUpdate = mockGraphQL.mock.calls.some((call: any[]) =>
      typeof call[0] === 'string' && call[0].includes('metaobjectUpdate')
    );
    expect(calledWithUpdate).toBe(true);
  });

  test('should query recipes efficiently (single GraphQL call)', async () => {
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjects: {
          edges: [
            {
              node: {
                id: 'gid://shopify/Metaobject/recipe-1',
                fields: [{ key: 'name', value: 'Test Recipe' }]
              }
            }
          ]
        }
      }
    });

  const service = new MetaobjectsService(mockGraphQL as any);

  await service.checkIngredientDeletionDependencies('gid://shopify/Metaobject/11111');

  expect(mockGraphQL).toHaveBeenCalledTimes(1);
  // First arg is the query string; ensure it targets recipe metaobjects
  expect(mockGraphQL.mock.calls[0][0]).toContain('metaobjects(type: "recipe"');
  // Variables should include the search query for ingredients
  expect(mockGraphQL.mock.calls[0][1].variables.query).toContain('ingredients:');
  });

  test('should provide actionable error with recipe links', async () => {
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjects: {
          edges: [
            {
              node: {
                id: 'gid://shopify/Metaobject/recipe-1',
                handle: 'basic-white-bread',
                fields: [
                  { key: 'name', value: 'Basic White Bread' }
                ]
              }
            }
          ]
        }
      }
    });

    const service = new MetaobjectsService(mockGraphQL as any);

    await expect(service.deleteIngredient('gid://shopify/Metaobject/11111')).rejects.toMatchObject({
      affectedRecipes: [
        expect.objectContaining({
          id: 'gid://shopify/Metaobject/recipe-1',
          handle: 'basic-white-bread',
          name: 'Basic White Bread',
          url: `/app/recipes/gid://shopify/Metaobject/recipe-1`
        })
      ]
    });
  });

  test('should handle edge case: recipe with empty ingredients list', async () => {
    // Mock recipe that has ingredient in list but quantity is 0 (edge case)
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjects: {
          edges: [
            {
              node: {
                id: 'gid://shopify/Metaobject/recipe-1',
                fields: [
                  { key: 'name', value: 'Edge Case Recipe' },
                  { key: 'ingredients', references: { edges: [] } }
                ]
              }
            }
          ]
        }
      }
    });

  const service = new MetaobjectsService(mockGraphQL as any);
  const res = await service.checkIngredientDeletionDependencies('gid://shopify/Metaobject/11111');
  // The recipe has an empty ingredients list and should be skipped
  expect(res.recipes).toHaveLength(0);
  });
});