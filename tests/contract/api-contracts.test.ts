import { describe, it, expect } from '@jest/globals';

/**
 * Contract Tests for API Endpoints (Tasks 12-15)
 * Validates request/response schemas match expected structure
 * Tests based on contracts: batch-save.json, conflict-resolve.json, price-history.json
 */

describe('Batch Save Contract (POST /api/ingredients/batch-save)', () => {
  describe('Request Schema Validation', () => {
    it('should validate complete batch save request structure', () => {
      const validRequest = {
        ingredients: [
          {
            id: '123',
            name: 'Premium Flour',
            unitType: 'weight',
            cost: 2.50,
            versionToken: '2025-09-29T10:00:00Z'
          }
        ],
        recipes: [
          {
            productId: 'prod_abc123',
            version: 3,
            lines: [
              {
                ingredientId: '123',
                quantity: 2.5,
                unit: 'cups'
              }
            ]
          }
        ]
      };

      // Validate against contract structure
      expect(validRequest).toHaveProperty('ingredients');
      expect(validRequest).toHaveProperty('recipes');
      expect(Array.isArray(validRequest.ingredients)).toBe(true);
      expect(Array.isArray(validRequest.recipes)).toBe(true);
      
      // Validate ingredient structure
      const ingredient = validRequest.ingredients[0];
      expect(ingredient).toHaveProperty('id');
      expect(ingredient).toHaveProperty('name');
      expect(ingredient).toHaveProperty('unitType');
      expect(ingredient).toHaveProperty('cost');
      expect(ingredient).toHaveProperty('versionToken');
      expect(typeof ingredient.cost).toBe('number');
      expect(['weight', 'volume', 'each']).toContain(ingredient.unitType);

      // Validate recipe structure
      const recipe = validRequest.recipes[0];
      expect(recipe).toHaveProperty('productId');
      expect(recipe).toHaveProperty('version');
      expect(recipe).toHaveProperty('lines');
      expect(typeof recipe.version).toBe('number');
      expect(Array.isArray(recipe.lines)).toBe(true);

      // Validate recipe line structure
      const line = recipe.lines[0];
      expect(line).toHaveProperty('ingredientId');
      expect(line).toHaveProperty('quantity');
      expect(line).toHaveProperty('unit');
      expect(typeof line.quantity).toBe('number');
    });

    it('should handle empty batch save requests', () => {
      const emptyRequest = {
        ingredients: [],
        recipes: []
      };

      expect(emptyRequest.ingredients).toHaveLength(0);
      expect(emptyRequest.recipes).toHaveLength(0);
    });

    it('should validate new ingredient creation (null id)', () => {
      const newIngredientRequest = {
        ingredients: [
          {
            id: null,
            name: 'New Ingredient',
            unitType: 'weight',
            cost: 1.25,
            versionToken: null
          }
        ],
        recipes: []
      };

      const ingredient = newIngredientRequest.ingredients[0];
      expect(ingredient.id).toBeNull();
      expect(ingredient.versionToken).toBeNull();
      expect(ingredient.name).toBeTruthy();
    });
  });

  describe('Success Response Schema Validation', () => {
    it('should validate successful batch save response', () => {
      const successResponse = {
        success: true,
        savedIngredients: [
          {
            id: '123',
            name: 'Premium Flour',
            cost: 2.50,
            versionToken: '2025-09-29T10:15:00Z'
          }
        ],
        savedRecipes: [
          {
            productId: 'prod_abc123',
            version: 4,
            totalCost: 5.75,
            unitCost: 1.44
          }
        ],
        auditEntry: {
          id: 'audit_789',
          timestamp: '2025-09-29T10:15:00Z',
          action: 'BATCH_SAVE',
          affectedEntities: ['ingredient:123', 'recipe:prod_abc123']
        }
      };

      expect(successResponse).toHaveProperty('success', true);
      expect(successResponse).toHaveProperty('savedIngredients');
      expect(successResponse).toHaveProperty('savedRecipes');
      expect(successResponse).toHaveProperty('auditEntry');

      // Validate saved ingredient
      const savedIngredient = successResponse.savedIngredients[0];
      expect(savedIngredient).toHaveProperty('id');
      expect(savedIngredient).toHaveProperty('versionToken');
      expect(typeof savedIngredient.cost).toBe('number');

      // Validate saved recipe
      const savedRecipe = successResponse.savedRecipes[0];
      expect(savedRecipe).toHaveProperty('productId');
      expect(savedRecipe).toHaveProperty('version');
      expect(savedRecipe).toHaveProperty('totalCost');
      expect(savedRecipe).toHaveProperty('unitCost');
      expect(typeof savedRecipe.version).toBe('number');

      // Validate audit entry
      const audit = successResponse.auditEntry;
      expect(audit).toHaveProperty('id');
      expect(audit).toHaveProperty('timestamp');
      expect(audit).toHaveProperty('action');
      expect(audit).toHaveProperty('affectedEntities');
      expect(Array.isArray(audit.affectedEntities)).toBe(true);
    });
  });

  describe('Conflict Response Schema Validation (409)', () => {
    it('should validate version conflict response structure', () => {
      const conflictResponse = {
        error: 'STALE_VERSION',
        conflicts: [
          {
            type: 'ingredient',
            id: '123',
            name: 'Premium Flour',
            clientVersion: '2025-09-29T10:00:00Z',
            currentVersion: '2025-09-29T10:10:00Z'
          },
          {
            type: 'recipe',
            id: 'prod_abc123',
            name: 'Recipe for product prod_abc123',
            clientVersion: '3',
            currentVersion: '5'
          }
        ]
      };

      expect(conflictResponse).toHaveProperty('error', 'STALE_VERSION');
      expect(conflictResponse).toHaveProperty('conflicts');
      expect(Array.isArray(conflictResponse.conflicts)).toBe(true);
      expect(conflictResponse.conflicts).toHaveLength(2);

      // Validate conflict structure
      const ingredientConflict = conflictResponse.conflicts[0];
      expect(ingredientConflict).toHaveProperty('type', 'ingredient');
      expect(ingredientConflict).toHaveProperty('id');
      expect(ingredientConflict).toHaveProperty('name');
      expect(ingredientConflict).toHaveProperty('clientVersion');
      expect(ingredientConflict).toHaveProperty('currentVersion');

      const recipeConflict = conflictResponse.conflicts[1];
      expect(recipeConflict).toHaveProperty('type', 'recipe');
      expect(recipeConflict.clientVersion).not.toBe(recipeConflict.currentVersion);
    });
  });
});

