import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

describe('Ingredient Metaobject Contract', () => {
  let ajv: Ajv;
  let schema: any;

  beforeAll(() => {
    ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);

    const schemaPath = path.join(
      __dirname,
      '../../specs/003-update-the-ingredients/contracts/ingredient-metaobject.schema.json'
    );
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  });

  test('schema should be valid JSON Schema', () => {
    expect(schema).toBeDefined();
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.title).toBe('Ingredient Metaobject');
  });

  test('valid ingredient metaobject should pass validation', () => {
    const validIngredient = {
      type: 'ingredient',
      handle: 'all-purpose-flour',
      fields: {
        name: 'All-Purpose Flour',
        category: {
          gid: 'gid://shopify/Metaobject/12345',
          type: 'ingredient_category'
        },
        unit_type: {
          gid: 'gid://shopify/Metaobject/67890',
          type: 'ingredient_unit_type'
        },
        quantity_on_hand: 5000,
        cost_per_unit: 0.005,
        sku: 'FLR-001',
        supplier_name: 'ABC Grain Suppliers',
        description: 'Standard all-purpose baking flour',
        notes: 'Reorder when quantity drops below 1000g',
        is_active: true,
        deleted_at: null,
        version_token: '2025-09-30T10:30:00Z',
        used_in_recipes: [
          {
            gid: 'gid://shopify/Metaobject/99999',
            type: 'recipe'
          }
        ]
      },
      createdAt: '2025-09-30T10:30:00Z',
      updatedAt: '2025-09-30T10:30:00Z'
    };

    const validate = ajv.compile(schema);
    const valid = validate(validIngredient);

    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }

    expect(valid).toBe(true);
  });

  test('ingredient without required fields should fail validation', () => {
    const invalidIngredient = {
      type: 'ingredient',
      fields: {
        name: 'Test Ingredient'
        // Missing required fields: category, unit_type, cost_per_unit, is_active
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidIngredient);

    expect(valid).toBe(false);
    expect(validate.errors).toBeDefined();
    expect(validate.errors?.some(e => e.message?.includes('required'))).toBe(true);
  });

  test('ingredient with negative cost_per_unit should fail validation', () => {
    const invalidIngredient = {
      type: 'ingredient',
      fields: {
        name: 'Test Ingredient',
        category: {
          gid: 'gid://shopify/Metaobject/12345',
          type: 'ingredient_category'
        },
        unit_type: {
          gid: 'gid://shopify/Metaobject/67890',
          type: 'ingredient_unit_type'
        },
        cost_per_unit: -5, // Invalid: negative cost
        is_active: true
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidIngredient);

    expect(valid).toBe(false);
  expect(validate.errors?.some(e => e.keyword === 'minimum' || e.schemaPath?.includes('minimum') || e.message?.includes('minimum'))).toBe(true);
  });

  test('ingredient with invalid GID format should fail validation', () => {
    const invalidIngredient = {
      type: 'ingredient',
      fields: {
        name: 'Test Ingredient',
        category: {
          gid: 'invalid-gid-format', // Invalid: not Shopify GID format
          type: 'ingredient_category'
        },
        unit_type: {
          gid: 'gid://shopify/Metaobject/67890',
          type: 'ingredient_unit_type'
        },
        cost_per_unit: 0.005,
        is_active: true
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidIngredient);

    expect(valid).toBe(false);
  expect(validate.errors?.some(e => e.keyword === 'pattern' || e.schemaPath?.includes('pattern') || e.message?.includes('pattern'))).toBe(true);
  });

  test('ingredient with invalid SKU format should fail validation', () => {
    const invalidIngredient = {
      type: 'ingredient',
      fields: {
        name: 'Test Ingredient',
        category: {
          gid: 'gid://shopify/Metaobject/12345',
          type: 'ingredient_category'
        },
        unit_type: {
          gid: 'gid://shopify/Metaobject/67890',
          type: 'ingredient_unit_type'
        },
        cost_per_unit: 0.005,
        sku: 'INVALID@SKU!', // Invalid: contains special characters
        is_active: true
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidIngredient);

    expect(valid).toBe(false);
  });

  test('ingredient with name exceeding max length should fail validation', () => {
    const invalidIngredient = {
      type: 'ingredient',
      fields: {
        name: 'A'.repeat(256), // Invalid: exceeds 255 character limit
        category: {
          gid: 'gid://shopify/Metaobject/12345',
          type: 'ingredient_category'
        },
        unit_type: {
          gid: 'gid://shopify/Metaobject/67890',
          type: 'ingredient_unit_type'
        },
        cost_per_unit: 0.005,
        is_active: true
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidIngredient);

    expect(valid).toBe(false);
  expect(validate.errors?.some(e => e.keyword === 'maxLength' || e.schemaPath?.includes('maxLength') || e.message?.includes('maxLength'))).toBe(true);
  });
});