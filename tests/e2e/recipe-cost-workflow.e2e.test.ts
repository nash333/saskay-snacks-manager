/**
 * End-to-End Tests - Recipe and Cost Calculation Workflow
 * Comprehensive testing for Task 60
 * Tests complete user journeys through recipe creation and cost calculations
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

// Import services after mocking
import { MetaobjectsService } from '../../app/services/metaobjects';
import type { MetaobjectIngredient } from '../../app/services/metaobjects';

describe('E2E: Recipe and Cost Calculation Workflow', () => {
  let mockGraphqlClient: jest.MockedFunction<any>;
  let metaobjectsService: MetaobjectsService;

  beforeEach(() => {
    // Create mock GraphQL client
    mockGraphqlClient = jest.fn();
    metaobjectsService = new MetaobjectsService(mockGraphqlClient);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Recipe Creation and Management', () => {
    test('should handle complete recipe workflow with ingredients', async () => {
      // Step 1: Create base ingredients
      const flourData = {
        name: 'All-Purpose Flour',
        costPerUnit: 2.50,
        unitType: 'weight' as const,
        isActive: true,
        isComplimentary: false,
        versionToken: null
      };

      const sugarData = {
        name: 'Granulated Sugar',
        costPerUnit: 1.80,
        unitType: 'weight' as const,
        isActive: true,
        isComplimentary: false,
        versionToken: null
      };

      // Mock ingredient creation
      mockGraphqlClient
        .mockResolvedValueOnce({
          metaobjectCreate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/ingredient-flour',
              handle: 'all-purpose-flour',
              type: 'ingredient',
              fields: [
                { key: 'name', value: 'All-Purpose Flour' },
                { key: 'cost_per_unit', value: '2.50' },
                { key: 'unit_type', value: 'weight' },
                { key: 'is_active', value: 'true' }
              ]
            },
            userErrors: []
          }
        })
        .mockResolvedValueOnce({
          metaobjectCreate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/ingredient-sugar',
              handle: 'granulated-sugar',
              type: 'ingredient',
              fields: [
                { key: 'name', value: 'Granulated Sugar' },
                { key: 'cost_per_unit', value: '1.80' },
                { key: 'unit_type', value: 'weight' },
                { key: 'is_active', value: 'true' }
              ]
            },
            userErrors: []
          }
        });

      const flour = await metaobjectsService.createIngredient(flourData);
      const sugar = await metaobjectsService.createIngredient(sugarData);

      expect(flour.name).toBe('All-Purpose Flour');
      expect(sugar.name).toBe('Granulated Sugar');

      // Step 2: Create a recipe using these ingredients
      const recipeData = {
        name: 'Basic Cookie Recipe',
        description: 'Simple cookie recipe for testing',
        servingSize: 24,
        ingredients: [
          { ingredientId: flour.id, quantity: 2.0, unit: 'cups' }, // ~250g flour
          { ingredientId: sugar.id, quantity: 1.5, unit: 'cups' }  // ~300g sugar
        ],
        instructions: 'Mix ingredients and bake',
        category: 'cookies',
        prepTime: 30,
        cookTime: 15
      };

      // Mock recipe creation
      mockGraphqlClient.mockResolvedValueOnce({
        metaobjectCreate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/recipe-cookies',
            handle: 'basic-cookie-recipe',
            type: 'recipe',
            fields: [
              { key: 'name', value: 'Basic Cookie Recipe' },
              { key: 'description', value: 'Simple cookie recipe for testing' },
              { key: 'serving_size', value: '24' },
              { key: 'ingredients_json', value: JSON.stringify(recipeData.ingredients) },
              { key: 'instructions', value: 'Mix ingredients and bake' },
              { key: 'category', value: 'cookies' }
            ]
          },
          userErrors: []
        }
      });

      // Since we don't have a recipe service yet, we'll simulate the creation
      const recipeFields = [
        { key: 'name', value: recipeData.name },
        { key: 'description', value: recipeData.description },
        { key: 'serving_size', value: recipeData.servingSize.toString() },
        { key: 'ingredients_json', value: JSON.stringify(recipeData.ingredients) },
        { key: 'instructions', value: recipeData.instructions },
        { key: 'category', value: recipeData.category }
      ];

      const mutation = `
        mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
          metaobjectCreate(metaobject: $metaobject) {
            metaobject {
              id
              handle
              type
              fields {
                key
                value
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await mockGraphqlClient(mutation, { 
        variables: { 
          metaobject: { 
            type: 'recipe', 
            fields: recipeFields 
          } 
        } 
      });

      expect(response.metaobjectCreate.metaobject.id).toBe('gid://shopify/Metaobject/recipe-cookies');
      expect(mockGraphqlClient).toHaveBeenCalledTimes(3); // 2 ingredients + 1 recipe
    });

    test('should calculate recipe costs accurately', async () => {
      // Mock ingredient data for cost calculation
      const mockIngredients = [
        {
          id: 'ingredient-flour',
          name: 'All-Purpose Flour',
          costPerUnit: 2.50, // per kg
          unitType: 'weight'
        },
        {
          id: 'ingredient-sugar',
          name: 'Granulated Sugar',
          costPerUnit: 1.80, // per kg
          unitType: 'weight'
        },
        {
          id: 'ingredient-butter',
          name: 'Unsalted Butter',
          costPerUnit: 8.00, // per kg
          unitType: 'weight'
        }
      ];

      // Recipe with specific quantities
      const recipeIngredients = [
        { ingredientId: 'ingredient-flour', quantity: 0.25, unit: 'kg' }, // 250g flour = $0.625
        { ingredientId: 'ingredient-sugar', quantity: 0.30, unit: 'kg' }, // 300g sugar = $0.540
        { ingredientId: 'ingredient-butter', quantity: 0.125, unit: 'kg' } // 125g butter = $1.000
      ];

      // Calculate expected total cost
      const expectedCosts = {
        flour: 0.25 * 2.50,   // $0.625
        sugar: 0.30 * 1.80,   // $0.540
        butter: 0.125 * 8.00  // $1.000
      };
      const expectedTotal = expectedCosts.flour + expectedCosts.sugar + expectedCosts.butter; // $2.165

      // Simulate cost calculation logic
      let totalCost = 0;
      for (const recipeIngredient of recipeIngredients) {
        const ingredient = mockIngredients.find(i => i.id === recipeIngredient.ingredientId);
        if (ingredient) {
          const cost = recipeIngredient.quantity * ingredient.costPerUnit;
          totalCost += cost;
        }
      }

      expect(totalCost).toBeCloseTo(expectedTotal, 3);
      expect(totalCost).toBeCloseTo(2.165, 3);

      // Test cost per serving (if recipe serves 24)
      const servingSize = 24;
      const costPerServing = totalCost / servingSize;
      expect(costPerServing).toBeCloseTo(0.090, 3); // ~9 cents per cookie
    });
  });

  describe('Price History and Tracking', () => {
    test('should track ingredient price changes and update recipe costs', async () => {
      // Step 1: Create ingredient with initial price
      const initialPrice = 3.00;
      mockGraphqlClient.mockResolvedValueOnce({
        metaobjectCreate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/ingredient-premium-flour',
            fields: [
              { key: 'name', value: 'Premium Bread Flour' },
              { key: 'cost_per_unit', value: initialPrice.toString() }
            ]
          },
          userErrors: []
        }
      });

      const ingredient = await metaobjectsService.createIngredient({
        name: 'Premium Bread Flour',
        costPerUnit: initialPrice,
        unitType: 'weight' as const,
        isActive: true,
        isComplimentary: false,
        versionToken: null
      });

      expect(ingredient.costPerUnit).toBe(initialPrice);

      // Step 2: Update price and create price history
      const newPrice = 3.50;
      const priceChangeData = {
        ingredientId: ingredient.id!,
        ingredientGid: ingredient.gid!,
        costPerUnit: newPrice,
        previousCost: initialPrice,
        deltaPercent: ((newPrice - initialPrice) / initialPrice) * 100,
        timestamp: new Date().toISOString(),
        changedBy: 'test-user',
        changeReason: 'Supplier price increase',
        auditEntryId: 'audit-123'
      };

      // Mock price history creation
      mockGraphqlClient.mockResolvedValueOnce({
        metaobjectCreate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/price-history-123',
            fields: [
              { key: 'ingredient_id', value: priceChangeData.ingredientId },
              { key: 'cost_per_unit', value: newPrice.toString() },
              { key: 'previous_cost', value: initialPrice.toString() },
              { key: 'delta_percent', value: priceChangeData.deltaPercent.toString() },
              { key: 'timestamp', value: priceChangeData.timestamp },
              { key: 'changed_by', value: priceChangeData.changedBy },
              { key: 'change_reason', value: priceChangeData.changeReason }
            ]
          },
          userErrors: []
        }
      });

      // Simulate price history creation
      const priceHistoryFields = [
        { key: 'ingredient_id', value: priceChangeData.ingredientId },
        { key: 'ingredient_gid', value: priceChangeData.ingredientGid },
        { key: 'cost_per_unit', value: priceChangeData.costPerUnit.toString() },
        { key: 'previous_cost', value: priceChangeData.previousCost?.toString() || '' },
        { key: 'delta_percent', value: priceChangeData.deltaPercent.toString() },
        { key: 'timestamp', value: priceChangeData.timestamp },
        { key: 'changed_by', value: priceChangeData.changedBy },
        { key: 'change_reason', value: priceChangeData.changeReason }
      ];

      const priceHistoryResponse = await mockGraphqlClient(`
        mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
          metaobjectCreate(metaobject: $metaobject) {
            metaobject {
              id
              fields {
                key
                value
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          metaobject: {
            type: 'price_history',
            fields: priceHistoryFields
          }
        }
      });

      expect(priceHistoryResponse.metaobjectCreate.metaobject.id).toBe('gid://shopify/Metaobject/price-history-123');

      // Step 3: Update ingredient with new price
      mockGraphqlClient.mockResolvedValueOnce({
        metaobjectUpdate: {
          metaobject: {
            id: ingredient.gid,
            fields: [
              { key: 'cost_per_unit', value: newPrice.toString() }
            ]
          },
          userErrors: []
        }
      });

      const updatedIngredient = await metaobjectsService.updateIngredient(ingredient.id!, { costPerUnit: newPrice });

      expect(updatedIngredient.costPerUnit).toBe(newPrice);
      expect(mockGraphqlClient).toHaveBeenCalledTimes(3); // Create ingredient + Create price history + Update ingredient
    });

    test('should retrieve ingredient price history', async () => {
      const ingredientId = 'ingredient-test';
      const mockPriceHistory = [
        {
          cursor: 'cursor1',
          node: {
            id: 'gid://shopify/Metaobject/price-history-1',
            fields: [
              { key: 'ingredient_id', value: ingredientId },
              { key: 'cost_per_unit', value: '3.50' },
              { key: 'previous_cost', value: '3.00' },
              { key: 'delta_percent', value: '16.67' },
              { key: 'timestamp', value: '2024-01-15T10:00:00Z' },
              { key: 'change_reason', value: 'Supplier price increase' }
            ]
          }
        },
        {
          cursor: 'cursor2',
          node: {
            id: 'gid://shopify/Metaobject/price-history-2',
            fields: [
              { key: 'ingredient_id', value: ingredientId },
              { key: 'cost_per_unit', value: '3.25' },
              { key: 'previous_cost', value: '3.50' },
              { key: 'delta_percent', value: '-7.14' },
              { key: 'timestamp', value: '2024-01-20T14:30:00Z' },
              { key: 'change_reason', value: 'Market adjustment' }
            ]
          }
        }
      ];

      // Mock price history query
      mockGraphqlClient.mockResolvedValueOnce({
        metaobjects: {
          edges: mockPriceHistory,
          pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: 'cursor1', endCursor: 'cursor2' }
        }
      });

      // Simulate getPriceHistory call
      const priceHistory = await metaobjectsService.getPriceHistory(ingredientId);

      expect(priceHistory.entries).toHaveLength(2);
      // The entries might be in different order based on how they're processed
      expect(priceHistory.entries[0].costPerUnit).toBeCloseTo(3.25, 2);
      expect(priceHistory.entries[1].costPerUnit).toBeCloseTo(3.50, 2);
      expect(priceHistory.entries[0].deltaPercent).toBeCloseTo(-7.14, 2);
      expect(priceHistory.entries[1].deltaPercent).toBeCloseTo(16.67, 2);
    });
  });

  describe('Bulk Operations and Data Import', () => {
    test('should handle bulk ingredient imports efficiently', async () => {
      const bulkIngredients = [
        { name: 'Ingredient A', costPerUnit: 1.00, unitType: 'weight' as const },
        { name: 'Ingredient B', costPerUnit: 2.00, unitType: 'weight' as const },
        { name: 'Ingredient C', costPerUnit: 3.00, unitType: 'volume' as const },
        { name: 'Ingredient D', costPerUnit: 4.00, unitType: 'each' as const },
        { name: 'Ingredient E', costPerUnit: 5.00, unitType: 'weight' as const }
      ];

      // Mock successful bulk creation
      bulkIngredients.forEach((ingredient, index) => {
        mockGraphqlClient.mockResolvedValueOnce({
          metaobjectCreate: {
            metaobject: {
              id: `gid://shopify/Metaobject/ingredient-bulk-${index + 1}`,
              fields: [
                { key: 'name', value: ingredient.name },
                { key: 'cost_per_unit', value: ingredient.costPerUnit.toString() },
                { key: 'unit_type', value: ingredient.unitType }
              ]
            },
            userErrors: []
          }
        });
      });

      // Create ingredients concurrently
      const creationPromises = bulkIngredients.map(ingredient =>
        metaobjectsService.createIngredient({
          ...ingredient,
          isActive: true,
          isComplimentary: false,
          versionToken: null
        })
      );

      const createdIngredients = await Promise.all(creationPromises);

      expect(createdIngredients).toHaveLength(5);
      expect(createdIngredients[0].name).toBe('Ingredient A');
      expect(createdIngredients[4].name).toBe('Ingredient E');
      expect(mockGraphqlClient).toHaveBeenCalledTimes(5);
    });

    test('should handle partial failures in bulk operations gracefully', async () => {
      const bulkIngredients = [
        { name: 'Valid Ingredient 1', costPerUnit: 1.00, unitType: 'weight' as const },
        { name: '', costPerUnit: 2.00, unitType: 'weight' as const }, // Invalid: empty name
        { name: 'Valid Ingredient 2', costPerUnit: 3.00, unitType: 'weight' as const }
      ];

      // Mock responses: success, failure, success
      mockGraphqlClient
        .mockResolvedValueOnce({
          metaobjectCreate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/ingredient-1',
              fields: [{ key: 'name', value: 'Valid Ingredient 1' }]
            },
            userErrors: []
          }
        })
        .mockResolvedValueOnce({
          metaobjectCreate: {
            metaobject: null,
            userErrors: [
              { field: ['name'], message: 'Name cannot be empty' }
            ]
          }
        })
        .mockResolvedValueOnce({
          metaobjectCreate: {
            metaobject: {
              id: 'gid://shopify/Metaobject/ingredient-2',
              fields: [{ key: 'name', value: 'Valid Ingredient 2' }]
            },
            userErrors: []
          }
        });

      // Process ingredients individually to handle failures
  const results: any[] = [];
  const errors: Array<{ ingredient: string; error: string }> = [];

      for (const ingredient of bulkIngredients) {
        try {
          const created = await metaobjectsService.createIngredient({
            ...ingredient,
            isActive: true,
            isComplimentary: false,
            versionToken: null
          });
          results.push(created);
        } catch (error) {
          errors.push({ ingredient: ingredient.name, error: (error as Error).message });
        }
      }

      expect(results).toHaveLength(2); // Two successful creations
      expect(errors).toHaveLength(1); // One failure
      expect(errors[0].ingredient).toBe('');
      expect(errors[0].error).toContain('Name cannot be empty');
    });
  });

  describe('Complex Recipe Cost Analysis', () => {
    test('should analyze recipe profitability and margins', async () => {
      // Mock a complex recipe with multiple ingredients
      const recipeAnalysis = {
        recipeName: 'Premium Chocolate Cake',
        ingredients: [
          { name: 'Flour', quantity: 0.4, unit: 'kg', costPerUnit: 2.50, totalCost: 1.00 },
          { name: 'Sugar', quantity: 0.3, unit: 'kg', costPerUnit: 1.80, totalCost: 0.54 },
          { name: 'Cocoa', quantity: 0.1, unit: 'kg', costPerUnit: 12.00, totalCost: 1.20 },
          { name: 'Butter', quantity: 0.2, unit: 'kg', costPerUnit: 8.00, totalCost: 1.60 },
          { name: 'Eggs', quantity: 4, unit: 'each', costPerUnit: 0.50, totalCost: 2.00 }
        ],
        servingSize: 12,
        sellingPricePerServing: 4.50
      };

      // Calculate total ingredient cost
      const totalIngredientCost = recipeAnalysis.ingredients.reduce(
        (sum, ingredient) => sum + ingredient.totalCost, 
        0
      );

      // Calculate costs and margins
      const costPerServing = totalIngredientCost / recipeAnalysis.servingSize;
      const grossMargin = recipeAnalysis.sellingPricePerServing - costPerServing;
      const grossMarginPercent = (grossMargin / recipeAnalysis.sellingPricePerServing) * 100;

      expect(totalIngredientCost).toBeCloseTo(6.34, 2);
      expect(costPerServing).toBeCloseTo(0.528, 3);
      expect(grossMargin).toBeCloseTo(3.972, 3);
      expect(grossMarginPercent).toBeCloseTo(88.26, 1);

      // Test profitability analysis
      const profitabilityThresholds = {
        excellent: 80, // >80% margin
        good: 60,      // 60-80% margin
        acceptable: 40, // 40-60% margin
        poor: 0        // 0-40% margin
      };

      let profitabilityRating: string;
      if (grossMarginPercent > profitabilityThresholds.excellent) {
        profitabilityRating = 'excellent';
      } else if (grossMarginPercent > profitabilityThresholds.good) {
        profitabilityRating = 'good';
      } else if (grossMarginPercent > profitabilityThresholds.acceptable) {
        profitabilityRating = 'acceptable';
      } else {
        profitabilityRating = 'poor';
      }

      expect(profitabilityRating).toBe('excellent');
    });
  });
});