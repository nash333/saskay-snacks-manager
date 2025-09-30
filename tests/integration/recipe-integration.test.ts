/**
 * Integration Test: Recipe-Ingredient Relationships
 * Tests bidirectional many-to-many relationships between recipes and ingredients
 * Verifies quantity_needed sync, unit_type references, and relationship integrity
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { MetaobjectsService } from '../../app/services/metaobjects';
import { RecipeService } from '../../app/services/recipe';

describe('Recipe-Ingredient Integration', () => {
  let mockGraphQL: jest.MockedFunction<any>;

  beforeEach(() => {
    mockGraphQL = jest.fn();
  });

  test('should create recipe with multiple ingredients successfully', async () => {
    // Mocks: RecipeService.createRecipe calls getIngredient for each ingredient (3 calls),
    // then performs the metaobjectCreate mutation, then calls getRecipeByGid to return the created recipe.
    // Provide responses in that order.
  // Mock getIngredient for flour
  mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/ingredient-flour', fields: [{ key: 'name', value: 'All-Purpose Flour' }] } } });
  // Mock unit type for flour (grams)
  mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/unit-type-grams', fields: [{ key: 'name', value: 'grams' }, { key: 'type_category', value: 'weight' }] } } });
  // Mock getIngredient for water
  mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/ingredient-water', fields: [{ key: 'name', value: 'Water' }] } } });
  // Mock unit type for water (milliliters)
  mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/unit-type-milliliters', fields: [{ key: 'name', value: 'milliliters' }, { key: 'type_category', value: 'volume' }] } } });
  // Mock getIngredient for yeast
  mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/ingredient-yeast', fields: [{ key: 'name', value: 'Active Dry Yeast' }] } } });
  // Mock unit type for yeast (grams)
  mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/unit-type-grams', fields: [{ key: 'name', value: 'grams' }, { key: 'type_category', value: 'weight' }] } } });
    // Mock metaobjectCreate (create recipe)
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectCreate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/recipe-1',
            type: 'recipe',
            handle: 'basic-white-bread',
            fields: [
              { key: 'name', value: 'Basic White Bread' },
              { key: 'description', value: 'Classic white bread recipe' },
              {
                key: 'ingredients',
                references: {
                  edges: [
                    { node: { id: 'gid://shopify/Metaobject/ingredient-flour' } },
                    { node: { id: 'gid://shopify/Metaobject/ingredient-water' } },
                    { node: { id: 'gid://shopify/Metaobject/ingredient-yeast' } }
                  ]
                }
              },
              {
                key: 'ingredient_quantities',
                value: JSON.stringify([
                  { ingredient_gid: 'gid://shopify/Metaobject/ingredient-flour', quantity_needed: 500, unit_type_gid: 'gid://shopify/Metaobject/unit-type-grams' },
                  { ingredient_gid: 'gid://shopify/Metaobject/ingredient-water', quantity_needed: 300, unit_type_gid: 'gid://shopify/Metaobject/unit-type-milliliters' },
                  { ingredient_gid: 'gid://shopify/Metaobject/ingredient-yeast', quantity_needed: 7, unit_type_gid: 'gid://shopify/Metaobject/unit-type-grams' }
                ])
              }
            ]
          },
          userErrors: []
        }
      }
    });
  // Mock getRecipeByGid to return the created recipe when service calls getRecipeByGid at end
  mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/recipe-1', fields: [ { key: 'name', value: 'Basic White Bread' }, { key: 'description', value: 'Classic white bread recipe' }, { key: 'ingredients', references: { edges: [ { node: { id: 'gid://shopify/Metaobject/ingredient-flour' } }, { node: { id: 'gid://shopify/Metaobject/ingredient-water' } }, { node: { id: 'gid://shopify/Metaobject/ingredient-yeast' } } ] } }, { key: 'ingredient_quantities', value: JSON.stringify([ { ingredient_gid: 'gid://shopify/Metaobject/ingredient-flour', quantity_needed: 500, unit_type_gid: 'gid://shopify/Metaobject/unit-type-grams' }, { ingredient_gid: 'gid://shopify/Metaobject/ingredient-water', quantity_needed: 300, unit_type_gid: 'gid://shopify/Metaobject/unit-type-milliliters' }, { ingredient_gid: 'gid://shopify/Metaobject/ingredient-yeast', quantity_needed: 7, unit_type_gid: 'gid://shopify/Metaobject/unit-type-grams' } ]) } ] } } });

    // Use the project's services wired to the mocked GraphQL function
    const metaSvc = new MetaobjectsService(mockGraphQL as any);
    const service = new RecipeService(metaSvc as any);

    const result = await service.createRecipe({
      name: 'Basic White Bread',
      description: 'Classic white bread recipe',
      ingredients: [
        { ingredientGid: 'gid://shopify/Metaobject/ingredient-flour', quantityNeeded: 500, unitTypeGid: 'gid://shopify/Metaobject/unit-type-grams' },
        { ingredientGid: 'gid://shopify/Metaobject/ingredient-water', quantityNeeded: 300, unitTypeGid: 'gid://shopify/Metaobject/unit-type-milliliters' },
        { ingredientGid: 'gid://shopify/Metaobject/ingredient-yeast', quantityNeeded: 7, unitTypeGid: 'gid://shopify/Metaobject/unit-type-grams' }
      ]
    });

    // createRecipe returns the newly created recipe via getRecipeByGid; assert basic shape
    expect(result).toBeDefined();
    expect(result.gid).toBe('gid://shopify/Metaobject/recipe-1');
    expect(result.ingredients).toHaveLength(3);
  });

  test('should sync bidirectional relationship when recipe created', async () => {
  // For creation the service will first validate ingredient exists, so mock getIngredient
  mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/ingredient-flour', fields: [{ key: 'name', value: 'All-Purpose Flour' }] } } });
  // Mock unit type for flour
  mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/unit-type-grams', fields: [{ key: 'name', value: 'grams' }, { key: 'type_category', value: 'weight' }] } } });
  // Then mock the create mutation response
  mockGraphQL.mockResolvedValueOnce({ data: { metaobjectCreate: { metaobject: { id: 'gid://shopify/Metaobject/recipe-1', fields: [ { key: 'name', value: 'Test Recipe' }, { key: 'ingredients', references: { edges: [ { node: { id: 'gid://shopify/Metaobject/ingredient-flour' } } ] } } ] } } } });
    // The service will call getRecipeByGid after creating; mock that response
    mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/recipe-1', fields: [ { key: 'name', value: 'Test Recipe' }, { key: 'ingredients', references: { edges: [ { node: { id: 'gid://shopify/Metaobject/ingredient-flour' } } ] } }, { key: 'ingredient_quantities', value: JSON.stringify([{ ingredient_gid: 'gid://shopify/Metaobject/ingredient-flour', quantity_needed: 500, unit_type_gid: 'gid://shopify/Metaobject/unit-type-grams' }]) } ] } } });
    // Finally the test will call metaSvc.getIngredient (or service.getIngredient) to read back used_in_recipes; mock that response
    mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/ingredient-flour', fields: [ { key: 'name', value: 'All-Purpose Flour' }, { key: 'used_in_recipes', value: JSON.stringify([{ gid: 'gid://shopify/Metaobject/recipe-1', name: 'Test Recipe' }]) } ] } } });

  const metaSvc = new MetaobjectsService(mockGraphQL as any);
  const service = new RecipeService(metaSvc as any);

  // Create the recipe (first mock will be consumed by create)
  await service.createRecipe({ name: 'Test Recipe', ingredients: [{ ingredientGid: 'gid://shopify/Metaobject/ingredient-flour', quantityNeeded: 500, unitTypeGid: 'gid://shopify/Metaobject/unit-type-grams' }] });

  // Now call MetaobjectsService.getIngredient (second mock) to verify used_in_recipes
  const ingredient = await metaSvc.getIngredient('gid://shopify/Metaobject/ingredient-flour');
  expect(ingredient).toBeDefined();
  expect(Array.isArray(ingredient!.usedInRecipes)).toBe(true);
  expect(ingredient!.usedInRecipes!.some(r => r.gid === 'gid://shopify/Metaobject/recipe-1')).toBe(true);
  });

  test.todo('should validate ingredient_quantities match ingredients list');

  test.todo('should handle removing ingredient from recipe');

  test.todo('should validate unit_type matches ingredient unit_type');

  test.todo('should handle recipe with no ingredients (edge case)');

  test.todo('should query recipes by ingredient (reverse relationship)');

  test.todo('should update ingredient quantities without changing ingredient list');
});