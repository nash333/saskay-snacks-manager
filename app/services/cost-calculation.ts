/**
 * Core cost calculation functions - pure functions for testability (FR-022)
 * Handles ingredient cost calculations, margin calculations, and complimentary logic
 */

export interface Ingredient {
  id: string;
  name: string;
  unit: 'g' | 'kg';
  currentPrice: number; // cents
  previousPrice?: number;
  complimentaryFlag: boolean;
  activeFlag?: boolean;
}

export interface RecipeLine {
  ingredientId: string;
  quantityGrams: number;
}

export interface PackagingOption {
  id: string;
  type: string;
  sizeGramsCapacity: number;
  packageCost: number; // cents
  labelCost: number;   // cents
}

export interface CostBreakdown {
  ingredientId: string;
  ingredientName: string;
  quantityGrams: number;
  pricePerGram: number;
  lineCost: number;
  isComplimentary?: boolean;
  isInactive?: boolean;
  warningMessage?: string;
}

export interface BatchCostResult {
  totalCost: number;
  breakdown: CostBreakdown[];
  hasInactiveIngredients?: boolean;
}

export interface UnitCostResult {
  batchCost: number;
  packagingCost: number;
  labelCost: number;
  totalUnitCost: number;
  packagingOption: PackagingOption;
}

export interface PricingResult {
  suggestedPrice: number;
  marginPercent: number;
  profitAmount: number;
}

export interface MarginResult {
  achievedMargin: number;
  profitAmount: number;
  isEphemeral: boolean;
  isLoss?: boolean;
}

export interface PricingMatrixEntry {
  marginPercent: number;
  suggestedPrice: number;
  profitAmount: number;
}

export interface ComplimentaryTransitionDelta {
  deltaPercent: number;
  baselineWasZero?: boolean;
  transitionType: 'normal' | 'complimentary_to_paid' | 'paid_to_complimentary';
  displayText: string;
}

// Core conversion utilities
export function normalizeToGrams(quantity: number, unit: 'g' | 'kg'): number {
  if (unit === 'kg') {
    return quantity * 1000;
  }
  return quantity;
}

// Cost calculation functions
export function calculateBatchCost(ingredients: Ingredient[], recipeLines: RecipeLine[]): { totalCost: number; unitCount: number; breakdown: CostBreakdown[] } {
  const breakdown: CostBreakdown[] = [];
  let totalCost = 0;

  for (const line of recipeLines) {
    const ingredient = ingredients.find(i => i.id === line.ingredientId);
    if (!ingredient) {
      throw new Error(`Ingredient not found: ${line.ingredientId}`);
    }

    const pricePerGram = ingredient.unit === 'kg' 
      ? ingredient.currentPrice / 1000 
      : ingredient.currentPrice;

    const lineCost = ingredient.complimentaryFlag ? 0 : line.quantityGrams * pricePerGram;

    breakdown.push({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      quantityGrams: line.quantityGrams,
      pricePerGram,
      lineCost,
      isComplimentary: ingredient.complimentaryFlag
    });

    totalCost += lineCost;
  }

  return {
    totalCost,
    unitCount: 1, // Default to 1 unit per batch
    breakdown
  };
}

export function calculateUnitCost(batchCost: number, packaging: PackagingOption): UnitCostResult {
  return {
    batchCost,
    packagingCost: packaging.packageCost,
    labelCost: packaging.labelCost,
    totalUnitCost: batchCost + packaging.packageCost + packaging.labelCost,
    packagingOption: packaging
  };
}

// Margin and pricing calculations
export function calculateSuggestedPrice(unitCost: number, targetMargin: number): PricingResult {
  if (targetMargin < 0 || targetMargin >= 100) {
    throw new Error('Invalid margin: must be between 0 and 99');
  }

  if (unitCost === 0) {
    return {
      suggestedPrice: 0,
      marginPercent: targetMargin,
      profitAmount: 0
    };
  }

  const suggestedPrice = Math.round(unitCost / (1 - targetMargin / 100));
  const profitAmount = suggestedPrice - unitCost;

  return {
    suggestedPrice,
    marginPercent: targetMargin,
    profitAmount
  };
}

export function calculateMarginFromPrice(unitCost: number, manualPrice: number): MarginResult {
  if (manualPrice < 0) {
    throw new Error('Invalid price: must be >= 0');
  }
  if (unitCost < 0) {
    throw new Error('Invalid cost: must be >= 0');
  }

  if (manualPrice === 0) {
    return {
      achievedMargin: unitCost === 0 ? 0 : -100,
      profitAmount: -unitCost,
      isEphemeral: true,
      isLoss: unitCost > 0
    };
  }

  const profitAmount = manualPrice - unitCost;
  const achievedMargin = (profitAmount / manualPrice) * 100;

  return {
    achievedMargin: Math.round(achievedMargin * 100) / 100, // 2 decimal places
    profitAmount,
    isEphemeral: true,
    isLoss: profitAmount < 0
  };
}

export function generatePricingMatrix(unitCost: number, margins?: number[]): PricingMatrixEntry[] {
  const defaultMargins = [40, 45, 50, 55, 60];
  const targetMargins = margins || defaultMargins;
  
  return targetMargins
    .sort((a, b) => a - b)
    .map(margin => {
      const pricing = calculateSuggestedPrice(unitCost, margin);
      return {
        marginPercent: margin,
        suggestedPrice: pricing.suggestedPrice,
        profitAmount: pricing.profitAmount
      };
    });
}

