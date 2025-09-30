import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

describe('Recipe Metaobject Contract', () => {
  let ajv: Ajv;
  let schema: any;

  beforeAll(() => {
    ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);

    const schemaPath = path.join(
      __dirname,
      '../../specs/003-update-the-ingredients/contracts/recipe-metaobject.schema.json'
    );
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  });

  test('schema should be valid JSON Schema', () => {
    expect(schema).toBeDefined();
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.title).toBe('Recipe Metaobject');
  });

  test('valid recipe metaobject should pass validation', () => {
    const validRecipe = {
      type: 'recipe',
      handle: 'basic-white-bread',
      fields: {
        name: 'Basic White Bread',
        description: 'Simple white bread recipe using flour, water, yeast, and salt',
        ingredients: [
          {
            gid: 'gid://shopify/Metaobject/12345',
            type: 'ingredient'
          },
          {
            gid: 'gid://shopify/Metaobject/12346',
            type: 'ingredient'
          }
        ],
        ingredient_quantities: [
          {
            ingredient_gid: 'gid://shopify/Metaobject/12345',
            quantity_needed: 500,
            unit_type_gid: 'gid://shopify/Metaobject/67890'
          },
          {
            ingredient_gid: 'gid://shopify/Metaobject/12346',
            quantity_needed: 300,
            unit_type_gid: 'gid://shopify/Metaobject/67891'
          }
        ],
        is_active: true,
        created_at: '2025-09-30T10:30:00Z',
        updated_at: '2025-09-30T10:30:00Z'
      },
      createdAt: '2025-09-30T10:30:00Z',
      updatedAt: '2025-09-30T10:30:00Z'
    };

    const validate = ajv.compile(schema);
    const valid = validate(validRecipe);

    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }

    expect(valid).toBe(true);
  });

  test('recipe without required fields should fail validation', () => {
    const invalidRecipe = {
      type: 'recipe',
      fields: {
        name: 'Test Recipe'
        // Missing required fields: ingredients, ingredient_quantities, is_active
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidRecipe);

    expect(valid).toBe(false);
    expect(validate.errors).toBeDefined();
  });

  test('recipe with empty ingredients array should fail validation', () => {
    const invalidRecipe = {
      type: 'recipe',
      fields: {
        name: 'Test Recipe',
        ingredients: [], // Invalid: must have at least 1 ingredient
        ingredient_quantities: [],
        is_active: true
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidRecipe);

    expect(valid).toBe(false);
  expect(validate.errors?.some(e => e.keyword === 'minItems' || e.schemaPath?.includes('minItems') || e.message?.includes('minItems'))).toBe(true);
  });

  test('recipe with zero quantity_needed should fail validation', () => {
    const invalidRecipe = {
      type: 'recipe',
      fields: {
        name: 'Test Recipe',
        ingredients: [
          {
            gid: 'gid://shopify/Metaobject/12345',
            type: 'ingredient'
          }
        ],
        ingredient_quantities: [
          {
            ingredient_gid: 'gid://shopify/Metaobject/12345',
            quantity_needed: 0, // Invalid: must be greater than 0
            unit_type_gid: 'gid://shopify/Metaobject/67890'
          }
        ],
        is_active: true
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidRecipe);

    expect(valid).toBe(false);
  expect(validate.errors?.some(e => e.keyword === 'exclusiveMinimum' || e.schemaPath?.includes('exclusiveMinimum') || e.message?.includes('exclusiveMinimum'))).toBe(true);
  });

  test('recipe with invalid ingredient GID format should fail validation', () => {
    const invalidRecipe = {
      type: 'recipe',
      fields: {
        name: 'Test Recipe',
        ingredients: [
          {
            gid: 'invalid-gid', // Invalid format
            type: 'ingredient'
          }
        ],
        ingredient_quantities: [
          {
            ingredient_gid: 'invalid-gid',
            quantity_needed: 100,
            unit_type_gid: 'gid://shopify/Metaobject/67890'
          }
        ],
        is_active: true
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidRecipe);

    expect(valid).toBe(false);
  expect(validate.errors?.some(e => e.keyword === 'pattern' || e.schemaPath?.includes('pattern') || e.message?.includes('pattern'))).toBe(true);
  });
});