import { describe, it, expect } from '@jest/globals';
import { shouldSuppressDelta, shouldExcludeFromMarginAlerts, calculateComplimentaryTransitionDelta } from '../../app/services/cost-calculation';

describe('Complimentary Ingredient Handling', () => {
  describe('shouldSuppressDelta (FR-023, FR-035)', () => {
    it('should suppress delta for complimentary ingredients with zero price', () => {
      const ingredient = {
        id: '1',
        name: 'Salt',
        unit: 'g' as const,
        currentPrice: 0,
        previousPrice: 50,
        complimentaryFlag: true
      };

      expect(shouldSuppressDelta(ingredient)).toBe(true);
    });

    it('should show delta for non-complimentary zero price (edge case)', () => {
      const ingredient = {
        id: '1', 
        name: 'Temp Free Item',
        unit: 'g' as const,
        currentPrice: 0,
        previousPrice: 100,
        complimentaryFlag: false
      };

      expect(shouldSuppressDelta(ingredient)).toBe(false);
    });

    it('should show delta for paid ingredients', () => {
      const ingredient = {
        id: '1',
        name: 'Flour',
        unit: 'g' as const,
        currentPrice: 200,
        previousPrice: 180,
        complimentaryFlag: false
      };

      expect(shouldSuppressDelta(ingredient)).toBe(false);
    });
  });

  describe('shouldExcludeFromMarginAlerts (FR-035)', () => {
    it('should exclude complimentary ingredients from negative margin alerts', () => {
      const complimentaryIngredient = {
        id: '1',
        name: 'Salt',
        unit: 'g' as const,
        currentPrice: 0,
        complimentaryFlag: true
      };

      expect(shouldExcludeFromMarginAlerts(complimentaryIngredient)).toBe(true);
    });

    it('should include paid ingredients in margin alerts', () => {
      const paidIngredient = {
        id: '1',
        name: 'Expensive Spice',
        unit: 'g' as const,
        currentPrice: 5000,
        complimentaryFlag: false
      };

      expect(shouldExcludeFromMarginAlerts(paidIngredient)).toBe(false);
    });

    it('should include zero-priced non-complimentary in alerts', () => {
      const zeroButNotComplimentary = {
        id: '1',
        name: 'Mistake Item',
        unit: 'g' as const,
        currentPrice: 0,
        complimentaryFlag: false
      };

      expect(shouldExcludeFromMarginAlerts(zeroButNotComplimentary)).toBe(false);
    });
  });

  describe('calculateComplimentaryTransitionDelta (FR-036)', () => {
    it('should return null for paid→complimentary transition (suppress display)', () => {
      const oldPrice = 100;
      const newPrice = 0;
      const newComplimentaryFlag = true;

      const result = calculateComplimentaryTransitionDelta(
        oldPrice, 
        newPrice, 
        false, // was not complimentary
        newComplimentaryFlag
      );

      expect(result).toBe(null); // suppressed
    });

    it('should return large positive increase for complimentary→paid transition', () => {
      const oldPrice = 0;
      const newPrice = 150;
      const oldComplimentaryFlag = true;
      const newComplimentaryFlag = false;

      const result = calculateComplimentaryTransitionDelta(
        oldPrice,
        newPrice,
        oldComplimentaryFlag,
        newComplimentaryFlag
      );

      // Baseline is 0, so delta should indicate +100%+ increase
      expect(result).toMatchObject({
        deltaPercent: Infinity, // or very large number
        baselineWasZero: true,
        transitionType: 'complimentary_to_paid'
      });
    });

    it('should calculate normal delta for paid→paid changes', () => {
      const oldPrice = 100;
      const newPrice = 120;
      
      const result = calculateComplimentaryTransitionDelta(
        oldPrice,
        newPrice,
        false, // was not complimentary
        false  // still not complimentary
      );

      expect(result).toMatchObject({
        deltaPercent: 20, // (120-100)/100 * 100 = 20%
        transitionType: 'normal'
      });
    });

    it('should handle complimentary→complimentary (stays zero)', () => {
      const result = calculateComplimentaryTransitionDelta(0, 0, true, true);
      
      expect(result).toBe(null); // no meaningful delta
    });
  });
});