// Complimentary ingredient handling
export function shouldSuppressDelta(ingredient: Ingredient): boolean {
  return ingredient.complimentaryFlag && ingredient.currentPrice === 0;
}

export function shouldExcludeFromMarginAlerts(ingredient: Ingredient): boolean {
  return ingredient.complimentaryFlag && ingredient.currentPrice === 0;
}

export function validateComplimentaryTransition(price: number, complimentaryFlag: boolean): void {
  if (complimentaryFlag && price > 0) {
    throw new Error('Cannot mark ingredient complimentary while price > 0');
  }
}

export function calculateComplimentaryTransitionDelta(
  oldPrice: number,
  newPrice: number,
  wasComplimentary: boolean,
  isComplimentary: boolean
): ComplimentaryTransitionDelta | null {
  // Paid → Complimentary: suppress delta display
  if (!wasComplimentary && isComplimentary && newPrice === 0) {
    return null;
  }

  // Complimentary → Paid: show large positive increase
  if (wasComplimentary && !isComplimentary && oldPrice === 0 && newPrice > 0) {
    return {
      deltaPercent: Infinity,
      baselineWasZero: true,
      transitionType: 'complimentary_to_paid',
      displayText: '+100%+ increase'
    };
  }

  // Complimentary → Complimentary (no change)
  if (wasComplimentary && isComplimentary) {
    return null;
  }

  // Normal paid → paid calculation
  if (!wasComplimentary && !isComplimentary) {
    if (oldPrice === 0 && newPrice === 0) {
      return null;
    }
    if (oldPrice === 0) {
      return {
        deltaPercent: Infinity,
        baselineWasZero: true,
        transitionType: 'normal',
        displayText: '+100%+ increase'
      };
    }

    const deltaPercent = ((newPrice - oldPrice) / oldPrice) * 100;
    const sign = deltaPercent >= 0 ? '+' : '';
    
    return {
      deltaPercent: Math.round(deltaPercent * 10) / 10,
      transitionType: 'normal',
      displayText: `${sign}${(Math.round(deltaPercent * 10) / 10).toFixed(1)}%`
    };
  }

  return null;
}

// Inactive ingredient handling
export function includeInactiveInRecipeCost(ingredients: Ingredient[], recipeLines: RecipeLine[]): BatchCostResult {
  const result = calculateBatchCost(ingredients, recipeLines);
  let hasInactiveIngredients = false;

  // Enhance breakdown with inactive status
  result.breakdown = result.breakdown.map(item => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    const isInactive = ingredient?.activeFlag === false;

    if (isInactive) {
      hasInactiveIngredients = true;
      return {
        ...item,
        isInactive: true,
        warningMessage: 'Ingredient is inactive but retained in recipe for cost integrity'
      };
    }

    return {
      ...item,
      isInactive: false
    };
  });

  return {
    ...result,
    hasInactiveIngredients
  };
}

export function excludeInactiveFromNewRecipes(ingredients: Ingredient[]): Ingredient[] {
  return ingredients.filter(ingredient => ingredient.activeFlag !== false);
}

// Service class wrapper for dependency injection
export interface CostCalculationService {
  calculateRecipeCost(productId: string): Promise<number>;
  getPackagingCost(packagingOptionId: string): Promise<number>;
  calculateBatchCost(ingredients: Ingredient[], recipeLines: RecipeLine[]): BatchCostResult;
  calculateUnitCost(batchCost: number, packaging: PackagingOption): UnitCostResult;
  calculateSuggestedPrice(unitCost: number, targetMargin: number): PricingResult;
  calculateMarginFromPrice(unitCost: number, manualPrice: number): MarginResult;
  generatePricingMatrix(unitCost: number, margins?: number[]): PricingMatrixEntry[];
}

export class CostCalculationServiceImpl implements CostCalculationService {
  constructor(
    private deps: {
      metaobjectsService: any; // MetaobjectsService interface would be imported
    }
  ) {}

  async calculateRecipeCost(productId: string): Promise<number> {
    // This would integrate with metaobjects service to get recipe data
    // For now, return mock cost
    return 1000; // cents
  }

  async getPackagingCost(packagingOptionId: string): Promise<number> {
    // This would integrate with metaobjects service to get packaging cost
    // For now, return mock cost
    return 50; // cents
  }

  calculateBatchCost(ingredients: Ingredient[], recipeLines: RecipeLine[]): BatchCostResult {
    return calculateBatchCost(ingredients, recipeLines);
  }

  calculateUnitCost(batchCost: number, packaging: PackagingOption): UnitCostResult {
    return calculateUnitCost(batchCost, packaging);
  }

  calculateSuggestedPrice(unitCost: number, targetMargin: number): PricingResult {
    return calculateSuggestedPrice(unitCost, targetMargin);
  }

  calculateMarginFromPrice(unitCost: number, manualPrice: number): MarginResult {
    return calculateMarginFromPrice(unitCost, manualPrice);
  }

  generatePricingMatrix(unitCost: number, margins?: number[]): PricingMatrixEntry[] {
    return generatePricingMatrix(unitCost, margins);
  }
}