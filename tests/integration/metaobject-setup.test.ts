/**
 * Integration Test: Metaobject Setup Flow
 * Tests creating ingredient/category/unit_type/recipe definitions via Shopify GraphQL API
 *
 * This test uses mocked GraphQL responses since we're testing the service layer,
 * not the actual Shopify API.
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { createMetaobjectDefinition, checkMetaobjectDefinitionExists } from '../../scripts/setup-metaobjects';

describe('Metaobject Setup Integration', () => {
  let mockGraphQL: jest.MockedFunction<any>;

  beforeEach(() => {
    // Mock Shopify GraphQL client
    mockGraphQL = jest.fn();
  });

  test('should create ingredient metaobject definition', async () => {
    // Preflight: check if definition exists -> return null (does not exist)
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectDefinitionByType: null } });

    // Mock successful metaobjectDefinitionCreate response
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectDefinitionCreate: {
          metaobjectDefinition: {
            id: 'gid://shopify/MetaobjectDefinition/ingredient',
            type: 'ingredient',
            fieldDefinitions: [
              { key: 'name', type: { name: 'single_line_text' } },
              { key: 'category', type: { name: 'metaobject_reference' } },
              { key: 'unit_type', type: { name: 'metaobject_reference' } }
            ]
          },
          userErrors: []
        }
      }
    });

    // Call createMetaobjectDefinition directly with the mocked GraphQL client
    const result = await createMetaobjectDefinition(mockGraphQL as any, {
      type: 'ingredient',
      name: 'Ingredient',
      fieldDefinitions: [
        { key: 'name', type: { name: 'single_line_text' } }
      ]
    });

    expect(result).toBeDefined();
    expect(result.type).toBe('ingredient');
    // GraphQL should have been called twice (check + create)
    expect(mockGraphQL).toHaveBeenCalledTimes(2);
  });

  test('should create category metaobject definition', async () => {
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectDefinitionByType: null } });
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectDefinitionCreate: {
          metaobjectDefinition: {
            id: 'gid://shopify/MetaobjectDefinition/ingredient_category',
            type: 'ingredient_category',
            fieldDefinitions: [
              { key: 'name', type: { name: 'single_line_text' } },
              { key: 'is_active', type: { name: 'boolean' } }
            ]
          },
          userErrors: []
        }
      }
    });

    const result = await createMetaobjectDefinition(mockGraphQL as any, {
      type: 'ingredient_category',
      name: 'Ingredient Category',
      fieldDefinitions: []
    });
    expect(result).toBeDefined();
    expect(result.type).toBe('ingredient_category');
    expect(mockGraphQL).toHaveBeenCalledTimes(2);
  });

  test('should create unit_type metaobject definition', async () => {
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectDefinitionByType: null } });
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectDefinitionCreate: {
          metaobjectDefinition: {
            id: 'gid://shopify/MetaobjectDefinition/ingredient_unit_type',
            type: 'ingredient_unit_type',
            fieldDefinitions: [
              { key: 'name', type: { name: 'single_line_text' } },
              { key: 'type_category', type: { name: 'single_line_text' } },
              { key: 'is_active', type: { name: 'boolean' } }
            ]
          },
          userErrors: []
        }
      }
    });

    const result = await createMetaobjectDefinition(mockGraphQL as any, {
      type: 'ingredient_unit_type',
      name: 'Unit Type',
      fieldDefinitions: []
    });
    expect(result).toBeDefined();
    expect(result.type).toBe('ingredient_unit_type');
    expect(mockGraphQL).toHaveBeenCalledTimes(2);
  });

  test('should create recipe metaobject definition', async () => {
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectDefinitionByType: null } });
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectDefinitionCreate: {
          metaobjectDefinition: {
            id: 'gid://shopify/MetaobjectDefinition/recipe',
            type: 'recipe',
            fieldDefinitions: [
              { key: 'name', type: { name: 'single_line_text' } },
              { key: 'ingredients', type: { name: 'list.metaobject_reference' } },
              { key: 'is_active', type: { name: 'boolean' } }
            ]
          },
          userErrors: []
        }
      }
    });

    const result = await createMetaobjectDefinition(mockGraphQL as any, {
      type: 'recipe',
      name: 'Recipe',
      fieldDefinitions: []
    });
    expect(result).toBeDefined();
    expect(result.type).toBe('recipe');
    expect(mockGraphQL).toHaveBeenCalledTimes(2);
  });

  test('should return true when metaobject definition already exists', async () => {
    // Mock query response showing definition exists for metaobjectDefinitionByType
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectDefinitionByType: { id: 'gid://shopify/MetaobjectDefinition/ingredient', type: 'ingredient' } } });

    // Use checkMetaobjectDefinitionExists to exercise the existence-check path
    const exists = await checkMetaobjectDefinitionExists(mockGraphQL as any, 'ingredient');
    expect(exists).toBe(true);
  });

  test('should handle API errors gracefully', async () => {
    mockGraphQL.mockRejectedValueOnce(new Error('GraphQL API Error'));

    await expect(createMetaobjectDefinition(mockGraphQL as any, { type: 'will_fail', name: 'Will Fail', fieldDefinitions: [] })).rejects.toThrow();
  });
});