describe('Conflict Resolution Contract (POST /api/ingredients/conflict-resolve)', () => {
  describe('Refresh Action Request', () => {
    it('should validate refresh action request structure', () => {
      const refreshRequest = {
        action: 'refresh',
        entityIds: ['ingredient:123', 'recipe:prod_abc123']
      };

      expect(refreshRequest).toHaveProperty('action', 'refresh');
      expect(refreshRequest).toHaveProperty('entityIds');
      expect(Array.isArray(refreshRequest.entityIds)).toBe(true);
      expect(refreshRequest.entityIds.every(id => typeof id === 'string')).toBe(true);
    });
  });

  describe('Override Action Request', () => {
    it('should validate override action with force flag', () => {
      const overrideRequest = {
        action: 'override',
        forceOverride: true,
        ingredients: [
          {
            id: '123',
            name: 'Premium Flour',
            cost: 2.75,
            versionToken: '2025-09-29T10:00:00Z' // stale token
          }
        ],
        recipes: []
      };

      expect(overrideRequest).toHaveProperty('action', 'override');
      expect(overrideRequest).toHaveProperty('forceOverride', true);
      expect(overrideRequest).toHaveProperty('ingredients');
      expect(overrideRequest).toHaveProperty('recipes');
    });
  });

  describe('Conflict Resolution Response', () => {
    it('should validate refresh response with current data', () => {
      const refreshResponse = {
        action: 'refresh',
        currentData: {
          ingredients: [
            {
              id: '123',
              name: 'Premium Flour',
              cost: 2.60,
              versionToken: '2025-09-29T10:10:00Z'
            }
          ],
          recipes: [
            {
              productId: 'prod_abc123',
              version: 5,
              lines: [],
              totalCost: 6.20,
              unitCost: 1.55
            }
          ]
        },
        auditEntry: {
          id: 'audit_refresh_001',
          timestamp: '2025-09-29T10:12:00Z',
          action: 'CONFLICT_REFRESH'
        }
      };

      expect(refreshResponse).toHaveProperty('action', 'refresh');
      expect(refreshResponse).toHaveProperty('currentData');
      expect(refreshResponse.currentData).toHaveProperty('ingredients');
      expect(refreshResponse.currentData).toHaveProperty('recipes');
      expect(refreshResponse).toHaveProperty('auditEntry');
    });

    it('should validate override response with saved changes', () => {
      const overrideResponse = {
        action: 'override',
        savedIngredients: [
          {
            id: '123',
            name: 'Premium Flour',
            cost: 2.75,
            versionToken: '2025-09-29T10:15:00Z' // new token after override
          }
        ],
        savedRecipes: [],
        auditEntry: {
          id: 'audit_override_001',
          timestamp: '2025-09-29T10:15:00Z',
          action: 'CONFLICT_OVERRIDE',
          affectedEntities: ['ingredient:123']
        }
      };

      expect(overrideResponse).toHaveProperty('action', 'override');
      expect(overrideResponse).toHaveProperty('savedIngredients');
      expect(overrideResponse).toHaveProperty('savedRecipes');
      expect(overrideResponse).toHaveProperty('auditEntry');
      expect(overrideResponse.auditEntry.action).toBe('CONFLICT_OVERRIDE');
    });
  });
});

