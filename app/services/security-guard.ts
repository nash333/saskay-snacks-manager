/**
 * Server-Side Security Guard
 * Implements FR-017, FR-026 (shopId scoping and token leakage prevention)
 * Task 59: Implement server-side guard ensuring shopId scoping & no token leakage
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { MetaobjectsService } from './metaobjects';

/**
 * Authenticated session context for API routes
 */
export interface AuthenticatedContext {
  /** Shopify shop domain (e.g., 'shop-name.myshopify.com') */
  shopId: string;
  /** GraphQL client scoped to this shop */
  admin: any;
  /** User ID from the session */
  userId?: string | bigint | null;
  /** Full session object (do not expose to client) */
  session: any;
}

/**
 * Security guard configuration
 */
export interface SecurityGuardOptions {
  /** Whether to allow access to inactive shops */
  allowInactiveShops?: boolean;
  /** Maximum request size to prevent DoS attacks */
  maxRequestSize?: number;
  /** Whether to log security events */
  enableSecurityLogging?: boolean;
}

/**
 * Server-side security guard for API routes
 * Ensures proper authentication, shop isolation, and prevents token leakage
 */
export class ServerSideSecurityGuard {
  private options: SecurityGuardOptions;

  constructor(options: SecurityGuardOptions = {}) {
    this.options = {
      allowInactiveShops: false,
      maxRequestSize: 1024 * 1024, // 1MB default
      enableSecurityLogging: true,
      ...options
    };
  }

  /**
   * Authenticates and validates a request for API access
   * @param request - The incoming request
   * @returns Authenticated context with shop-scoped GraphQL client
   * @throws Response with appropriate error status
   */
  async authenticateRequest(
    request: Request
  ): Promise<AuthenticatedContext> {
    try {
      // Step 1: Shopify authentication
      const { admin, session } = await authenticate.admin(request);

      if (!session?.shop) {
        throw json(
          { error: 'Invalid session: missing shop information' },
          { status: 401 }
        );
      }

      if (!session.accessToken) {
        throw json(
          { error: 'Invalid session: missing access token' },
          { status: 401 }
        );
      }

      // Step 2: Validate request size to prevent DoS
      if (this.options.maxRequestSize) {
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > this.options.maxRequestSize) {
          if (this.options.enableSecurityLogging) {
            console.warn(`[SecurityGuard] Request size exceeded limit: ${contentLength} bytes from shop ${session.shop}`);
          }
          throw json(
            { error: 'Request size exceeds maximum allowed limit' },
            { status: 413 }
          );
        }
      }

      // Step 3: Shop isolation validation
      const shopId = session.shop;
      const userId = (session as any).userId; // Shopify session may include userId

      // Log security event
      if (this.options.enableSecurityLogging) {
        console.log(`[SecurityGuard] Authenticated request for shop: ${shopId}, user: ${userId || 'unknown'}`);
      }

      return {
        shopId,
        admin, // This is already scoped to the authenticated shop by Shopify
        userId,
        session: this.sanitizeSession(session) // Remove sensitive fields
      };
    } catch (error) {
      // Log authentication failures
      if (this.options.enableSecurityLogging) {
        console.error('[SecurityGuard] Authentication failed:', error);
      }

      // Re-throw Remix Response objects
      if (error instanceof Response) {
        throw error;
      }

      // Handle other errors
      throw json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  }

  /**
   * Creates a shop-scoped MetaobjectsService instance
   * @param context - Authenticated context
   * @returns MetaobjectsService scoped to the authenticated shop
   */
  createScopedMetaobjectsService(context: AuthenticatedContext): MetaobjectsService {
    // The admin GraphQL client is already scoped to the authenticated shop by Shopify
    // This ensures that all queries/mutations are automatically shop-isolated
    return new MetaobjectsService(context.admin.graphql);
  }

  /**
   * Validates that data operations are shop-scoped
   * @param context - Authenticated context
   * @param entityShopId - The shop ID associated with the data being accessed
   * @throws Response if shop mismatch detected
   */
  validateShopScope(context: AuthenticatedContext, entityShopId: string): void {
    if (entityShopId !== context.shopId) {
      if (this.options.enableSecurityLogging) {
        console.warn(`[SecurityGuard] Shop scope violation: Attempted to access data from shop ${entityShopId} while authenticated as ${context.shopId}`);
      }

      throw json(
        { error: 'Access denied: resource belongs to different shop' },
        { status: 403 }
      );
    }
  }

