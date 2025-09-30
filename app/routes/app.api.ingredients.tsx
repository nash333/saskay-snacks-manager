/**
 * Secure API Route Example: Ingredients List
 * Demonstrates proper use of ServerSideSecurityGuard
 * Updated to include FR-017, FR-026 security measures
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { withSecurity, type AuthenticatedContext, createScopedServices } from '../services/security-guard';

/**
 * GET /app/api/ingredients
 * List ingredients with shop-scoped isolation and security
 */
export const loader = withSecurity(async (
  { request }: LoaderFunctionArgs,
  context: AuthenticatedContext
): Promise<Response> => {
  try {
    const url = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100); // Cap at 100
    const search = url.searchParams.get('search') || undefined;
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    // Validate parameters
    if (page < 1 || limit < 1) {
      return json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Create shop-scoped services
    const { metaobjectsService } = createScopedServices(context);

    // Query ingredients (automatically shop-scoped by the GraphQL client)
    const result = await metaobjectsService.listIngredients({
      first: limit,
      after: page > 1 ? Buffer.from(`cursor:${(page - 1) * limit}`).toString('base64') : undefined,
      filter: {
        search,
        includeInactive
      }
    });

    // Prepare response data
    const responseData = {
      ingredients: result.edges.map((edge: any) => ({
        id: edge.node.id,
        gid: edge.node.gid,
        name: edge.node.name,
        costPerUnit: edge.node.costPerUnit,
        unitType: edge.node.unitType,
        isActive: edge.node.isActive,
        isComplimentary: edge.node.isComplimentary,
        versionToken: edge.node.versionToken,
        updatedAt: edge.node.updatedAt
        // Note: shopId is not exposed to client but is enforced server-side
      })),
      pagination: {
        currentPage: page,
        limit,
        hasNextPage: result.pageInfo.hasNextPage,
        hasPreviousPage: result.pageInfo.hasPreviousPage,
        totalCount: result.totalCount
      },
      metadata: {
        shopId: context.shopId, // Safe to expose shop domain
        requestedAt: new Date().toISOString()
      }
    };

    return json(responseData);
  } catch (error) {
    console.error('[Ingredients API] Error listing ingredients:', error);
    
    if (error instanceof Response) {
      return error; // Security guard errors
    }

    return json(
      { error: 'Failed to list ingredients' },
      { status: 500 }
    );
  }
});

/**
 * POST /app/api/ingredients
 * Create new ingredient with shop-scoped isolation and security
 */
export const action = withSecurity(async (
  { request }: ActionFunctionArgs,
  context: AuthenticatedContext
): Promise<Response> => {
  try {
    // Validate content type
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const { name, costPerUnit, unitType, isComplimentary } = body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return json(
        { error: 'name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (typeof costPerUnit !== 'number' || costPerUnit < 0) {
      return json(
        { error: 'costPerUnit must be a non-negative number' },
        { status: 400 }
      );
    }

    if (!['weight', 'volume', 'each'].includes(unitType)) {
      return json(
        { error: 'unitType must be one of: weight, volume, each' },
        { status: 400 }
      );
    }

    // Validate complimentary flag logic (FR-003)
    if (isComplimentary && costPerUnit !== 0) {
      return json(
        { error: 'Complimentary ingredients must have zero cost' },
        { status: 400 }
      );
    }

    if (!isComplimentary && costPerUnit === 0) {
      return json(
        { error: 'Non-complimentary ingredients must have positive cost' },
        { status: 400 }
      );
    }

    // Create shop-scoped services
    const { metaobjectsService } = createScopedServices(context);

    // Create ingredient (automatically shop-scoped)
    const ingredient = await metaobjectsService.createIngredient({
      name: name.trim(),
      costPerUnit,
      unitType,
      isActive: true,
      isComplimentary: Boolean(isComplimentary),
      versionToken: new Date().toISOString()
    });

    // Prepare response data (sanitized)
    const responseData = {
      ingredient: {
        id: ingredient.id,
        gid: ingredient.gid,
        name: ingredient.name,
        costPerUnit: ingredient.costPerUnit,
        unitType: ingredient.unitType,
        isActive: ingredient.isActive,
        isComplimentary: ingredient.isComplimentary,
        versionToken: ingredient.versionToken,
        createdAt: ingredient.createdAt,
        updatedAt: ingredient.updatedAt
      },
      metadata: {
        shopId: context.shopId,
        createdBy: context.userId,
        createdAt: new Date().toISOString()
      }
    };

    return json(responseData, { status: 201 });
  } catch (error) {
    console.error('[Ingredients API] Error creating ingredient:', error);
    
    if (error instanceof Response) {
      return error; // Security guard errors
    }

    // Handle Shopify API errors
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return json(
          { error: 'An ingredient with this name already exists' },
          { status: 409 }
        );
      }
    }

    return json(
      { error: 'Failed to create ingredient' },
      { status: 500 }
    );
  }
});