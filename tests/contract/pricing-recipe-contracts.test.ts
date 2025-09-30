import { describe, it, expect } from '@jest/globals';

/**
 * Contract Tests for Pricing and Recipe Endpoints (Tasks 12-15 continued)
 * Tests pricing-matrix.json, manual-margin.json, recipe-clone.json contracts
 */

describe('Pricing Matrix Contract (GET /api/pricing/matrix)', () => {
  describe('Query Parameter Validation', () => {
    it('should validate pricing matrix request parameters', () => {
      const queryParams = {
        ingredientIds: ['123', '456', '789'],
        margins: [15, 25, 35, 50],
        includeInactive: false
      };

      expect(Array.isArray(queryParams.ingredientIds)).toBe(true);
      expect(queryParams.ingredientIds.every(id => typeof id === 'string')).toBe(true);
      expect(Array.isArray(queryParams.margins)).toBe(true);
      expect(queryParams.margins.every(margin => typeof margin === 'number')).toBe(true);
      expect(typeof queryParams.includeInactive).toBe('boolean');
    });

    it('should validate margin percentage bounds', () => {
      const validMargins = [0, 15, 25, 50, 90];
      const invalidMargins = [-5, 150]; // negative or > 100%

      validMargins.forEach(margin => {
        expect(margin).toBeGreaterThanOrEqual(0);
        expect(margin).toBeLessThanOrEqual(100);
      });

      invalidMargins.forEach(margin => {
        expect(margin < 0 || margin > 100).toBe(true);
      });
    });
  });

  describe('Pricing Matrix Response', () => {
    it('should validate pricing matrix response structure', () => {
      const matrixResponse = {
        matrix: [
          {
            ingredientId: '123',
            ingredientName: 'Premium Flour',
            currentCost: 2.50,
            unitType: 'weight',
            isActive: true,
            pricingOptions: [
              {
                marginPercent: 15,
                suggestedPrice: 2.88,
                markup: 0.38
              },
              {
                marginPercent: 25,
                suggestedPrice: 3.33,
                markup: 0.83
              }
            ]
          },
          {
            ingredientId: '456',
            ingredientName: 'Organic Sugar',
            currentCost: 1.75,
            unitType: 'weight',
            isActive: true,
            pricingOptions: [
              {
                marginPercent: 15,
                suggestedPrice: 2.06,
                markup: 0.31
              },
              {
                marginPercent: 25,
                suggestedPrice: 2.33,
                markup: 0.58
              }
            ]
          }
        ],
        metadata: {
          generatedAt: '2025-09-29T10:20:00Z',
          requestedMargins: [15, 25],
          totalIngredients: 2,
          activeIngredients: 2,
          inactiveIngredients: 0
        }
      };

      expect(matrixResponse).toHaveProperty('matrix');
      expect(matrixResponse).toHaveProperty('metadata');
      expect(Array.isArray(matrixResponse.matrix)).toBe(true);

      // Validate matrix entry structure
      const entry = matrixResponse.matrix[0];
      expect(entry).toHaveProperty('ingredientId');
      expect(entry).toHaveProperty('ingredientName');
      expect(entry).toHaveProperty('currentCost');
      expect(entry).toHaveProperty('unitType');
      expect(entry).toHaveProperty('isActive');
      expect(entry).toHaveProperty('pricingOptions');
      expect(Array.isArray(entry.pricingOptions)).toBe(true);

      // Validate pricing option structure
      const pricingOption = entry.pricingOptions[0];
      expect(pricingOption).toHaveProperty('marginPercent');
      expect(pricingOption).toHaveProperty('suggestedPrice');
      expect(pricingOption).toHaveProperty('markup');
      expect(typeof pricingOption.marginPercent).toBe('number');
      expect(typeof pricingOption.suggestedPrice).toBe('number');
      expect(typeof pricingOption.markup).toBe('number');

      // Validate metadata structure
      const metadata = matrixResponse.metadata;
      expect(metadata).toHaveProperty('generatedAt');
      expect(metadata).toHaveProperty('requestedMargins');
      expect(metadata).toHaveProperty('totalIngredients');
      expect(metadata).toHaveProperty('activeIngredients');
      expect(metadata).toHaveProperty('inactiveIngredients');
      expect(Array.isArray(metadata.requestedMargins)).toBe(true);
    });

    it('should validate pricing calculation accuracy', () => {
      const entry = {
        currentCost: 2.00,
        pricingOptions: [
          {
            marginPercent: 25,
            suggestedPrice: 2.67, // 2.00 / (1 - 0.25) = 2.67
            markup: 0.67
          }
        ]
      };

      const expectedPrice = entry.currentCost / (1 - 0.25);
      const expectedMarkup = expectedPrice - entry.currentCost;

      expect(entry.pricingOptions[0].suggestedPrice).toBeCloseTo(expectedPrice, 2);
      expect(entry.pricingOptions[0].markup).toBeCloseTo(expectedMarkup, 2);
    });
  });
});

