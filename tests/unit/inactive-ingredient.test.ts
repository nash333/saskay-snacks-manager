import { describe, it, expect } from '@jest/globals';
import { includeInactiveInRecipeCost, excludeInactiveFromNewRecipes } from '../../app/services/cost-calculation';

describe('Inactive Ingredient Handling (FR-034, FR-027)', () => {
  describe('includeInactiveInRecipeCost', () => {
    it('should include inactive ingredients in existing recipe cost calculations', () => {
      const ingredients = [
        { id: '1', name: 'Flour', unit: 'g' as const, currentPrice: 200, activeFlag: true, complimentaryFlag: false },
        { id: '2', name: 'Old Spice', unit: 'g' as const, currentPrice: 300, activeFlag: false, complimentaryFlag: false }, // inactive but in recipe
        { id: '3', name: 'Sugar', unit: 'g' as const, currentPrice: 100, activeFlag: true, complimentaryFlag: false }
      ];

      const recipeLines = [
        { ingredientId: '1', quantityGrams: 500 },
        { ingredientId: '2', quantityGrams: 10 },  // inactive ingredient still counted
        { ingredientId: '3', quantityGrams: 200 }
      ];

  const result = includeInactiveInRecipeCost(ingredients as any[], recipeLines);
      
      expect(result.totalCost).toBe(123000); // 500*0.2 + 10*300 + 200*0.1 (all cents)
      expect(result.breakdown).toHaveLength(3);
      
      const inactiveLine = result.breakdown.find(b => b.ingredientId === '2');
      expect(inactiveLine).toMatchObject({
        ingredientId: '2',
        isInactive: true,
        lineCost: 3000, // still calculated
        warningMessage: 'Ingredient is inactive but retained in recipe for cost integrity'
      });
    });

    it('should mark inactive ingredients in breakdown for UI display', () => {
      const ingredients = [
        { id: '1', name: 'Active', unit: 'g' as const, currentPrice: 100, activeFlag: true, complimentaryFlag: false },
        { id: '2', name: 'Inactive', unit: 'g' as const, currentPrice: 200, activeFlag: false, complimentaryFlag: false }
      ];

      const recipeLines = [
        { ingredientId: '1', quantityGrams: 100 },
        { ingredientId: '2', quantityGrams: 50 }
      ];

      const result = includeInactiveInRecipeCost(ingredients, recipeLines);
      
      expect(result.breakdown[0].isInactive).toBe(false);
      expect(result.breakdown[1].isInactive).toBe(true);
      expect(result.hasInactiveIngredients).toBe(true);
    });
  });

  describe('excludeInactiveFromNewRecipes', () => {
    it('should filter out inactive ingredients from available ingredients list', () => {
      const allIngredients = [
        { id: '1', name: 'Active Flour', unit: 'g' as const, activeFlag: true, complimentaryFlag: false },
        { id: '2', name: 'Inactive Spice', unit: 'g' as const, activeFlag: false, complimentaryFlag: false },
        { id: '3', name: 'Active Sugar', unit: 'g' as const, activeFlag: true, complimentaryFlag: false },
        { id: '4', name: 'Another Inactive', unit: 'g' as const, activeFlag: false, complimentaryFlag: false }
      ];

  const availableForNewRecipes = excludeInactiveFromNewRecipes(allIngredients as any[]);
      
      expect(availableForNewRecipes).toHaveLength(2);
      expect(availableForNewRecipes.map(i => i.name)).toEqual(['Active Flour', 'Active Sugar']);
    });

    it('should preserve all active ingredients', () => {
      const allActive = [
        { id: '1', name: 'Flour', unit: 'g' as const, activeFlag: true, complimentaryFlag: false },
        { id: '2', name: 'Sugar', unit: 'g' as const, activeFlag: true, complimentaryFlag: false }
      ];

  const result = excludeInactiveFromNewRecipes(allActive as any[]);
      expect(result).toHaveLength(2);
      expect(result).toEqual(allActive);
    });

    it('should return empty array if all ingredients inactive', () => {
      const allInactive = [
        { id: '1', name: 'Inactive1', unit: 'g' as const, activeFlag: false, complimentaryFlag: false },
        { id: '2', name: 'Inactive2', unit: 'g' as const, activeFlag: false, complimentaryFlag: false }
      ];

  const result = excludeInactiveFromNewRecipes(allInactive as any[]);
      expect(result).toHaveLength(0);
    });
  });

  describe('Integration: inactive ingredient workflow', () => {
    it('should maintain cost integrity when ingredient becomes inactive', () => {
      // Scenario: An ingredient is used in a recipe, then marked inactive
      const beforeInactive = {
        id: '1',
        name: 'Specialty Item',
        unit: 'g' as const,
        currentPrice: 500,
        activeFlag: true,
        complimentaryFlag: false
      };

      const recipeLines = [{ ingredientId: '1', quantityGrams: 20 }];
      
      // Calculate cost while active
  const activeCost = includeInactiveInRecipeCost([beforeInactive] as any[], recipeLines);
      expect(activeCost.totalCost).toBe(10000); // 20 * 500

      // Same ingredient becomes inactive
      const afterInactive = { ...beforeInactive, activeFlag: false };
      
      // Cost should remain the same for existing recipes
  const inactiveCost = includeInactiveInRecipeCost([afterInactive] as any[], recipeLines);
      expect(inactiveCost.totalCost).toBe(10000); // unchanged
      expect(inactiveCost.hasInactiveIngredients).toBe(true);

      // But ingredient should not be available for new recipes
  const availableForNew = excludeInactiveFromNewRecipes([afterInactive] as any[]);
      expect(availableForNew).toHaveLength(0);
    });
  });
});