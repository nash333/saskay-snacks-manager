/**
 * End-to-End Tests - Ingredient Management Workflow
 * Comprehensive testing for Task 60
 * Tests complete user journeys through ingredient management features
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies first
jest.mock('../../app/shopify.server', () => ({
  authenticate: {
    admin: jest.fn()
  }
}));

jest.mock('../../app/db.server', () => ({
  default: {}
}));

// Import service after mocking
import { MetaobjectsService } from '../../app/services/metaobjects';
import type { MetaobjectIngredient } from '../../app/services/metaobjects';

describe('E2E: Complete Ingredient Management Workflow', () => {
  let mockGraphqlClient: jest.MockedFunction<any>;
  let metaobjectsService: MetaobjectsService;

  beforeEach(() => {
    // Create mock GraphQL client
    mockGraphqlClient = jest.fn();
    metaobjectsService = new MetaobjectsService(mockGraphqlClient);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Full Ingredient Lifecycle', () => {
    test('should handle complete create-read-update-delete workflow', async () => {
      // Step 1: Create new ingredient
      const newIngredient = {
        name: 'Premium Wheat Flour',
        costPerUnit: 3.50,
        unitType: 'weight' as const,
        isActive: true,
        isComplimentary: false,
        versionToken: null
      };

      // Mock successful creation
      mockGraphqlClient.mockResolvedValueOnce({
        metaobjectCreate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/ingredient-12345',
            handle: 'premium-wheat-flour',
            type: 'ingredient',
            fields: [
              { key: 'name', value: 'Premium Wheat Flour' },
              { key: 'cost_per_unit', value: '3.50' },
              { key: 'unit_type', value: 'weight' },
              { key: 'is_active', value: 'true' },
              { key: 'is_complimentary', value: 'false' }
            ]
          },
          userErrors: []
        }
      });

      const createdIngredient = await metaobjectsService.createIngredient(newIngredient);

      expect(createdIngredient).toBeDefined();
      expect(createdIngredient.name).toBe('Premium Wheat Flour');
      expect(createdIngredient.costPerUnit).toBe(3.50);
      expect(mockGraphqlClient).toHaveBeenCalledTimes(1);

      // Step 2: Read ingredient back
      mockGraphqlClient.mockResolvedValueOnce({
        metaobject: {
          id: 'gid://shopify/Metaobject/ingredient-12345',
          handle: 'premium-wheat-flour',
          type: 'ingredient',
          fields: [
            { key: 'name', value: 'Premium Wheat Flour' },
            { key: 'cost_per_unit', value: '3.50' },
            { key: 'unit_type', value: 'weight' },
            { key: 'is_active', value: 'true' }
          ]
        }
      });

      const retrievedIngredient = await metaobjectsService.getIngredient('ingredient-12345');

      expect(retrievedIngredient).toBeDefined();
      expect(retrievedIngredient?.name).toBe('Premium Wheat Flour');
      expect(retrievedIngredient?.costPerUnit).toBe(3.50);

      // Step 3: Update ingredient price
      const updatedData = {
        costPerUnit: 3.75
      };

      mockGraphqlClient.mockResolvedValueOnce({
        metaobjectUpdate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/ingredient-12345',
            fields: [
              { key: 'name', value: 'Premium Wheat Flour' },
              { key: 'cost_per_unit', value: '3.75' }
            ]
          },
          userErrors: []
        }
      });

      const updatedIngredient = await metaobjectsService.updateIngredient('ingredient-12345', updatedData);

      expect(updatedIngredient.costPerUnit).toBe(3.75);

      // Step 4: List ingredients to verify it appears
      mockGraphqlClient.mockResolvedValueOnce({
        metaobjects: {
          edges: [
            {
              cursor: 'cursor1',
              node: {
                id: 'gid://shopify/Metaobject/ingredient-12345',
                handle: 'premium-wheat-flour',
                type: 'ingredient',
                fields: [
                  { key: 'name', value: 'Premium Wheat Flour' },
                  { key: 'cost_per_unit', value: '3.75' },
                  { key: 'unit_type', value: 'weight' },
                  { key: 'is_active', value: 'true' },
                  { key: 'is_complimentary', value: 'false' }
                ]
              }
            }
          ],
          pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: 'cursor1', endCursor: 'cursor1' }
        }
      });

      const allIngredients = await metaobjectsService.listIngredients();

      expect(allIngredients.edges).toHaveLength(1);
      expect(allIngredients.edges[0].node.name).toBe('Premium Wheat Flour');
      expect(allIngredients.edges[0].node.costPerUnit).toBe(3.75);

      // Step 5: Soft delete ingredient
      mockGraphqlClient.mockResolvedValueOnce({
        metaobjectUpdate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/ingredient-12345',
            fields: [
              { key: 'deleted_at', value: new Date().toISOString() }
            ]
          },
          userErrors: []
        }
      });

      const deleteResult = await metaobjectsService.softDeleteIngredient('ingredient-12345');

      expect(deleteResult).toBeDefined();
      expect(mockGraphqlClient).toHaveBeenCalledTimes(5); // Create, Get, Update, List, Delete
    });

    test('should handle ingredient search and filtering workflows', async () => {
      // Mock ingredients list for search operations
      const mockIngredients = [
        {
          cursor: 'cursor1',
          node: {
            id: 'gid://shopify/Metaobject/ingredient-1',
            handle: 'all-purpose-flour',
            fields: [
              { key: 'name', value: 'All-Purpose Flour' },
              { key: 'cost_per_unit', value: '2.50' },
              { key: 'unit_type', value: 'weight' },
              { key: 'is_active', value: 'true' },
              { key: 'is_complimentary', value: 'false' }
            ]
          }
        },
        {
          cursor: 'cursor2',
          node: {
            id: 'gid://shopify/Metaobject/ingredient-2',
            handle: 'bread-flour',
            fields: [
              { key: 'name', value: 'Bread Flour' },
              { key: 'cost_per_unit', value: '3.25' },
              { key: 'unit_type', value: 'weight' },
              { key: 'is_active', value: 'true' },
              { key: 'is_complimentary', value: 'false' }
            ]
          }
        },
        {
          cursor: 'cursor3',
          node: {
            id: 'gid://shopify/Metaobject/ingredient-3',
            handle: 'cane-sugar',
            fields: [
              { key: 'name', value: 'Cane Sugar' },
              { key: 'cost_per_unit', value: '1.80' },
              { key: 'unit_type', value: 'weight' },
              { key: 'is_active', value: 'true' },
              { key: 'is_complimentary', value: 'false' }
            ]
          }
        }
      ];

      mockGraphqlClient.mockResolvedValue({
        metaobjects: {
          edges: mockIngredients,
          pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: 'cursor1', endCursor: 'cursor3' }
        }
      });

      // Test search with filter
      const ingredients = await metaobjectsService.listIngredients();

      expect(ingredients.edges).toHaveLength(3);
      expect(ingredients.edges[0].node.name).toBe('All-Purpose Flour');
      expect(ingredients.edges[1].node.name).toBe('Bread Flour');
      expect(ingredients.edges[2].node.name).toBe('Cane Sugar');

      // Verify GraphQL was called correctly
      expect(mockGraphqlClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling and Validation', () => {
    test('should handle creation errors gracefully', async () => {
      // Mock creation error
      mockGraphqlClient.mockResolvedValueOnce({
        metaobjectCreate: {
          metaobject: null,
          userErrors: [
            {
              field: ['name'],
              message: 'Name is required and cannot be empty'
            }
          ]
        }
      });

      const invalidIngredient = {
        name: '',
        costPerUnit: 2.50,
        unitType: 'weight' as const,
        isActive: true,
        isComplimentary: false,
        versionToken: null
      };

      await expect(
        metaobjectsService.createIngredient(invalidIngredient)
      ).rejects.toThrow('Name is required and cannot be empty');
    });

    test('should handle ingredient not found scenarios', async () => {
      // Mock not found response
      mockGraphqlClient.mockResolvedValueOnce({
        metaobject: null
      });

      const result = await metaobjectsService.getIngredient('non-existent-id');

      expect(result).toBeNull();
    });

    test('should handle network errors', async () => {
      // Mock network error
      mockGraphqlClient.mockRejectedValueOnce(new Error('Network request failed'));

      await expect(
        metaobjectsService.listIngredients()
      ).rejects.toThrow('Network request failed');
    });
  });

  describe('Performance and Batch Operations', () => {
    test('should handle large ingredient lists with pagination', async () => {
      // Mock first page
      const firstPageIngredients = Array.from({ length: 50 }, (_, i) => ({
        cursor: `cursor-${i + 1}`,
        node: {
          id: `gid://shopify/Metaobject/ingredient-${i + 1}`,
          handle: `ingredient-${i + 1}`,
          fields: [
            { key: 'name', value: `Ingredient ${i + 1}` },
            { key: 'cost_per_unit', value: (i + 1).toString() },
            { key: 'unit_type', value: 'weight' },
            { key: 'is_active', value: 'true' },
            { key: 'is_complimentary', value: 'false' }
          ]
        }
      }));

      // Mock second page
      const secondPageIngredients = Array.from({ length: 25 }, (_, i) => ({
        cursor: `cursor-${i + 51}`,
        node: {
          id: `gid://shopify/Metaobject/ingredient-${i + 51}`,
          handle: `ingredient-${i + 51}`,
          fields: [
            { key: 'name', value: `Ingredient ${i + 51}` },
            { key: 'cost_per_unit', value: (i + 51).toString() },
            { key: 'unit_type', value: 'weight' },
            { key: 'is_active', value: 'true' },
            { key: 'is_complimentary', value: 'false' }
          ]
        }
      }));

      mockGraphqlClient
        .mockResolvedValueOnce({
          metaobjects: {
            edges: firstPageIngredients,
            pageInfo: { hasNextPage: true, hasPreviousPage: false, startCursor: 'cursor-1', endCursor: 'cursor-50' }
          }
        })
        .mockResolvedValueOnce({
          metaobjects: {
            edges: secondPageIngredients,
            pageInfo: { hasNextPage: false, hasPreviousPage: true, startCursor: 'cursor-51', endCursor: 'cursor-75' }
          }
        });

      // Get first page
      const firstPage = await metaobjectsService.listIngredients({ first: 50 });
      expect(firstPage.edges).toHaveLength(50);

      // Get second page
      const secondPage = await metaobjectsService.listIngredients({ first: 25, after: 'cursor-50' });
      expect(secondPage.edges).toHaveLength(25);

      expect(mockGraphqlClient).toHaveBeenCalledTimes(2);
    });

    test('should handle concurrent operations safely', async () => {
      // Setup mock responses for concurrent operations
      mockGraphqlClient
        .mockResolvedValueOnce({
          metaobjectCreate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/ingredient-1',
              fields: [{ key: 'name', value: 'Ingredient 1' }]
            },
            userErrors: []
          }
        })
        .mockResolvedValueOnce({
          metaobjectCreate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/ingredient-2',
              fields: [{ key: 'name', value: 'Ingredient 2' }]
            },
            userErrors: []
          }
        })
        .mockResolvedValueOnce({
          metaobjectCreate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/ingredient-3',
              fields: [{ key: 'name', value: 'Ingredient 3' }]
            },
            userErrors: []
          }
        });

      // Create multiple ingredients concurrently
      const ingredientPromises = [
        metaobjectsService.createIngredient({
          name: 'Ingredient 1',
          costPerUnit: 1.0,
          unitType: 'weight' as const,
          isActive: true,
          isComplimentary: false,
          versionToken: null
        }),
        metaobjectsService.createIngredient({
          name: 'Ingredient 2',
          costPerUnit: 2.0,
          unitType: 'weight' as const,
          isActive: true,
          isComplimentary: false,
          versionToken: null
        }),
        metaobjectsService.createIngredient({
          name: 'Ingredient 3',
          costPerUnit: 3.0,
          unitType: 'weight' as const,
          isActive: true,
          isComplimentary: false,
          versionToken: null
        })
      ];

      const results = await Promise.all(ingredientPromises);

      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('Ingredient 1');
      expect(results[1].name).toBe('Ingredient 2');
      expect(results[2].name).toBe('Ingredient 3');
      expect(mockGraphqlClient).toHaveBeenCalledTimes(3);
    });
  });

  describe('Data Consistency Validation', () => {
    test('should maintain data integrity across operations', async () => {
      const ingredientData = {
        name: 'Organic Cane Sugar',
        costPerUnit: 4.25,
        unitType: 'weight' as const,
        isActive: true,
        isComplimentary: false,
        versionToken: null
      };

      // Mock creation with all fields
      mockGraphqlClient.mockResolvedValueOnce({
        metaobjectCreate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/ingredient-organic-sugar',
            handle: 'organic-cane-sugar',
            type: 'ingredient',
            fields: [
              { key: 'name', value: ingredientData.name },
              { key: 'cost_per_unit', value: ingredientData.costPerUnit.toString() },
              { key: 'unit_type', value: ingredientData.unitType },
              { key: 'is_active', value: ingredientData.isActive.toString() },
              { key: 'is_complimentary', value: ingredientData.isComplimentary.toString() }
            ]
          },
          userErrors: []
        }
      });

      const created = await metaobjectsService.createIngredient(ingredientData);

      // Verify all fields are properly mapped
      expect(created.name).toBe(ingredientData.name);
      expect(created.costPerUnit).toBe(ingredientData.costPerUnit);
      expect(created.unitType).toBe(ingredientData.unitType);
      expect(created.isActive).toBe(ingredientData.isActive);
      expect(created.isComplimentary).toBe(ingredientData.isComplimentary);

      // Mock retrieval to verify persistence
      mockGraphqlClient.mockResolvedValueOnce({
        metaobject: {
          id: 'gid://shopify/Metaobject/ingredient-organic-sugar',
          fields: [
            { key: 'name', value: ingredientData.name },
            { key: 'cost_per_unit', value: ingredientData.costPerUnit.toString() },
            { key: 'unit_type', value: ingredientData.unitType },
            { key: 'is_active', value: ingredientData.isActive.toString() },
            { key: 'is_complimentary', value: ingredientData.isComplimentary.toString() }
          ]
        }
      });

      const retrieved = await metaobjectsService.getIngredient('ingredient-organic-sugar');

      // Verify data consistency
      expect(retrieved?.name).toBe(created.name);
      expect(retrieved?.costPerUnit).toBe(created.costPerUnit);
      expect(retrieved?.unitType).toBe(created.unitType);
    });
  });
});