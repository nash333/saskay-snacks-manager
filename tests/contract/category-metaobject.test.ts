import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

describe('Category Metaobject Contract', () => {
  let ajv: Ajv;
  let schema: any;

  beforeAll(() => {
    ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);

    const schemaPath = path.join(
      __dirname,
      '../../specs/003-update-the-ingredients/contracts/category-metaobject.schema.json'
    );
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  });

  test('schema should be valid JSON Schema', () => {
    expect(schema).toBeDefined();
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.title).toBe('Ingredient Category Metaobject');
  });

  test('valid category metaobject should pass validation', () => {
    const validCategory = {
      type: 'ingredient_category',
      handle: 'grains-flour',
      fields: {
        name: 'Grains & Flour',
        description: 'Flour, grains, and grain-based products',
        display_order: 10,
        is_active: true
      },
      createdAt: '2025-09-30T10:00:00Z',
      updatedAt: '2025-09-30T10:00:00Z'
    };

    const validate = ajv.compile(schema);
    const valid = validate(validCategory);

    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }

    expect(valid).toBe(true);
  });

  test('category without required fields should fail validation', () => {
    const invalidCategory = {
      type: 'ingredient_category',
      fields: {
        description: 'Test description'
        // Missing required fields: name, is_active
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidCategory);

    expect(valid).toBe(false);
    expect(validate.errors).toBeDefined();
  });

  test('category with name exceeding max length should fail validation', () => {
    const invalidCategory = {
      type: 'ingredient_category',
      fields: {
        name: 'A'.repeat(101), // Exceeds 100 character limit
        is_active: true
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidCategory);

    expect(valid).toBe(false);
  expect(validate.errors?.some(e => e.keyword === 'maxLength' || e.schemaPath?.includes('maxLength') || e.message?.includes('maxLength'))).toBe(true);
  });

  test('category with negative display_order should fail validation', () => {
    const invalidCategory = {
      type: 'ingredient_category',
      fields: {
        name: 'Test Category',
        display_order: -1, // Invalid: negative value
        is_active: true
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidCategory);

    expect(valid).toBe(false);
  });
});