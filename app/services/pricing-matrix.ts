/**
 * Pricing Matrix Generator Service
 * Implements FR-015 (pricing matrix generation for margin analysis)
 * Task 32: Implement pricing matrix generator (FR-015, FR-012, FR-014)
 */

import type { MetaobjectsService } from './metaobjects';
import type { CostCalculationService } from './cost-calculation';
import type { TargetMarginPersistenceService } from './target-margin-persistence';

export interface PricingMatrixItem {
  marginPercent: number;
  suggestedPrice: number;
  actualMarginAtPrice: number;
}

export interface PricingMatrixResult {
  productId: string;
  productName: string;
  packagingOptionId: string;
  packagingType: string;
  batchCost: number;
  unitCost: number;
  targetMarginPercent: number;
  matrix: PricingMatrixItem[];
  manualPriceCalculation: {
    enabled: true;
    endpoint: '/api/pricing/manual-margin';
  };
}

export interface ManualMarginResult {
  manualPrice: number;
  unitCost: number;
  calculatedMargin: number;
  profitAmount: number;
  ephemeral: true;
}

interface PricingMatrixServiceDependencies {
  metaobjectsService: MetaobjectsService;
  costCalculationService: CostCalculationService;
  targetMarginPersistenceService: TargetMarginPersistenceService;
}

export class PricingMatrixService {
  constructor(private deps: PricingMatrixServiceDependencies) {}

  /**
   * Generate pricing matrix for multiple target margins (FR-015)
   */
  async generatePricingMatrix(
    productId: string,
    packagingOptionId: string,
    margins: number[] = [40, 45, 50, 55, 60]
  ): Promise<PricingMatrixResult> {
    // Validate inputs
    const validMargins = this.validateMarginBounds(margins);
    
    // Get product information
    const product = await this.deps.metaobjectsService.getByGid(productId);
    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    // Calculate costs
    const recipeCost = await this.deps.costCalculationService.calculateRecipeCost(productId);
    const packagingCost = await this.deps.costCalculationService.getPackagingCost(packagingOptionId);
    
    if (!packagingCost) {
      throw new Error('PACKAGING_NOT_FOUND');
    }

    // Calculate unit cost (ingredient cost per unit + packaging cost)
  const r = recipeCost as any;
  const p = packagingCost as any;
  const unitCost = (r.totalCost / r.unitCount) + p.unitCost;

    // Get target margin from persistence (FR-038)
    const targetMargin = await this.deps.targetMarginPersistenceService.getTargetMargin(
      productId,
      packagingOptionId
    );

    // Generate pricing matrix
    const matrix = validMargins.map(margin => this.calculatePriceForMargin(unitCost, margin));

    return {
      productId,
      productName: product.fields.name || 'Unknown Product',
      packagingOptionId,
      packagingType: 'Standard',
      batchCost: recipeCost,
      unitCost: this.roundToCents(unitCost),
      targetMarginPercent: targetMargin,
      matrix,
      manualPriceCalculation: {
        enabled: true,
        endpoint: '/api/pricing/manual-margin'
      }
    };
  }

  /**
   * Calculate margin from manual selling price (ephemeral, FR-013)
   */
  async calculateMarginFromPrice(
    productId: string,
    packagingOptionId: string,
    manualPrice: number
  ): Promise<ManualMarginResult> {
    if (manualPrice <= 0) {
      throw new Error('Invalid manual price');
    }

    // Calculate unit cost
    const recipeCost = await this.deps.costCalculationService.calculateRecipeCost(productId);
    const packagingCost = await this.deps.costCalculationService.getPackagingCost(packagingOptionId);
    
  const r2 = recipeCost as any;
  const p2 = packagingCost as any;
  const unitCost = (r2.totalCost / r2.unitCount) + p2.unitCost;
    
    // Calculate margin: (selling price - cost) / selling price * 100
    const profitAmount = manualPrice - unitCost;
    const calculatedMargin = (profitAmount / manualPrice) * 100;

    return {
      manualPrice: this.roundToCents(manualPrice),
      unitCost: this.roundToCents(unitCost),
      calculatedMargin: this.roundToPercent(calculatedMargin),
      profitAmount: this.roundToCents(profitAmount),
      ephemeral: true
    };
  }

