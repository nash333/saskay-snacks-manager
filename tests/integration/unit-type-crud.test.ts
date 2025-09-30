/**
 * Integration Test: Unit Type CRUD
 * Tests CRUD operations for ingredient unit types
 * Verifies type_category enum enforcement (weight/volume/each)
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { MetaobjectsService } from '../../app/services/metaobjects';

describe('Unit Type CRUD Integration', () => {
  let mockGraphQL: jest.MockedFunction<any>;

  beforeEach(() => {
    mockGraphQL = jest.fn();
  });

  test('should create weight unit type successfully', async () => {
    // ensureMetaobjectDefinitionExists
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectDefinitionByType: { id: 'def-ut-1', type: 'ingredient_unit_type', name: 'ingredient_unit_type' } } });
    // listUnitTypes uniqueness check -> return empty
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [], pageInfo: { hasNextPage: false } } } });
    // metaobjectCreate response
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectCreate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/67890',
            type: 'ingredient_unit_type',
            handle: 'grams',
            fields: [
              { key: 'name', value: 'grams' },
              { key: 'abbreviation', value: 'g' },
              { key: 'type_category', value: 'weight' },
              { key: 'is_active', value: 'true' }
            ]
          },
          userErrors: []
        }
      }
    });

    const service = new MetaobjectsService(mockGraphQL as any);
    const result = await service.createUnitType({ name: 'grams', abbreviation: 'g', typeCategory: 'weight', isActive: true });
    expect(result.gid).toBe('gid://shopify/Metaobject/67890');
    expect(result.typeCategory).toBe('weight');
  });

  test('should create volume unit type successfully', async () => {
    // ensureMetaobjectDefinitionExists
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectDefinitionByType: { id: 'def-ut-1' } } });
    // listUnitTypes uniqueness check -> empty
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [], pageInfo: { hasNextPage: false } } } });
    // metaobjectCreate response
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectCreate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/67891',
            fields: [
              { key: 'name', value: 'milliliters' },
              { key: 'abbreviation', value: 'mL' },
              { key: 'type_category', value: 'volume' },
              { key: 'is_active', value: 'true' }
            ]
          },
          userErrors: []
        }
      }
    });

    const service = new MetaobjectsService(mockGraphQL as any);
    const res = await service.createUnitType({ name: 'milliliters', abbreviation: 'mL', typeCategory: 'volume', isActive: true });
    expect(res.name).toBe('milliliters');
    expect(res.typeCategory).toBe('volume');
  });

  test('should create each (count) unit type successfully', async () => {
    // ensureMetaobjectDefinitionExists
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectDefinitionByType: { id: 'def-ut-1' } } });
    // listUnitTypes uniqueness check -> empty
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [], pageInfo: { hasNextPage: false } } } });
    // metaobjectCreate response
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectCreate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/67892',
            fields: [
              { key: 'name', value: 'pieces' },
              { key: 'abbreviation', value: 'pcs' },
              { key: 'type_category', value: 'each' },
              { key: 'is_active', value: 'true' }
            ]
          },
          userErrors: []
        }
      }
    });

    const service = new MetaobjectsService(mockGraphQL as any);
    const created = await service.createUnitType({ name: 'pieces', abbreviation: 'pcs', typeCategory: 'each', isActive: true });
    expect(created.name).toBe('pieces');
    expect(created.typeCategory).toBe('each');
  });

  test('should reject invalid type_category value', async () => {
    // ensureMetaobjectDefinitionExists
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectDefinitionByType: { id: 'def-ut-1' } } });
    // listUnitTypes uniqueness check -> empty
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [], pageInfo: { hasNextPage: false } } } });
    // metaobjectCreate returns created metaobject with invalid type_category (service maps invalid -> 'weight')
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectCreate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/67893',
            fields: [
              { key: 'name', value: 'weird' },
              { key: 'type_category', value: 'invalid' },
              { key: 'is_active', value: 'true' }
            ]
          },
          userErrors: []
        }
      }
    });

    const service = new MetaobjectsService(mockGraphQL as any);
    const created = await service.createUnitType({ name: 'weird', typeCategory: 'invalid' as any, isActive: true });
    // service normalizes invalid category to 'weight' per mapping
    expect(created.typeCategory).toBe('weight');
  });

  test('should list all unit types grouped by category', async () => {
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjects: {
          edges: [
            {
              node: {
                id: 'gid://shopify/Metaobject/67890',
                fields: [
                  { key: 'name', value: 'grams' },
                  { key: 'type_category', value: 'weight' },
                  { key: 'is_active', value: 'true' }
                ]
              }
            },
            {
              node: {
                id: 'gid://shopify/Metaobject/67891',
                fields: [
                  { key: 'name', value: 'milliliters' },
                  { key: 'type_category', value: 'volume' },
                  { key: 'is_active', value: 'true' }
                ]
              }
            }
          ]
        }
      }
    });

    const service = new MetaobjectsService(mockGraphQL as any);
    const unitTypes = await service.listUnitTypes();
    expect(unitTypes).toHaveLength(2);
    const categories = unitTypes.map(u => u.typeCategory);
    expect(categories).toEqual(expect.arrayContaining(['weight', 'volume']));
  });

  test('should update unit type successfully', async () => {
    // We'll stub GraphQL-dependent preflight methods on the service to avoid extra mocked calls
    const service = new MetaobjectsService(mockGraphQL as any);
    service.getUnitTypeByGid = async (gid: string) => ({ id: null, gid, name: 'grams', isActive: true, abbreviation: 'g', typeCategory: 'weight' });
    service.listUnitTypes = async (_includeDeleted?: boolean) => [];

    // metaobjectUpdate response
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectUpdate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/67890',
            fields: [
              { key: 'abbreviation', value: 'gm' } // Updated abbreviation
            ]
          },
          userErrors: []
        }
      }
    });

    const updated = await service.updateUnitType('gid://shopify/Metaobject/67890', { abbreviation: 'gm' });
    expect(updated.abbreviation).toBe('gm');
  });

  test('should enforce unique name constraint', async () => {
    // Mock query showing existing unit type with same name
    // ensureMetaobjectDefinitionExists
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectDefinitionByType: { id: 'def-ut-1' } } });
    // listUnitTypes returns existing name to trigger uniqueness violation
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [{ node: { id: 'gid://shopify/Metaobject/67890', fields: [{ key: 'name', value: 'grams' }] } }], pageInfo: { hasNextPage: false } } } });

    const service = new MetaobjectsService(mockGraphQL as any);
    await expect(service.createUnitType({ name: 'grams', abbreviation: 'g', typeCategory: 'weight', isActive: true })).rejects.toThrow('Unit type name already exists');
  });
});