/**
 * Integration Test: Ingredient CRUD with All Validations
 * Tests full ingredient lifecycle with all 9 fields
 * Verifies category/unit_type references, validation rules, business logic
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { MetaobjectsService } from '../../app/services/metaobjects';
import { IngredientValidationService } from '../../app/services/ingredient-validation';

describe('Ingredient CRUD Integration', () => {
  let mockGraphQL: jest.MockedFunction<any>;

  beforeEach(() => {
    mockGraphQL = jest.fn();
  });

  test('should create ingredient with all 9 fields successfully', async () => {
    // Mock the GraphQL response for metaobjectCreate
    mockGraphQL.mockResolvedValueOnce({
      data: {
        metaobjectCreate: {
          metaobject: {
            id: 'gid://shopify/Metaobject/11111',
            type: 'ingredient',
            handle: 'all-purpose-flour',
            fields: [
              { key: 'name', value: 'All-Purpose Flour' },
              { key: 'category', value: 'gid://shopify/Metaobject/12345' },
              { key: 'unit_type', value: 'gid://shopify/Metaobject/67890' },
              { key: 'quantity_on_hand', value: '5000' },
              { key: 'cost_per_unit', value: '0.005' },
              { key: 'sku', value: 'FLR001' },
              { key: 'supplier_name', value: 'ABC Grain Suppliers' },
              { key: 'description', value: 'Standard all-purpose baking flour' },
              { key: 'notes', value: 'Reorder when below 1000g' },
              { key: 'is_active', value: 'true' },
              { key: 'deleted_at', value: null }
            ]
          },
          userErrors: []
        }
      }
    });

    const { MetaobjectsService } = await import('../../app/services/metaobjects');
    const service = new MetaobjectsService(mockGraphQL as any);

    const result = await service.createIngredient({
      name: 'All-Purpose Flour',
      category: 'gid://shopify/Metaobject/12345',
      categoryGid: 'gid://shopify/Metaobject/12345',
      unitType: 'gid://shopify/Metaobject/67890',
      unitTypeGid: 'gid://shopify/Metaobject/67890',
      quantityOnHand: 5000,
      costPerUnit: 0.005,
      sku: 'FLR001',
      supplierName: 'ABC Grain Suppliers',
      description: 'Standard all-purpose baking flour',
      notes: 'Reorder when below 1000g',
      isActive: true,
      versionToken: new Date().toISOString()
    });

    expect(result).toBeDefined();
    expect(result.gid).toBe('gid://shopify/Metaobject/11111');
    expect(result.name).toBe('All-Purpose Flour');
    expect(result.sku).toBe('FLR001');
    expect(result.costPerUnit).toBeCloseTo(0.005);
  });

  test('should validate category reference exists and is active', async () => {
    // mock getCategoryByGid -> active
    mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/12345', type: 'ingredient_category', fields: [{ key: 'is_active', value: 'true' }] } } });
    // mock listIngredients for unique-name check (no duplicates)
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [] } } });

    const metaSvc = new MetaobjectsService(mockGraphQL as any);
    const validator = new IngredientValidationService(metaSvc as any);

    const result = await validator.validate({ categoryGid: 'gid://shopify/Metaobject/12345' });
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('should reject ingredient with inactive category', async () => {
    mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/12345', fields: [{ key: 'is_active', value: 'false' }] } } });
    // listIngredients for uniqueness
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [] } } });

    const metaSvc = new MetaobjectsService(mockGraphQL as any);
    const validator = new IngredientValidationService(metaSvc as any);

    const result = await validator.validate({ categoryGid: 'gid://shopify/Metaobject/12345' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'INACTIVE_REFERENCE')).toBe(true);
  });

  test('should reject ingredient with non-existent category', async () => {
    mockGraphQL.mockResolvedValueOnce({ data: { metaobject: null } });
    // listIngredients for uniqueness
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [] } } });

    const metaSvc = new MetaobjectsService(mockGraphQL as any);
    const validator = new IngredientValidationService(metaSvc as any);

    const result = await validator.validate({ categoryGid: 'gid://shopify/Metaobject/does-not-exist' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_REFERENCE')).toBe(true);
  });

  test('should reject negative cost_per_unit', async () => {
    const metaSvc = new MetaobjectsService(mockGraphQL as any);
    const validator = new IngredientValidationService(metaSvc as any);

    const result = await validator.validate({ costPerUnit: -5 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'costPerUnit')).toBe(true);
  });

  test('should reject negative quantity_on_hand', async () => {
    const metaSvc = new MetaobjectsService(mockGraphQL as any);
    const validator = new IngredientValidationService(metaSvc as any);

    const result = await validator.validate({ quantityOnHand: -10 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'quantityOnHand')).toBe(true);
  });

  test('should reject invalid SKU format (non-alphanumeric)', async () => {
    const metaSvc = new MetaobjectsService(mockGraphQL as any);
    const validator = new IngredientValidationService(metaSvc as any);

    const result = await validator.validate({ sku: 'INVALID@SKU!' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'sku')).toBe(true);
  });

  test('should enforce unique ingredient name', async () => {
    // listIngredients returns an existing ingredient with same name
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [ { node: { id: 'gid://shopify/Metaobject/11111', fields: [{ key: 'name', value: 'All-Purpose Flour' }], gid: 'gid://shopify/Metaobject/11111' } } ] } } });

    const metaSvc = new MetaobjectsService(mockGraphQL as any);
    const validator = new IngredientValidationService(metaSvc as any);

    const result = await validator.validate({ name: 'All-Purpose Flour' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'DUPLICATE_NAME')).toBe(true);
  });

  test('should retrieve ingredient by ID with all fields', async () => {
    // Mock get by gid response
    mockGraphQL.mockResolvedValueOnce({ data: { metaobject: { id: 'gid://shopify/Metaobject/11111', type: 'ingredient', fields: [ { key: 'name', value: 'All-Purpose Flour' }, { key: 'cost_per_unit', value: '0.005' }, { key: 'sku', value: 'FLR001' }, { key: 'quantity_on_hand', value: '5000' } ] } } });

    const metaSvc = new MetaobjectsService(mockGraphQL as any);
    const ing = await metaSvc.getIngredient('gid://shopify/Metaobject/11111');

    expect(ing).toBeDefined();
    expect(ing!.gid).toBe('gid://shopify/Metaobject/11111');
    expect(ing!.name).toBe('All-Purpose Flour');
    expect(ing!.costPerUnit).toBeCloseTo(0.005);
    expect(ing!.quantityOnHand).toBe(5000);
  });

  test('should update ingredient successfully', async () => {
    // Mock metaobjectUpdate response
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectUpdate: { metaobject: { id: 'gid://shopify/Metaobject/11111', fields: [ { key: 'cost_per_unit', value: '0.006' }, { key: 'quantity_on_hand', value: '3000' } ] }, userErrors: [] } } });

    const metaSvc = new MetaobjectsService(mockGraphQL as any);
    const updated = await metaSvc.updateIngredient('gid://shopify/Metaobject/11111', { costPerUnit: 0.006, quantityOnHand: 3000 });

    expect(updated).toBeDefined();
    expect(updated.gid).toBe('gid://shopify/Metaobject/11111');
    expect(updated.costPerUnit).toBeCloseTo(0.006);
    expect(updated.quantityOnHand).toBe(3000);
  });

  test('should soft delete ingredient (set is_active = false)', async () => {
    // Mock update (soft delete) response
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectUpdate: { metaobject: { id: 'gid://shopify/Metaobject/11111', fields: [ { key: 'is_active', value: 'false' }, { key: 'deleted_at', value: '2025-09-30T12:00:00Z' } ] }, userErrors: [] } } });

    const metaSvc = new MetaobjectsService(mockGraphQL as any);
    const res = await metaSvc.softDeleteIngredient('gid://shopify/Metaobject/11111');

    expect(res).toBeDefined();
    expect(res.gid).toBe('gid://shopify/Metaobject/11111');
    expect(res.isActive).toBe(false);
    expect(res.deletedAt).toBeDefined();
  });

  test('should list ingredients with pagination', async () => {
    // Mock first page with two items and hasNextPage true
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [ { cursor: 'c1', node: { id: 'gid://shopify/Metaobject/11111', fields: [ { key: 'name', value: 'All-Purpose Flour' }, { key: 'is_active', value: 'true' } ] } }, { cursor: 'c2', node: { id: 'gid://shopify/Metaobject/11112', fields: [ { key: 'name', value: 'Unsalted Butter' }, { key: 'is_active', value: 'true' } ] } } ], pageInfo: { hasNextPage: true, endCursor: 'c2' } } } });
    // Mock second page with one item and hasNextPage false
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjects: { edges: [ { cursor: 'c3', node: { id: 'gid://shopify/Metaobject/11113', fields: [ { key: 'name', value: 'Sugar' }, { key: 'is_active', value: 'true' } ] } } ], pageInfo: { hasNextPage: false, endCursor: 'c3' } } } });

    const metaSvc = new MetaobjectsService(mockGraphQL as any);
    const conn = await metaSvc.listIngredients({ first: 3 });

    expect(conn).toBeDefined();
    expect(conn.edges.length).toBe(3);
    expect(conn.pageInfo.hasNextPage).toBe(false);
  });

  test('should handle optimistic locking with version_token', async () => {
    // Mock update where userErrors indicates version conflict
    mockGraphQL.mockResolvedValueOnce({ data: { metaobjectUpdate: { metaobject: null, userErrors: [ { message: 'Version conflict: object was modified' } ] } } });

    const metaSvc = new MetaobjectsService(mockGraphQL as any);

    await expect(metaSvc.updateIngredient('gid://shopify/Metaobject/11111', { costPerUnit: 0.01, versionToken: 'old-token' })).rejects.toThrow(/Version conflict/i);
  });
});