  /**
   * Validates GraphQL operation for security concerns
   * @param query - GraphQL query string
   * @throws Response if security concerns detected
   */
  validateGraphQLOperation(query: string): void {
    // Check for potentially dangerous operations
    const dangerousPatterns = [
      /\bmutation\s+.*\bwebhook/i,
      /\bquery\s+.*\bsessions?\b/i,
      /\baccessToken/i,
      /\bapi[_-]?key/i,
      /\bsecret/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        if (this.options.enableSecurityLogging) {
          console.warn(`[SecurityGuard] Potentially dangerous GraphQL operation detected: ${pattern.source}`);
        }

        throw json(
          { error: 'GraphQL operation contains potentially dangerous patterns' },
          { status: 400 }
        );
      }
    }

    // Prevent overly broad queries that might cause performance issues
    if (query.includes('first: ') && /first:\s*([5-9]\d{2,}|\d{4,})/.test(query)) {
      throw json(
        { error: 'Query scope too broad: reduce the number of requested items' },
        { status: 400 }
      );
    }
  }

  /**
   * Sanitizes response data to prevent token leakage
   * @param data - Response data
   * @returns Sanitized data with sensitive fields removed
   */
  sanitizeResponse<T>(data: T): T {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveFields = [
      'accessToken',
      'sessionToken',
      'apiKey',
      'secret',
      '_session',
      '_token',
      '_auth',
      '_shopify'
    ];

    const sanitized = { ...data };

    // Remove sensitive fields
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        delete (sanitized as any)[field];
      }
    }

    // Recursively sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          (sanitized as any)[key] = value.map(item => 
            typeof item === 'object' ? this.sanitizeResponse(item) : item
          );
        } else {
          (sanitized as any)[key] = this.sanitizeResponse(value);
        }
      }
    }

    return sanitized;
  }

  /**
   * Removes sensitive fields from session object
   * @param session - Raw session object
   * @returns Sanitized session safe for logging/debugging
   */
  private sanitizeSession(session: any): any {
    if (!session) return session;

    const { accessToken, ...safeSesion } = session;
    return {
      ...safeSesion,
      accessToken: accessToken ? '[REDACTED]' : undefined
    };
  }

  /**
   * Creates a security headers object for API responses
   * @returns Headers object with security-related headers
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }
}

/**
 * Default security guard instance
 */
export const securityGuard = new ServerSideSecurityGuard({
  enableSecurityLogging: process.env.NODE_ENV === 'development',
  maxRequestSize: 2 * 1024 * 1024 // 2MB
});

/**
 * Helper function to authenticate and get shop-scoped context from request
 * @param request - Remix request object
 * @returns Authenticated context
 */
export async function requireAuthentication(
  request: Request
): Promise<AuthenticatedContext> {
  return securityGuard.authenticateRequest(request);
}

/**
 * Helper function to create shop-scoped services
 * @param context - Authenticated context
 * @returns Object with shop-scoped service instances
 */
export function createScopedServices(context: AuthenticatedContext) {
  return {
    metaobjectsService: securityGuard.createScopedMetaobjectsService(context)
  };
}

/**
 * Decorator for API route handlers that enforces security
 * @param handler - The route handler function
 * @returns Wrapped handler with security enforcement
 */
export function withSecurity<T extends LoaderFunctionArgs | ActionFunctionArgs>(
  handler: (args: T, context: AuthenticatedContext) => Promise<Response>
) {
  return async (args: T): Promise<Response> => {
    try {
      // Authenticate and get shop-scoped context
      const context = await requireAuthentication(args.request);

      // Call the original handler with context
      const response = await handler(args, context);

      // Add security headers to response
      const securityHeaders = securityGuard.getSecurityHeaders();
      for (const [name, value] of Object.entries(securityHeaders)) {
        response.headers.set(name, value);
      }

      return response;
    } catch (error) {
      // Error responses from security guard are already properly formatted
      if (error instanceof Response) {
        const securityHeaders = securityGuard.getSecurityHeaders();
        for (const [name, value] of Object.entries(securityHeaders)) {
          error.headers.set(name, value);
        }
        return error;
      }

      // Handle unexpected errors
      console.error('[SecurityGuard] Unexpected error in withSecurity decorator:', error);
      return json(
        { error: 'Internal server error' },
        {
          status: 500,
          headers: securityGuard.getSecurityHeaders()
        }
      );
    }
  };
}