import { describe, it, expect } from '@jest/globals';
import { calculateSuggestedPrice, calculateMarginFromPrice, generatePricingMatrix } from '../../app/services/cost-calculation';

describe('Margin Calculation & Pricing', () => {
  describe('calculateSuggestedPrice', () => {
    it('should calculate price from cost and target margin', () => {
      // Formula: sellingPrice = totalCost / (1 - margin/100)
      const unitCost = 1000; // 1000 cents ($10.00)
      const targetMargin = 50; // 50%
      
      const result = calculateSuggestedPrice(unitCost, targetMargin);
      expect(result.suggestedPrice).toBe(2000); // 1000 / (1 - 0.5) = 2000 cents
      expect(result.marginPercent).toBe(50);
      expect(result.profitAmount).toBe(1000);
    });

    it('should handle edge case margins', () => {
      const unitCost = 500;
      
      // 0% margin = cost price
      expect(calculateSuggestedPrice(unitCost, 0).suggestedPrice).toBe(500);
      
      // 90% margin
      const high = calculateSuggestedPrice(unitCost, 90);
      expect(high.suggestedPrice).toBe(5000); // 500 / 0.1 = 5000
      expect(high.profitAmount).toBe(4500);
    });

    it('should reject invalid margins', () => {
      expect(() => calculateSuggestedPrice(1000, -5)).toThrow('Invalid margin');
      expect(() => calculateSuggestedPrice(1000, 100)).toThrow('Invalid margin');
      expect(() => calculateSuggestedPrice(1000, 105)).toThrow('Invalid margin');
    });

    it('should handle zero cost (complimentary-only recipes)', () => {
      const result = calculateSuggestedPrice(0, 50);
      expect(result.suggestedPrice).toBe(0);
      expect(result.profitAmount).toBe(0);
      expect(result.marginPercent).toBe(50); // theoretical
    });
  });

  describe('calculateMarginFromPrice (reverse calculation for manual override)', () => {
    it('should calculate achieved margin from manual price', () => {
      const unitCost = 1000;
      const manualPrice = 1500;
      
      const result = calculateMarginFromPrice(unitCost, manualPrice);
      // Margin = (price - cost) / price * 100 = (1500-1000)/1500 * 100 = 33.33%
      expect(result.achievedMargin).toBeCloseTo(33.33, 2);
      expect(result.profitAmount).toBe(500);
      expect(result.isEphemeral).toBe(true); // FR-013
    });

    it('should handle loss scenarios (price < cost)', () => {
      const unitCost = 1000;
      const manualPrice = 800;
      
      const result = calculateMarginFromPrice(unitCost, manualPrice);
      expect(result.achievedMargin).toBe(-25); // (800-1000)/800 * 100 = -25%
      expect(result.profitAmount).toBe(-200);  // loss
      expect(result.isLoss).toBe(true);
    });

    it('should handle break-even price', () => {
      const unitCost = 1000;
      const manualPrice = 1000;
      
      const result = calculateMarginFromPrice(unitCost, manualPrice);
      expect(result.achievedMargin).toBe(0);
      expect(result.profitAmount).toBe(0);
    });

    it('should reject invalid prices', () => {
      expect(() => calculateMarginFromPrice(1000, -100)).toThrow('Invalid price');
      expect(() => calculateMarginFromPrice(-500, 1000)).toThrow('Invalid cost');
    });
  });

  describe('generatePricingMatrix', () => {
    it('should generate pricing for multiple margin targets', () => {
      const unitCost = 1000;
      const margins = [40, 50, 60];
      
      const matrix = generatePricingMatrix(unitCost, margins);
      expect(matrix).toHaveLength(3);
      
      expect(matrix[0]).toMatchObject({
        marginPercent: 40,
        suggestedPrice: Math.round(1000 / 0.6), // 1667 cents
        profitAmount: expect.any(Number)
      });
      
      expect(matrix[1]).toMatchObject({
        marginPercent: 50,
        suggestedPrice: 2000
      });
      
      expect(matrix[2]).toMatchObject({
        marginPercent: 60,
        suggestedPrice: 2500 // 1000 / 0.4
      });
    });

    it('should handle default margin list', () => {
      const matrix = generatePricingMatrix(1000);
      expect(matrix).toHaveLength(5); // default [40,45,50,55,60]
      expect(matrix.map(m => m.marginPercent)).toEqual([40, 45, 50, 55, 60]);
    });

    it('should sort by margin ascending', () => {
      const matrix = generatePricingMatrix(1000, [60, 40, 50]);
      expect(matrix.map(m => m.marginPercent)).toEqual([40, 50, 60]);
    });
  });
});