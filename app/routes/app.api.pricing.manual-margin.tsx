/**
 * API Route: Manual Margin Calculation Endpoint
 * Implements FR-013 (manual override margin calculation - ephemeral only)
 * Task 34: Implement manual override margin calculation endpoint (FR-013)
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { PricingMatrixService } from '../services/pricing-matrix';
import { CostCalculationServiceImpl as CostCalculationService } from '../services/cost-calculation';
import { metaobjectsService } from '../services/metaobjects';
import { TargetMarginPersistenceService } from '../services/target-margin-persistence';

// Use pre-instantiated service
const costCalculationService = new CostCalculationService({ metaobjectsService });
const targetMarginPersistenceService = new TargetMarginPersistenceService({ metaobjectsService });

const pricingMatrixService = new PricingMatrixService({
  metaobjectsService,
  costCalculationService,
  targetMarginPersistenceService
});

/**
 * POST /app/api/pricing/manual-margin
 * Calculate margin from manual selling price (ephemeral, FR-013)
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    // Validate content type
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const body = await request.json();

    // Validate required fields
    const { productId, packagingOptionId, manualPrice } = body;
    
    if (!productId) {
      return json({ error: 'productId is required' }, { status: 400 });
    }
    
    if (!packagingOptionId) {
      return json({ error: 'packagingOptionId is required' }, { status: 400 });
    }
    
    if (typeof manualPrice !== 'number' || manualPrice <= 0) {
      return json({ error: 'manualPrice must be a positive number' }, { status: 400 });
    }

    // Calculate margin from manual price
    const result = await pricingMatrixService.calculateMarginFromPrice(
      productId,
      packagingOptionId,
      manualPrice
    );

    return json(result);

  } catch (error) {
    console.error('Manual margin calculation error:', error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message === 'PRODUCT_NOT_FOUND') {
        return json({ error: 'PRODUCT_NOT_FOUND' }, { status: 404 });
      }
      
      if (error.message === 'PACKAGING_NOT_FOUND') {
        return json({ error: 'PACKAGING_NOT_FOUND' }, { status: 404 });
      }

      if (error.message.includes('Invalid manual price')) {
        return json({ error: 'INVALID_MANUAL_PRICE' }, { status: 400 });
      }
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /app/api/pricing/manual-margin
 * Return method information (for discovery)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    method: 'POST',
    description: 'Calculate margin from manual selling price (ephemeral, FR-013)',
    parameters: {
      productId: { type: 'string', required: true },
      packagingOptionId: { type: 'string', required: true },
      manualPrice: { type: 'number', minimum: 0.01, required: true }
    },
    response: {
      manualPrice: 'number',
      unitCost: 'number',
      calculatedMargin: 'number (percentage)',
      profitAmount: 'number',
      ephemeral: true
    },
    examples: [
      {
        request: {
          productId: 'gid://shopify/Product/123',
          packagingOptionId: 'pkg_001',
          manualPrice: 5.99
        },
        response: {
          manualPrice: 5.99,
          unitCost: 2.75,
          calculatedMargin: 54.09,
          profitAmount: 3.24,
          ephemeral: true
        }
      }
    ]
  });
}

/**
 * Batch manual margin calculation endpoint
 * POST /app/api/pricing/manual-margin/batch
 */
export async function batchAction({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json();
    const { calculations } = body;

    if (!Array.isArray(calculations)) {
      return json({ error: 'calculations must be an array' }, { status: 400 });
    }

    const results = await Promise.allSettled(
      calculations.map(async calc => {
        try {
          return await pricingMatrixService.calculateMarginFromPrice(
            calc.productId,
            calc.packagingOptionId,
            calc.manualPrice
          );
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : 'Unknown error',
            productId: calc.productId,
            packagingOptionId: calc.packagingOptionId
          };
        }
      })
    );

    const successful = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);

    const failed = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => ({ error: result.reason }));

    return json({
      successful,
      failed,
      totalRequested: calculations.length,
      successCount: successful.length,
      errorCount: failed.length
    });

  } catch (error) {
    console.error('Batch manual margin calculation error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}