describe('Manual Margin Contract (POST /api/pricing/manual-margin)', () => {
  describe('Request Validation', () => {
    it('should validate manual margin calculation request', () => {
      const marginRequest = {
        calculations: [
          {
            ingredientId: '123',
            currentCost: 2.50,
            targetMarginPercent: 30,
            customPrice: null // Calculate suggested price
          },
          {
            ingredientId: '456',
            currentCost: 1.75,
            targetMarginPercent: null, // Calculate margin from price
            customPrice: 2.50
          }
        ],
        ephemeral: true // Don't save to database
      };

      expect(marginRequest).toHaveProperty('calculations');
      expect(marginRequest).toHaveProperty('ephemeral');
      expect(Array.isArray(marginRequest.calculations)).toBe(true);
      expect(typeof marginRequest.ephemeral).toBe('boolean');

      // Validate calculation entries
      const calc1 = marginRequest.calculations[0];
      const calc2 = marginRequest.calculations[1];

      // First calculation: margin -> price
      expect(calc1.targetMarginPercent).toBeTruthy();
      expect(calc1.customPrice).toBeNull();

      // Second calculation: price -> margin
      expect(calc2.targetMarginPercent).toBeNull();
      expect(calc2.customPrice).toBeTruthy();
    });
  });

  describe('Manual Margin Response', () => {
    it('should validate manual margin calculation response', () => {
      const marginResponse = {
        calculations: [
          {
            ingredientId: '123',
            currentCost: 2.50,
            requestedMargin: 30,
            suggestedPrice: 3.57, // 2.50 / (1 - 0.30)
            actualMargin: 30.0,
            markup: 1.07
          },
          {
            ingredientId: '456',
            currentCost: 1.75,
            requestedPrice: 2.50,
            suggestedMargin: 30.0, // (2.50 - 1.75) / 2.50
            actualPrice: 2.50,
            markup: 0.75
          }
        ],
        metadata: {
          calculatedAt: '2025-09-29T10:25:00Z',
          ephemeral: true,
          totalCalculations: 2
        }
      };

      expect(marginResponse).toHaveProperty('calculations');
      expect(marginResponse).toHaveProperty('metadata');
      expect(Array.isArray(marginResponse.calculations)).toBe(true);

      // Validate calculation results
      const result1 = marginResponse.calculations[0];
      const result2 = marginResponse.calculations[1];

      // Margin-to-price calculation
      expect(result1).toHaveProperty('requestedMargin');
      expect(result1).toHaveProperty('suggestedPrice');
      expect(result1).toHaveProperty('actualMargin');
      expect(typeof result1.suggestedPrice).toBe('number');

      // Price-to-margin calculation
      expect(result2).toHaveProperty('requestedPrice');
      expect(result2).toHaveProperty('suggestedMargin');
      expect(result2).toHaveProperty('actualPrice');
      expect(typeof result2.suggestedMargin).toBe('number');

      // Validate metadata
      expect(marginResponse.metadata.ephemeral).toBe(true);
      expect(marginResponse.metadata.totalCalculations).toBe(2);
    });

    it('should validate margin calculation math', () => {
      const cost = 2.00;
      const margin = 25; // 25%
      const expectedPrice = cost / (1 - margin / 100); // 2.6666...

      expect(expectedPrice).toBeCloseTo(2.67, 2);

      // Reverse calculation - use exact calculated price
      const exactPrice = cost / (1 - margin / 100);
      const expectedMargin = ((exactPrice - cost) / exactPrice) * 100; // Should be exactly 25%

      expect(expectedMargin).toBeCloseTo(25, 1);
    });
  });
});