  /**
   * Calculate suggested price for a target margin
   */
  private calculatePriceForMargin(unitCost: number, marginPercent: number): PricingMatrixItem {
    // Formula: selling price = cost / (1 - margin%)
    const suggestedPrice = unitCost / (1 - (marginPercent / 100));
    
    // Verify by calculating actual margin at suggested price
    const actualMargin = ((suggestedPrice - unitCost) / suggestedPrice) * 100;

    return {
      marginPercent,
      suggestedPrice: this.roundToCents(suggestedPrice),
      actualMarginAtPrice: this.roundToPercent(actualMargin)
    };
  }

  /**
   * Validate margin percentages are within acceptable bounds (0.1 - 94.9%)
   */
  private validateMarginBounds(margins: number[]): number[] {
    const validMargins = margins.filter(margin => margin > 0 && margin < 95);
    
    // Return default margins if none are valid
    if (validMargins.length === 0) {
      return [40, 45, 50, 55, 60];
    }

    // Sort margins for consistent output
    return validMargins.sort((a, b) => a - b);
  }

  /**
   * Round to 2 decimal places (cents)
   */
  private roundToCents(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Round to 2 decimal places for percentages
   */
  private roundToPercent(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Bulk generate pricing matrices for multiple product-packaging combinations
   */
  async bulkGeneratePricingMatrices(
    requests: Array<{
      productId: string;
      packagingOptionId: string;
      margins?: number[];
    }>
  ): Promise<PricingMatrixResult[]> {
    const results = await Promise.all(
      requests.map(async req => {
        try {
          return await this.generatePricingMatrix(
            req.productId,
            req.packagingOptionId,
            req.margins
          );
        } catch (error) {
          // Log error but don't fail entire batch
          console.error(`Failed to generate pricing matrix for ${req.productId}:`, error);
          return null;
        }
      })
    );

    // Filter out failed requests
    return results.filter((result): result is PricingMatrixResult => result !== null);
  }

  /**
   * Calculate optimal price point based on competitive analysis
   */
  async calculateOptimalPrice(
    productId: string,
    packagingOptionId: string,
    competitorPrices: number[],
    targetMarginMin: number = 35
  ): Promise<{
    optimalPrice: number;
    achievedMargin: number;
    competitivePosition: 'below' | 'at' | 'above';
    reasoning: string;
  }> {
    // Get unit cost
    const recipeCost = await this.deps.costCalculationService.calculateRecipeCost(productId);
    const packagingCost = await this.deps.costCalculationService.getPackagingCost(packagingOptionId);
  const r3 = recipeCost as any;
  const p3 = packagingCost as any;
  const unitCost = (r3.totalCost / r3.unitCount) + p3.unitCost;

    // Analyze competitor prices
    const sortedPrices = competitorPrices.sort((a, b) => a - b);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const minPrice = Math.min(...sortedPrices);
    const maxPrice = Math.max(...sortedPrices);

    // Calculate minimum viable price for target margin
    const minViablePrice = unitCost / (1 - (targetMarginMin / 100));

    let optimalPrice: number;
    let competitivePosition: 'below' | 'at' | 'above';
    let reasoning: string;

    if (medianPrice >= minViablePrice) {
      // Can compete at median price with acceptable margin
      optimalPrice = medianPrice;
      competitivePosition = 'at';
      reasoning = 'Price set at market median with acceptable margin';
    } else if (minPrice >= minViablePrice) {
      // Can undercut competition while maintaining margin
      optimalPrice = minPrice * 0.95;
      competitivePosition = 'below';
      reasoning = 'Competitive pricing 5% below market minimum';
    } else {
      // Must price above competition to maintain margin
      optimalPrice = minViablePrice;
      competitivePosition = 'above';
      reasoning = `Minimum price required for ${targetMarginMin}% margin`;
    }

    const achievedMargin = ((optimalPrice - unitCost) / optimalPrice) * 100;

    return {
      optimalPrice: this.roundToCents(optimalPrice),
      achievedMargin: this.roundToPercent(achievedMargin),
      competitivePosition,
      reasoning
    };
  }
}

// Service instance for direct consumption by API routes
export const pricingMatrixService = new PricingMatrixService({
  metaobjectsService: {} as any, // Will be injected properly in production
  costCalculationService: {} as any,
  targetMarginPersistenceService: {} as any
});
