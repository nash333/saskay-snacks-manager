/**
 * Integration Test: Category CRUD with Uniqueness Validation
 * Tests create, read, update, delete operations for ingredient categories
 * Verifies unique name constraint enforcement
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { MetaobjectsService } from '../../app/services/metaobjects';

describe('Category CRUD Integration', () => {
  let mockGraphQL: jest.MockedFunction<any>;

  beforeEach(() => {
    mockGraphQL = jest.fn();
  });

  test('should create a new category successfully', async () => {
    // Mock successful metaobjectCreate response
    // ensureMetaobjectDefinitionExists query (returns exists)
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectDefinitionByType: { id: 'def1', type: 'ingredient_category', name: 'ingredient_category' } } });

    // listCategories (called to check uniqueness) - return empty
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [], pageInfo: { hasNextPage: false } } } });

    // metaobjectCreate response
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectCreate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/12345',
            type: 'ingredient_category',
            handle: 'grains-flour',
            fields: [
              { key: 'name', value: 'Grains & Flour' },
              { key: 'description', value: 'Flour, grains, and grain-based products' },
              { key: 'display_order', value: '10' },
              { key: 'is_active', value: 'true' }
            ]
          },
          userErrors: []
        }
      }
    });

    const service = new MetaobjectsService(mockGraphQL as any);
    const result = await service.createCategory({ name: 'Grains & Flour', isActive: true });

    expect(result.gid).toBe('gid://shopify/Metaobject/12345');
    expect(result.name).toBe('Grains & Flour');
  });

  test('should retrieve category by ID', async () => {
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobject: {
          id: 'gid://shopify/Metaobject/12345',
          type: 'ingredient_category',
          fields: [
            { key: 'name', value: 'Grains & Flour' },
            { key: 'is_active', value: 'true' }
          ]
        }
      }
    });
    const service = new MetaobjectsService(mockGraphQL as any);
    const cat = await service.getCategoryByGid('gid://shopify/Metaobject/12345');
    expect(cat).not.toBeNull();
    expect(cat!.name).toBe('Grains & Flour');
    expect(cat!.isActive).toBe(true);
  });

  test('should list all active categories', async () => {
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjects: {
          edges: [
            {
              node: {
                id: 'gid://shopify/Metaobject/12345',
                fields: [
                  { key: 'name', value: 'Grains & Flour' },
                  { key: 'display_order', value: '10' },
                  { key: 'is_active', value: 'true' }
                ]
              }
            },
            {
              node: {
                id: 'gid://shopify/Metaobject/12346',
                fields: [
                  { key: 'name', value: 'Dairy Products' },
                  { key: 'display_order', value: '20' },
                  { key: 'is_active', value: 'true' }
                ]
              }
            }
          ],
          pageInfo: {
            hasNextPage: false
          }
        }
      }
    });
    const service = new MetaobjectsService(mockGraphQL as any);
    const categories = await service.listCategories();
    expect(categories).toHaveLength(2);
    const names = categories.map(c => c.name);
    expect(names).toEqual(expect.arrayContaining(['Grains & Flour', 'Dairy Products']));
  });

  test('should update category successfully', async () => {
    // getCategoryByGid preflight
    mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/12345', fields: [{ key: 'name', value: 'Grains & Flour' }, { key: 'is_active', value: 'true' }] } } });
    // listCategories for uniqueness check
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [], pageInfo: { hasNextPage: false } } } });
    // metaobjectUpdate response
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectUpdate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/12345',
            fields: [
              { key: 'name', value: 'Grains, Flour & Cereals' },
              { key: 'display_order', value: '15' }
            ]
          },
          userErrors: []
        }
      }
    });

    const service = new MetaobjectsService(mockGraphQL as any);
    const updated = await service.updateCategory('gid://shopify/Metaobject/12345', { name: 'Grains, Flour & Cereals' });
    expect(updated.name).toBe('Grains, Flour & Cereals');
  });

  test('should enforce unique name constraint on create', async () => {
    // First, mock query to check for existing category
    // ensureMetaobjectDefinitionExists
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectDefinitionByType: { id: 'def1' } } });
    // listCategories returns existing name
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [{ node: { id: 'gid://shopify/Metaobject/12345', fields: [{ key: 'name', value: 'Grains & Flour' }] } }], pageInfo: { hasNextPage: false } } } });

    const service = new MetaobjectsService(mockGraphQL as any);
    await expect(service.createCategory({ name: 'Grains & Flour', isActive: true })).rejects.toThrow('Category name already exists');
  });

  test('should soft delete category (set is_active to false)', async () => {
    // Mock successful update setting is_active = false
    // checkCategoryDeletionDependencies returns no ingredients
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [], pageInfo: { hasNextPage: false } } } });
    // metaobjectUpdate response for soft delete
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectUpdate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/12345',
            fields: [
              { key: 'name', value: 'Grains & Flour' },
              { key: 'is_active', value: 'false' },
              { key: 'deleted_at', value: '2025-09-30T12:00:00Z' }
            ]
          },
          userErrors: []
        }
      }
    });

    const service = new MetaobjectsService(mockGraphQL as any);
    const res = await service.softDeleteCategory('gid://shopify/Metaobject/12345');
    expect(res.isActive).toBe(false);
  });

  test('should handle validation errors from Shopify API', async () => {
    // ensureMetaobjectDefinitionExists
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectDefinitionByType: { id: 'def1' } } });
    // listCategories (called to check uniqueness) - return empty so creation proceeds
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [], pageInfo: { hasNextPage: false } } } });
    // metaobjectCreate returns userErrors
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectCreate: {
          metaobject: null,
          userErrors: [
            {
              field: ['name'],
              message: 'Name is required'
            }
          ]
        }
      }
    });

    const service = new MetaobjectsService(mockGraphQL as any);
    await expect(service.createCategory({ name: '', isActive: true })).rejects.toThrow('Failed to create category');
  });
});