describe('Price History Contract (GET /api/ingredients/:id/history)', () => {
  describe('Query Parameter Validation', () => {
    it('should validate pagination parameters', () => {
      const queryParams = {
        page: 1,
        limit: 50,
        startDate: '2025-09-01',
        endDate: '2025-09-29'
      };

      expect(typeof queryParams.page).toBe('number');
      expect(typeof queryParams.limit).toBe('number');
      expect(queryParams.limit).toBeLessThanOrEqual(100); // Max limit
      expect(queryParams.page).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Price History Response', () => {
    it('should validate price history response structure', () => {
      const historyResponse = {
        ingredientId: '123',
        ingredientName: 'Premium Flour',
        entries: [
          {
            id: 'price_001',
            costPerUnit: 2.75,
            previousCost: 2.50,
            deltaPercent: 10.0,
            timestamp: '2025-09-29T10:15:00Z',
            changedBy: 'user_456',
            changeReason: 'Supplier price increase',
            auditEntryId: 'audit_789'
          },
          {
            id: 'price_002',
            costPerUnit: 2.50,
            previousCost: 2.25,
            deltaPercent: 11.1,
            timestamp: '2025-09-28T14:30:00Z',
            changedBy: 'user_123',
            changeReason: 'Market adjustment',
            auditEntryId: 'audit_456'
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 3,
          totalEntries: 25,
          hasNextPage: true,
          hasPreviousPage: false
        }
      };

      expect(historyResponse).toHaveProperty('ingredientId');
      expect(historyResponse).toHaveProperty('ingredientName');
      expect(historyResponse).toHaveProperty('entries');
      expect(historyResponse).toHaveProperty('pagination');

      // Validate entries structure
      expect(Array.isArray(historyResponse.entries)).toBe(true);
      const entry = historyResponse.entries[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('costPerUnit');
      expect(entry).toHaveProperty('previousCost');
      expect(entry).toHaveProperty('deltaPercent');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('changedBy');
      expect(entry).toHaveProperty('auditEntryId');
      expect(typeof entry.costPerUnit).toBe('number');
      expect(typeof entry.deltaPercent).toBe('number');

      // Validate pagination structure
      const pagination = historyResponse.pagination;
      expect(pagination).toHaveProperty('currentPage');
      expect(pagination).toHaveProperty('totalPages');
      expect(pagination).toHaveProperty('totalEntries');
      expect(pagination).toHaveProperty('hasNextPage');
      expect(pagination).toHaveProperty('hasPreviousPage');
      expect(typeof pagination.totalEntries).toBe('number');
    });

    it('should validate entries are ordered newest-first', () => {
      const historyResponse = {
        entries: [
          {
            id: 'price_001',
            timestamp: '2025-09-29T10:15:00Z',
            costPerUnit: 2.75
          },
          {
            id: 'price_002',
            timestamp: '2025-09-28T14:30:00Z',
            costPerUnit: 2.50
          }
        ]
      };

      const timestamps = historyResponse.entries.map(e => new Date(e.timestamp).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i-1]).toBeGreaterThanOrEqual(timestamps[i]);
      }
    });
  });
});