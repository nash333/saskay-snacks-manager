import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

describe('Unit Type Metaobject Contract', () => {
  let ajv: Ajv;
  let schema: any;

  beforeAll(() => {
    ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);

    const schemaPath = path.join(
      __dirname,
      '../../specs/003-update-the-ingredients/contracts/unit-type-metaobject.schema.json'
    );
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  });

  test('schema should be valid JSON Schema', () => {
    expect(schema).toBeDefined();
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.title).toBe('Ingredient Unit Type Metaobject');
  });

  test('valid unit type metaobject should pass validation', () => {
    const validUnitType = {
      type: 'ingredient_unit_type',
      handle: 'grams',
      fields: {
        name: 'grams',
        abbreviation: 'g',
        type_category: 'weight',
        is_active: true
      },
      createdAt: '2025-09-30T10:00:00Z',
      updatedAt: '2025-09-30T10:00:00Z'
    };

    const validate = ajv.compile(schema);
    const valid = validate(validUnitType);

    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }

    expect(valid).toBe(true);
  });

  test('unit type with volume type_category should pass validation', () => {
    const validUnitType = {
      type: 'ingredient_unit_type',
      handle: 'milliliters',
      fields: {
        name: 'milliliters',
        abbreviation: 'mL',
        type_category: 'volume',
        is_active: true
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(validUnitType);

    expect(valid).toBe(true);
  });

  test('unit type with each type_category should pass validation', () => {
    const validUnitType = {
      type: 'ingredient_unit_type',
      handle: 'pieces',
      fields: {
        name: 'pieces',
        abbreviation: 'pcs',
        type_category: 'each',
        is_active: true
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(validUnitType);

    expect(valid).toBe(true);
  });

  test('unit type without required fields should fail validation', () => {
    const invalidUnitType = {
      type: 'ingredient_unit_type',
      fields: {
        name: 'Test Unit'
        // Missing required fields: type_category, is_active
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidUnitType);

    expect(valid).toBe(false);
    expect(validate.errors).toBeDefined();
  });

  test('unit type with invalid type_category should fail validation', () => {
    const invalidUnitType = {
      type: 'ingredient_unit_type',
      fields: {
        name: 'Test Unit',
        type_category: 'invalid_category', // Must be weight/volume/each
        is_active: true
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidUnitType);

    expect(valid).toBe(false);
  expect(validate.errors?.some(e => e.keyword === 'enum' || e.schemaPath?.includes('enum') || e.message?.includes('enum'))).toBe(true);
  });

  test('unit type with name exceeding max length should fail validation', () => {
    const invalidUnitType = {
      type: 'ingredient_unit_type',
      fields: {
        name: 'A'.repeat(51), // Exceeds 50 character limit
        type_category: 'weight',
        is_active: true
      }
    };

    const validate = ajv.compile(schema);
    const valid = validate(invalidUnitType);

    expect(valid).toBe(false);
  expect(validate.errors?.some(e => e.keyword === 'maxLength' || e.schemaPath?.includes('maxLength') || e.message?.includes('maxLength'))).toBe(true);
  });
});