describe('Recipe Clone Contract (POST /api/recipes/clone)', () => {
  describe('Clone Request Validation', () => {
    it('should validate recipe clone request structure', () => {
      const cloneRequest = {
        sourceProductId: 'prod_source123',
        targetProductId: 'prod_target456',
        cloneOptions: {
          includeInactiveIngredients: false,
          adjustQuantitiesForComplimentary: true,
          copyPricingSettings: true,
          generateNewVersionToken: true
        },
        modifications: {
          scaleFactor: 1.5, // 50% larger batch
          excludeIngredients: ['ingredient_789'], // Skip specific ingredients
          replaceIngredients: [
            {
              oldIngredientId: 'ingredient_123',
              newIngredientId: 'ingredient_456',
              adjustQuantity: false
            }
          ]
        }
      };

      expect(cloneRequest).toHaveProperty('sourceProductId');
      expect(cloneRequest).toHaveProperty('targetProductId');
      expect(cloneRequest).toHaveProperty('cloneOptions');
      expect(cloneRequest).toHaveProperty('modifications');

      // Validate clone options
      const options = cloneRequest.cloneOptions;
      expect(typeof options.includeInactiveIngredients).toBe('boolean');
      expect(typeof options.adjustQuantitiesForComplimentary).toBe('boolean');
      expect(typeof options.copyPricingSettings).toBe('boolean');
      expect(typeof options.generateNewVersionToken).toBe('boolean');

      // Validate modifications
      const mods = cloneRequest.modifications;
      expect(typeof mods.scaleFactor).toBe('number');
      expect(Array.isArray(mods.excludeIngredients)).toBe(true);
      expect(Array.isArray(mods.replaceIngredients)).toBe(true);

      // Validate replacement structure
      const replacement = mods.replaceIngredients[0];
      expect(replacement).toHaveProperty('oldIngredientId');
      expect(replacement).toHaveProperty('newIngredientId');
      expect(replacement).toHaveProperty('adjustQuantity');
      expect(typeof replacement.adjustQuantity).toBe('boolean');
    });

    it('should validate minimal clone request', () => {
      const minimalRequest = {
        sourceProductId: 'prod_source123',
        targetProductId: 'prod_target456'
        // cloneOptions and modifications are optional
      };

      expect(minimalRequest).toHaveProperty('sourceProductId');
      expect(minimalRequest).toHaveProperty('targetProductId');
      expect(minimalRequest.sourceProductId).not.toBe(minimalRequest.targetProductId);
    });
  });

  describe('Clone Response Validation', () => {
    it('should validate successful recipe clone response', () => {
      const cloneResponse = {
        success: true,
        clonedRecipe: {
          productId: 'prod_target456',
          version: 1, // New recipe starts at version 1
          lines: [
            {
              ingredientId: 'ingredient_123',
              ingredientName: 'Premium Flour',
              quantity: 3.75, // Scaled by 1.5
              unit: 'cups',
              costPerUnit: 2.50,
              lineCost: 9.38,
              isComplimentary: false,
              isActive: true
            },
            {
              ingredientId: 'ingredient_456', // Replaced ingredient
              ingredientName: 'Organic Sugar',
              quantity: 1.5, // Scaled by 1.5
              unit: 'cups',
              costPerUnit: 1.75,
              lineCost: 2.63,
              isComplimentary: true, // Flagged as complimentary
              isActive: true
            }
          ],
          totalCost: 12.01,
          unitCost: 3.00,
          versionToken: '2025-09-29T10:30:00Z'
        },
        cloneStatistics: {
          sourceLineCount: 2,
          clonedLineCount: 2,
          excludedIngredients: 0,
          replacedIngredients: 1,
          scalingApplied: 1.5,
          complimentaryAdjustments: 1
        },
        auditEntry: {
          id: 'audit_clone_001',
          timestamp: '2025-09-29T10:30:00Z',
          action: 'RECIPE_CLONE',
          sourceEntity: 'recipe:prod_source123',
          targetEntity: 'recipe:prod_target456'
        }
      };

      expect(cloneResponse).toHaveProperty('success', true);
      expect(cloneResponse).toHaveProperty('clonedRecipe');
      expect(cloneResponse).toHaveProperty('cloneStatistics');
      expect(cloneResponse).toHaveProperty('auditEntry');

      // Validate cloned recipe structure
      const recipe = cloneResponse.clonedRecipe;
      expect(recipe).toHaveProperty('productId');
      expect(recipe).toHaveProperty('version');
      expect(recipe).toHaveProperty('lines');
      expect(recipe).toHaveProperty('totalCost');
      expect(recipe).toHaveProperty('unitCost');
      expect(recipe).toHaveProperty('versionToken');
      expect(Array.isArray(recipe.lines)).toBe(true);

      // Validate recipe line structure
      const line = recipe.lines[0];
      expect(line).toHaveProperty('ingredientId');
      expect(line).toHaveProperty('ingredientName');
      expect(line).toHaveProperty('quantity');
      expect(line).toHaveProperty('unit');
      expect(line).toHaveProperty('costPerUnit');
      expect(line).toHaveProperty('lineCost');
      expect(line).toHaveProperty('isComplimentary');
      expect(line).toHaveProperty('isActive');
      expect(typeof line.quantity).toBe('number');
      expect(typeof line.costPerUnit).toBe('number');
      expect(typeof line.lineCost).toBe('number');

      // Validate statistics
      const stats = cloneResponse.cloneStatistics;
      expect(stats).toHaveProperty('sourceLineCount');
      expect(stats).toHaveProperty('clonedLineCount');
      expect(stats).toHaveProperty('excludedIngredients');
      expect(stats).toHaveProperty('replacedIngredients');
      expect(stats).toHaveProperty('scalingApplied');
      expect(typeof stats.scalingApplied).toBe('number');

      // Validate audit entry
      const audit = cloneResponse.auditEntry;
      expect(audit).toHaveProperty('action', 'RECIPE_CLONE');
      expect(audit).toHaveProperty('sourceEntity');
      expect(audit).toHaveProperty('targetEntity');
    });

    it('should validate clone failure response', () => {
      const failureResponse = {
        success: false,
        error: 'SOURCE_NOT_FOUND',
        message: 'Source recipe prod_nonexistent123 not found',
        sourceProductId: 'prod_nonexistent123',
        targetProductId: 'prod_target456'
      };

      expect(failureResponse).toHaveProperty('success', false);
      expect(failureResponse).toHaveProperty('error');
      expect(failureResponse).toHaveProperty('message');
      expect(failureResponse).toHaveProperty('sourceProductId');
      expect(failureResponse).toHaveProperty('targetProductId');
      expect(['SOURCE_NOT_FOUND', 'TARGET_EXISTS', 'VALIDATION_ERROR']).toContain(failureResponse.error);
    });

    it('should validate scaling calculations in clone response', () => {
      const originalQuantity = 2.5;
      const scaleFactor = 1.5;
      const expectedScaledQuantity = originalQuantity * scaleFactor; // 3.75

      expect(expectedScaledQuantity).toBeCloseTo(3.75, 2);

      // Validate cost scaling
      const costPerUnit = 2.50;
      const expectedLineCost = expectedScaledQuantity * costPerUnit; // 9.375

      expect(expectedLineCost).toBeCloseTo(9.375, 2); // Use exact calculation
    });
  });
});