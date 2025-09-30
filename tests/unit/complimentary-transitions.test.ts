import { describe, it, expect } from '@jest/globals';
import { calculateComplimentaryTransitionDelta, validateComplimentaryTransition } from '../../app/services/cost-calculation';

describe('Complimentary Transition Delta Rules (FR-036)', () => {
  describe('validateComplimentaryTransition', () => {
    it('should reject setting complimentary flag with non-zero price', () => {
      expect(() => {
        validateComplimentaryTransition(150, true);
      }).toThrow('Cannot mark ingredient complimentary while price > 0');
    });

    it('should allow setting complimentary flag with zero price', () => {
      expect(() => {
        validateComplimentaryTransition(0, true);
      }).not.toThrow();
    });

    it('should allow clearing complimentary flag regardless of price', () => {
      expect(() => {
        validateComplimentaryTransition(150, false);
      }).not.toThrow();
      
      expect(() => {
        validateComplimentaryTransition(0, false);
      }).not.toThrow();
    });
  });

  describe('complimentary transition delta calculations', () => {
    it('should suppress delta when paid→complimentary (price to 0)', () => {
      const transition = calculateComplimentaryTransitionDelta(
        100,  // old price
        0,    // new price (zeroed)
        false, // was not complimentary
        true   // now complimentary
      );

      expect(transition).toBe(null); // delta display suppressed
    });

    it('should show large positive increase for complimentary→paid (0 to price)', () => {
      const transition = calculateComplimentaryTransitionDelta(
        0,     // old price (was complimentary) 
        150,   // new price
        true,  // was complimentary
        false  // no longer complimentary
      );

      expect(transition).toMatchObject({
        deltaPercent: Infinity, // or representation of +100%+
        baselineWasZero: true,
        transitionType: 'complimentary_to_paid',
        displayText: '+100%+ increase' // for UI
      });
    });

    it('should calculate normal deltas for paid→paid transitions', () => {
      const transition = calculateComplimentaryTransitionDelta(
        100,   // old price
        120,   // new price
        false, // was not complimentary 
        false  // still not complimentary
      );

      expect(transition).toMatchObject({
        deltaPercent: 20, // (120-100)/100 * 100 = 20%
        transitionType: 'normal',
        displayText: '+20.0%'
      });
    });

    it('should handle complimentary→complimentary (stays 0)', () => {
      const transition = calculateComplimentaryTransitionDelta(
        0,    // old price
        0,    // new price 
        true, // was complimentary
        true  // still complimentary
      );

      expect(transition).toBe(null); // no delta to show
    });

    it('should handle negative deltas (price decreases)', () => {
      const transition = calculateComplimentaryTransitionDelta(
        150,  // old price
        120,  // new price (decrease)
        false,
        false
      );

      expect(transition).toMatchObject({
        deltaPercent: -20, // (120-150)/150 * 100 = -20%
        transitionType: 'normal',
        displayText: '-20.0%'
      });
    });
  });

  describe('edge cases and validation', () => {
    it('should handle zero to zero transitions for non-complimentary items', () => {
      const transition = calculateComplimentaryTransitionDelta(0, 0, false, false);
      expect(transition).toBe(null); // no meaningful delta
    });

    it('should validate that complimentaryFlag=true requires price=0', () => {
      // This validation should happen at service layer during save
      const validTransitions = [
        { price: 0, complimentary: true },   // valid
        { price: 100, complimentary: false }, // valid
        { price: 0, complimentary: false }    // valid (unusual but allowed)
      ];

      validTransitions.forEach(({ price, complimentary }) => {
        expect(() => validateComplimentaryTransition(price, complimentary)).not.toThrow();
      });

      // Invalid case
      expect(() => validateComplimentaryTransition(100, true)).toThrow();
    });
  });
});