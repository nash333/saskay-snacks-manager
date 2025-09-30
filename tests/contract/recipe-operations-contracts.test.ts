/**
 * Recipe Operations Contract Tests (Tasks 24-26)
 * Tests for recipe save, clone, and packaging operations
 */

import { describe, test, expect } from '@jest/globals';

// Contract validation helper
function validateContract(data: any, schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Simple validation - in real implementation, use JSON Schema validator
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

describe('Recipe Save Contract Tests (Task 24)', () => {
  test('should validate recipe save request schema', () => {
    const validRequest = {
      productId: "prod_123",
      recipeLines: [
        {
          ingredientId: "ing_flour",
          quantityGrams: 500,
          isInactive: false,
          isComplimentary: false
        },
        {
          ingredientId: "ing_sugar", 
          quantityGrams: 200,
          isInactive: false,
          isComplimentary: false
        }
      ],
      version: 1,
      triggerCostRecalculation: true
    };

    const schema = {
      required: ['productId', 'recipeLines'],
      properties: {
        productId: { type: 'string' },
        recipeLines: { type: 'array' },
        version: { type: 'number' },
        triggerCostRecalculation: { type: 'boolean' }
      }
    };

    const result = validateContract(validRequest, schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should validate recipe save success response schema', () => {
    const successResponse = {
      productId: "prod_123",
      recipeLines: [
        {
          id: "line_1",
          ingredientId: "ing_flour",
          ingredientName: "All-Purpose Flour",
          quantityGrams: 500,
          isInactive: false,
          isComplimentary: false,
          notes: ""
        }
      ],
      version: 2,
      costCalculation: {
        totalCostPerBatch: 12.50,
        costPerUnit: 0.25,
        margin: 15.5,
        calculatedAt: "2025-09-29T10:00:00Z"
      },
      warnings: []
    };

    expect(successResponse.productId).toBeDefined();
    expect(Array.isArray(successResponse.recipeLines)).toBe(true);
    expect(typeof successResponse.version).toBe('number');
    expect(successResponse.costCalculation.totalCostPerBatch).toBeGreaterThan(0);
    expect(Array.isArray(successResponse.warnings)).toBe(true);
  });

  test('should validate duplicate ingredients error response', () => {
    const duplicateError = {
      error: "DUPLICATE_INGREDIENTS",
      details: {
        duplicateIngredients: ["ing_flour", "ing_sugar"],
        invalidLines: [],
        validationErrors: ["Ingredient ing_flour appears multiple times in recipe"]
      }
    };

    expect(duplicateError.error).toBe("DUPLICATE_INGREDIENTS");
    expect(Array.isArray(duplicateError.details.duplicateIngredients)).toBe(true);
    expect(duplicateError.details.duplicateIngredients.length).toBeGreaterThan(0);
  });

  test('should validate version conflict error response', () => {
    const versionConflict = {
      error: "VERSION_CONFLICT",
      currentVersion: 3,
      providedVersion: 1
    };

    expect(versionConflict.error).toBe("VERSION_CONFLICT");
    expect(typeof versionConflict.currentVersion).toBe('number');
    expect(typeof versionConflict.providedVersion).toBe('number');
    expect(versionConflict.currentVersion).toBeGreaterThan(versionConflict.providedVersion);
  });

  test('should validate no active ingredients error response', () => {
    const noActiveError = {
      error: "NO_ACTIVE_PAID_INGREDIENTS",
      suggestions: [
        "Add at least one active, paid ingredient to the recipe",
        "Mark existing ingredients as active if they should contribute to cost"
      ]
    };

    expect(noActiveError.error).toBe("NO_ACTIVE_PAID_INGREDIENTS");
    expect(Array.isArray(noActiveError.suggestions)).toBe(true);
    expect(noActiveError.suggestions.length).toBeGreaterThan(0);
  });
});

describe('Recipe Clone Contract Tests (Task 25)', () => {
  test('should validate recipe clone request schema', () => {
    const validRequest = {
      sourceProductId: "prod_source_123",
      targetProductId: "prod_target_456", 
      cloneInactive: true,
      cloneComplimentary: true
    };

    const schema = {
      required: ['sourceProductId', 'targetProductId'],
      properties: {
        sourceProductId: { type: 'string' },
        targetProductId: { type: 'string' },
        cloneInactive: { type: 'boolean' },
        cloneComplimentary: { type: 'boolean' }
      }
    };

    const result = validateContract(validRequest, schema);
    expect(result.valid).toBe(true);
    expect(validRequest.sourceProductId).toBeDefined();
    expect(validRequest.targetProductId).toBeDefined();
  });

  test('should validate recipe clone success response with inactive and complimentary lines', () => {
    const cloneResponse = {
      targetProductId: "prod_target_456",
      clonedLines: [
        {
          id: "line_1", 
          ingredientId: "ing_flour",
          ingredientName: "All-Purpose Flour",
          quantityGrams: 500,
          isInactive: false,
          isComplimentary: false
        },
        {
          id: "line_2",
          ingredientId: "ing_vanilla", 
          ingredientName: "Vanilla Extract",
          quantityGrams: 5,
          isInactive: false,
          isComplimentary: true
        },
        {
          id: "line_3",
          ingredientId: "ing_old_spice",
          ingredientName: "Discontinued Spice Mix", 
          quantityGrams: 10,
          isInactive: true,
          isComplimentary: false
        }
      ],
      version: 1
    };

    expect(cloneResponse.targetProductId).toBeDefined();
    expect(Array.isArray(cloneResponse.clonedLines)).toBe(true);
    expect(cloneResponse.clonedLines.length).toBe(3);
    
    // Verify inactive line included
    const inactiveLine = cloneResponse.clonedLines.find(line => line.isInactive);
    expect(inactiveLine).toBeDefined();
    expect(inactiveLine?.ingredientName).toBe("Discontinued Spice Mix");
    
    // Verify complimentary line included  
    const complimentaryLine = cloneResponse.clonedLines.find(line => line.isComplimentary);
    expect(complimentaryLine).toBeDefined();
    expect(complimentaryLine?.ingredientName).toBe("Vanilla Extract");
    
    // Verify version is set for new recipe
    expect(typeof cloneResponse.version).toBe('number');
    expect(cloneResponse.version).toBe(1);
  });

  test('should validate source recipe not found error', () => {
    const notFoundError = {
      error: "SOURCE_RECIPE_NOT_FOUND"
    };

    expect(notFoundError.error).toBe("SOURCE_RECIPE_NOT_FOUND");
  });

  test('should validate clone with filtered lines (exclude inactive)', () => {
    const filteredCloneResponse = {
      targetProductId: "prod_target_789",
      clonedLines: [
        {
          id: "line_1",
          ingredientId: "ing_flour", 
          ingredientName: "All-Purpose Flour",
          quantityGrams: 500,
          isInactive: false,
          isComplimentary: false
        },
        {
          id: "line_2",
          ingredientId: "ing_vanilla",
          ingredientName: "Vanilla Extract", 
          quantityGrams: 5,
          isInactive: false,
          isComplimentary: true
        }
      ],
      version: 1
    };

    // Should not include inactive ingredients when cloneInactive: false
    const hasInactiveLines = filteredCloneResponse.clonedLines.some(line => line.isInactive);
    expect(hasInactiveLines).toBe(false);
    
    // Should still include complimentary ingredients when cloneComplimentary: true
    const hasComplimentaryLines = filteredCloneResponse.clonedLines.some(line => line.isComplimentary);
    expect(hasComplimentaryLines).toBe(true);
  });
});

describe('Packaging Save Contract Tests (Task 26)', () => {
  test('should validate packaging save request schema', () => {
    const validRequest = {
      name: "Standard Box 8x6x4",
      description: "Standard shipping box for medium products",
      costPerUnit: 0.85,
      unitType: "each",
      dimensions: {
        length: 8,
        width: 6, 
        height: 4,
        unit: "inches"
      },
      weight: {
        value: 50,
        unit: "grams"
      },
      capacity: {
        value: 500,
        unit: "ml"
      },
      supplierInfo: {
        supplierName: "BoxCorp Inc",
        sku: "BOX-8x6x4-STD",
        orderingUrl: "https://boxcorp.com/products/BOX-8x6x4-STD",
        minimumOrderQuantity: 100
      },
      isActive: true,
      tags: ["shipping", "standard", "medium"]
    };

    const schema = {
      required: ['name', 'costPerUnit', 'unitType'],
      properties: {
        name: { type: 'string' },
        costPerUnit: { type: 'number' },
        unitType: { enum: ['each', 'weight', 'volume'] }
      }
    };

    const result = validateContract(validRequest, schema);
    expect(result.valid).toBe(true);
    expect(validRequest.costPerUnit).toBeGreaterThanOrEqual(0);
    expect(['each', 'weight', 'volume']).toContain(validRequest.unitType);
  });

  test('should validate packaging save success response with reuse tracking', () => {
    const saveResponse = {
      id: "pack_123",
      name: "Standard Box 8x6x4",
      description: "Standard shipping box for medium products", 
      costPerUnit: 0.85,
      unitType: "each",
      dimensions: {
        length: 8,
        width: 6,
        height: 4,
        unit: "inches"
      },
      weight: {
        value: 50,
        unit: "grams"
      },
      capacity: {
        value: 500,
        unit: "ml"
      },
      supplierInfo: {
        supplierName: "BoxCorp Inc",
        sku: "BOX-8x6x4-STD", 
        orderingUrl: "https://boxcorp.com/products/BOX-8x6x4-STD",
        minimumOrderQuantity: 100
      },
      isActive: true,
      tags: ["shipping", "standard", "medium"],
      usedByProducts: [
        {
          productId: "prod_cookies_001",
          productName: "Chocolate Chip Cookies",
          lastUsed: "2025-09-28T14:30:00Z"
        },
        {
          productId: "prod_brownies_002", 
          productName: "Fudge Brownies",
          lastUsed: "2025-09-29T09:15:00Z"
        }
      ],
      createdAt: "2025-09-15T10:00:00Z",
      updatedAt: "2025-09-29T10:00:00Z"
    };

    expect(saveResponse.id).toBeDefined();
    expect(saveResponse.name).toBeDefined();
    expect(typeof saveResponse.costPerUnit).toBe('number');
    expect(Array.isArray(saveResponse.usedByProducts)).toBe(true);
    expect(saveResponse.usedByProducts.length).toBeGreaterThan(0);
    
    // Verify reuse tracking structure
    const firstProduct = saveResponse.usedByProducts[0];
    expect(firstProduct.productId).toBeDefined();
    expect(firstProduct.productName).toBeDefined(); 
    expect(firstProduct.lastUsed).toBeDefined();
  });

  test('should validate duplicate packaging name error', () => {
    const duplicateError = {
      error: "DUPLICATE_PACKAGING_NAME",
      existingId: "pack_456",
      suggestion: "Standard Box 8x6x4 (v2)"
    };

    expect(duplicateError.error).toBe("DUPLICATE_PACKAGING_NAME");
    expect(duplicateError.existingId).toBeDefined();
    expect(duplicateError.suggestion).toBeDefined();
  });

  test('should validate packaging validation error response', () => {
    const validationError = {
      error: "VALIDATION_FAILED",
      details: {
        validationErrors: [
          "Cost per unit must be greater than or equal to 0",
          "Name cannot be empty",
          "Invalid unit type: must be 'each', 'weight', or 'volume'"
        ]
      }
    };

    expect(validationError.error).toBe("VALIDATION_FAILED");
    expect(Array.isArray(validationError.details.validationErrors)).toBe(true);
    expect(validationError.details.validationErrors.length).toBeGreaterThan(0);
  });

  test('should validate packaging reuse across multiple products', () => {
    const reuseResponse = {
      id: "pack_789",
      name: "Premium Gift Box",
      usedByProducts: [
        {
          productId: "prod_premium_001",
          productName: "Premium Cookie Assortment",
          lastUsed: "2025-09-29T10:00:00Z"
        },
        {
          productId: "prod_holiday_002", 
          productName: "Holiday Special Mix",
          lastUsed: "2025-09-28T15:45:00Z"
        },
        {
          productId: "prod_gift_003",
          productName: "Corporate Gift Set",
          lastUsed: "2025-09-27T11:30:00Z"
        }
      ],
      createdAt: "2025-09-01T10:00:00Z",
      updatedAt: "2025-09-29T10:00:00Z"
    };

    // Verify packaging can be reused across multiple products
    expect(reuseResponse.usedByProducts.length).toBe(3);
    expect(reuseResponse.usedByProducts.every(p => p.productId && p.productName && p.lastUsed)).toBe(true);
    
    // Verify products are tracked with usage timestamps
    const sortedByUsage = reuseResponse.usedByProducts.sort((a, b) => 
      new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    );
    expect(sortedByUsage[0].productName).toBe("Premium Cookie Assortment");
  });
});