/**
 * API Route: Pricing Matrix Generator Endpoint
 * Implements FR-015 (pricing matrix generation for margin analysis)
 * Tasks 32: Implement pricing matrix generator (FR-015, FR-012, FR-014)
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
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
 * GET /app/api/pricing/matrix
 * Get pricing matrix for multiple margins (FR-015)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    
    // Extract query parameters
    const productId = url.searchParams.get('productId');
    const packagingOptionId = url.searchParams.get('packagingOptionId');
    const marginsParam = url.searchParams.get('margins');

    // Validate required parameters
    if (!productId) {
      return json({ error: 'productId parameter is required' }, { status: 400 });
    }

    if (!packagingOptionId) {
      return json({ error: 'packagingOptionId parameter is required' }, { status: 400 });
    }

    // Parse margins parameter (defaults to [40, 45, 50, 55, 60])
    let margins: number[] = [40, 45, 50, 55, 60];
    if (marginsParam) {
      try {
        const parsedMargins = JSON.parse(marginsParam);
        if (Array.isArray(parsedMargins) && parsedMargins.every(m => typeof m === 'number')) {
          margins = parsedMargins;
        }
      } catch (error) {
        return json({ error: 'Invalid margins parameter format. Expected JSON array of numbers.' }, { status: 400 });
      }
    }

    // Validate margin bounds (0 < margin < 95)
    const invalidMargins = margins.filter(m => m <= 0 || m >= 95);
    if (invalidMargins.length > 0) {
      return json({ 
        error: 'Invalid margin values. All margins must be between 0.1% and 94.9%',
        invalidValues: invalidMargins 
      }, { status: 400 });
    }

    // Generate pricing matrix
    const result = await pricingMatrixService.generatePricingMatrix(
      productId,
      packagingOptionId,
      margins
    );

    return json(result);

  } catch (error) {
    console.error('Pricing matrix generation error:', error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message === 'PRODUCT_NOT_FOUND') {
        return json({ error: 'PRODUCT_NOT_FOUND' }, { status: 404 });
      }
      
      if (error.message === 'PACKAGING_NOT_FOUND') {
        return json({ error: 'PACKAGING_NOT_FOUND' }, { status: 404 });
      }
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /app/api/pricing/matrix/bulk
 * Bulk generate pricing matrices for multiple product-packaging combinations
 */
export async function bulkLoader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const requestsParam = url.searchParams.get('requests');

    if (!requestsParam) {
      return json({ error: 'requests parameter is required' }, { status: 400 });
    }

    let requests: Array<{
      productId: string;
      packagingOptionId: string;
      margins?: number[];
    }>;

    try {
      requests = JSON.parse(requestsParam);
      if (!Array.isArray(requests)) {
        throw new Error('requests must be an array');
      }
    } catch (error) {
      return json({ error: 'Invalid requests parameter format' }, { status: 400 });
    }

    // Validate each request
    const validation = requests.every(req => 
      req.productId && 
      req.packagingOptionId &&
      (!req.margins || Array.isArray(req.margins))
    );

    if (!validation) {
      return json({ error: 'Each request must have productId and packagingOptionId' }, { status: 400 });
    }

    // Limit batch size to prevent overload
    if (requests.length > 50) {
      return json({ error: 'Maximum 50 requests per batch' }, { status: 400 });
    }

    // Generate bulk pricing matrices
    const results = await pricingMatrixService.bulkGeneratePricingMatrices(requests);

    return json({
      results,
      totalRequested: requests.length,
      successful: results.length,
      failed: requests.length - results.length
    });

  } catch (error) {
    console.error('Bulk pricing matrix generation error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Example usage documentation endpoint
 */
export async function exampleLoader() {
  return json({
    endpoint: '/app/api/pricing/matrix',
    method: 'GET',
    description: 'Generate pricing matrix for multiple target margins',
    parameters: {
      productId: { 
        type: 'string', 
        required: true,
        description: 'Shopify Product GID',
        example: 'gid://shopify/Product/123'
      },
      packagingOptionId: { 
        type: 'string', 
        required: true,
        description: 'Packaging option identifier',
        example: 'pkg_001'
      },
      margins: { 
        type: 'array',
        required: false,
        description: 'Target margin percentages (0.1-94.9%)',
        default: '[40, 45, 50, 55, 60]',
        example: '[35, 42.5, 50, 67.8]'
      }
    },
    examples: [
      {
        url: '/app/api/pricing/matrix?productId=gid://shopify/Product/123&packagingOptionId=pkg_001',
        description: 'Default margins'
      },
      {
        url: '/app/api/pricing/matrix?productId=gid://shopify/Product/456&packagingOptionId=pkg_002&margins=[30,40,50,60,70]',
        description: 'Custom margins'
      }
    ],
    bulkEndpoint: {
      url: '/app/api/pricing/matrix/bulk',
      method: 'GET',
      maxRequests: 50,
      parameter: 'requests',
      format: 'JSON array of {productId, packagingOptionId, margins?}'
    }
  });
}