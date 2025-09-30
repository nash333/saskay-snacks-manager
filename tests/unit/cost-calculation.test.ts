import { describe, it, expect } from '@jest/globals';
import { calculateBatchCost, calculateUnitCost, normalizeToGrams } from '../../app/services/cost-calculation';

describe('Cost Calculation Core', () => {
  describe('normalizeToGrams', () => {
    it('should convert kg to grams', () => {
      expect(normalizeToGrams(1, 'kg')).toBe(1000);
      expect(normalizeToGrams(0.5, 'kg')).toBe(500);
      expect(normalizeToGrams(2.5, 'kg')).toBe(2500);
    });

    it('should keep grams as-is', () => {
      expect(normalizeToGrams(100, 'g')).toBe(100);
      expect(normalizeToGrams(1500, 'g')).toBe(1500);
    });

    it('should handle zero and decimal values', () => {
      expect(normalizeToGrams(0, 'kg')).toBe(0);
      expect(normalizeToGrams(0.001, 'kg')).toBe(1);
      expect(normalizeToGrams(0.1, 'g')).toBe(0.1);
    });
  });

  describe('calculateBatchCost', () => {
    it('should sum ingredient costs correctly for basic recipe', () => {
      const ingredients = [
        { id: '1', name: 'Flour', unit: 'kg' as const, currentPrice: 200, complimentaryFlag: false }, // 200 cents/kg
        { id: '2', name: 'Sugar', unit: 'g' as const, currentPrice: 50, complimentaryFlag: false }    // 50 cents/g
      ];
      
      const recipeLines = [
        { ingredientId: '1', quantityGrams: 500 }, // 0.5kg flour = 100 cents
        { ingredientId: '2', quantityGrams: 200 }  // 200g sugar = 10000 cents
      ];

      const result = calculateBatchCost(ingredients, recipeLines);
      expect(result.totalCost).toBe(10100); // 100 + 10000 cents
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0]).toMatchObject({
        ingredientId: '1',
        ingredientName: 'Flour',
        quantityGrams: 500,
        pricePerGram: 0.2,  // 200 cents/kg = 0.2 cents/g
        lineCost: 100
      });
    });

    it('should handle per-gram normalization correctly', () => {
      const ingredients = [
        { id: '1', name: 'Vanilla', unit: 'g' as const, currentPrice: 500, complimentaryFlag: false } // 500 cents/g
      ];
      
      const recipeLines = [
        { ingredientId: '1', quantityGrams: 2.5 } // 2.5g vanilla
      ];

      const result = calculateBatchCost(ingredients, recipeLines);
      expect(result.totalCost).toBe(1250); // 2.5 * 500 = 1250 cents
    });

    it('should exclude complimentary ingredients from cost', () => {
      const ingredients = [
        { id: '1', name: 'Flour', unit: 'kg' as const, currentPrice: 200, complimentaryFlag: false },
        { id: '2', name: 'Salt', unit: 'g' as const, currentPrice: 0, complimentaryFlag: true }
      ];
      
      const recipeLines = [
        { ingredientId: '1', quantityGrams: 1000 }, // 1kg flour = 200 cents
        { ingredientId: '2', quantityGrams: 10 }    // 10g salt = 0 (complimentary)
      ];

      const result = calculateBatchCost(ingredients, recipeLines);
      expect(result.totalCost).toBe(200);
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[1].lineCost).toBe(0);
      expect(result.breakdown[1].isComplimentary).toBe(true);
    });

    it('should handle missing ingredients gracefully', () => {
      const ingredients = [
        { id: '1', name: 'Flour', unit: 'kg' as const, currentPrice: 200, complimentaryFlag: false }
      ];
      
      const recipeLines = [
        { ingredientId: '1', quantityGrams: 500 },
        { ingredientId: '2', quantityGrams: 100 } // Missing ingredient
      ];

      expect(() => calculateBatchCost(ingredients, recipeLines)).toThrow('Ingredient not found: 2');
    });
  });

  describe('calculateUnitCost', () => {
    it('should add packaging and label costs to batch cost', () => {
      const batchCost = 1000; // 1000 cents
      const packaging = {
        id: 'pkg1',
        type: '500g jar',
        sizeGramsCapacity: 500,
        packageCost: 150, // 150 cents
        labelCost: 25     // 25 cents
      };

      const result = calculateUnitCost(batchCost, packaging);
      expect(result).toMatchObject({
        batchCost: 1000,
        packagingCost: 150,
        labelCost: 25,
        totalUnitCost: 1175,
        packagingOption: packaging
      });
    });

    it('should handle zero packaging costs', () => {
      const batchCost = 500;
      const packaging = {
        id: 'bulk',
        type: 'bulk',
        sizeGramsCapacity: 1000,
        packageCost: 0,
        labelCost: 0
      };

      const result = calculateUnitCost(batchCost, packaging);
      expect(result.totalUnitCost).toBe(500);
    });
  });
});