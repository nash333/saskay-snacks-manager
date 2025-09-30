/**
 * Security Guard Unit Tests
 * Tests the ServerSideSecurityGuard implementation (Task 59)
 * Verifies FR-017, FR-026 security measures
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock Shopify dependencies before importing
jest.mock('../../app/shopify.server', () => ({
  authenticate: {
    admin: jest.fn()
  }
}));

jest.mock('../../app/db.server', () => ({
  default: {}
}));

// Import after mocking
import { ServerSideSecurityGuard } from '../../app/services/security-guard';

describe('ServerSideSecurityGuard Core Functionality', () => {
  let securityGuard: ServerSideSecurityGuard;

  beforeEach(() => {
    securityGuard = new ServerSideSecurityGuard({
      enableSecurityLogging: false, // Disable logging for tests
      maxRequestSize: 1024 * 1024 // 1MB
    });
  });

  describe('validateShopScope (FR-017)', () => {
    test('should allow access to same shop data', () => {
      const context = {
        shopId: 'test-shop.myshopify.com',
        admin: {} as any,
        userId: '12345',
        session: {} as any
      };

      expect(() => {
        securityGuard.validateShopScope(context, 'test-shop.myshopify.com');
      }).not.toThrow();
    });

    test('should reject access to different shop data', () => {
      const context = {
        shopId: 'test-shop.myshopify.com',
        admin: {} as any,
        userId: '12345',
        session: {} as any
      };

      expect(() => {
        securityGuard.validateShopScope(context, 'other-shop.myshopify.com');
      }).toThrow();
    });
  });

  describe('validateGraphQLOperation (FR-026)', () => {
    test('should allow safe GraphQL operations', () => {
      const safeQuery = `
        query GetIngredients {
          metaobjects(type: "ingredient", first: 50) {
            edges {
              node {
                id
                fields {
                  key
                  value
                }
              }
            }
          }
        }
      `;

      expect(() => {
        securityGuard.validateGraphQLOperation(safeQuery);
      }).not.toThrow();
    });

    test('should reject queries with dangerous patterns', () => {
      const dangerousQueries = [
        'query { sessions { accessToken } }',
        'mutation webhookCreate { webhook { apiKey } }',
        'query { shop { secret } }'
      ];

      dangerousQueries.forEach(query => {
        expect(() => {
          securityGuard.validateGraphQLOperation(query);
        }).toThrow();
      });
    });

    test('should reject overly broad queries', () => {
      const broadQuery = `
        query GetTooManyItems {
          metaobjects(type: "ingredient", first: 10000) {
            edges { node { id } }
          }
        }
      `;

      expect(() => {
        securityGuard.validateGraphQLOperation(broadQuery);
      }).toThrow();
    });
  });

  describe('sanitizeResponse (FR-026)', () => {
    test('should remove sensitive fields from response', () => {
      const unsafeData = {
        ingredient: {
          id: 'ingredient-1',
          name: 'Flour',
          costPerUnit: 2.50
        },
        accessToken: 'secret-token-123',
        sessionToken: 'session-token-456',
        _shopify: { secret: 'api-secret' }
      };

      const sanitized = securityGuard.sanitizeResponse(unsafeData);

      expect(sanitized.ingredient).toEqual({
        id: 'ingredient-1',
        name: 'Flour',
        costPerUnit: 2.50
      });
      expect(sanitized).not.toHaveProperty('accessToken');
      expect(sanitized).not.toHaveProperty('sessionToken');
      expect(sanitized).not.toHaveProperty('_shopify');
    });

    test('should recursively sanitize nested objects', () => {
      const nestedUnsafeData = {
        data: {
          ingredients: [
            {
              id: 'ingredient-1',
              name: 'Flour',
              _session: { token: 'secret' }
            }
          ],
          meta: {
            apiKey: 'secret-key',
            shopInfo: {
              name: 'Test Shop',
              secret: 'shop-secret'
            }
          }
        }
      };

      const sanitized = securityGuard.sanitizeResponse(nestedUnsafeData);

      expect(sanitized.data.ingredients[0]).toEqual({
        id: 'ingredient-1',
        name: 'Flour'
      });
      expect(sanitized.data.ingredients[0]).not.toHaveProperty('_session');
      expect(sanitized.data.meta.shopInfo.name).toBe('Test Shop');
      expect(sanitized.data.meta).not.toHaveProperty('apiKey');
      expect(sanitized.data.meta.shopInfo).not.toHaveProperty('secret');
    });

    test('should handle arrays of objects', () => {
      const dataWithArrays = {
        ingredients: [
          { id: '1', name: 'Flour', accessToken: 'secret1' },
          { id: '2', name: 'Sugar', _session: { token: 'secret2' } }
        ]
      };

      const sanitized = securityGuard.sanitizeResponse(dataWithArrays);

      expect(sanitized.ingredients).toHaveLength(2);
      expect(sanitized.ingredients[0]).toEqual({ id: '1', name: 'Flour' });
      expect(sanitized.ingredients[1]).toEqual({ id: '2', name: 'Sugar' });
      expect(sanitized.ingredients[0]).not.toHaveProperty('accessToken');
      expect(sanitized.ingredients[1]).not.toHaveProperty('_session');
    });
  });

  describe('getSecurityHeaders', () => {
    test('should return appropriate security headers', () => {
      const headers = securityGuard.getSecurityHeaders();

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Cache-Control']).toContain('no-store');
      expect(headers['Cache-Control']).toContain('no-cache');
      expect(headers['Pragma']).toBe('no-cache');
    });
  });

  describe('Security Configuration', () => {
    test('should initialize with default options', () => {
      const defaultGuard = new ServerSideSecurityGuard();
      const headers = defaultGuard.getSecurityHeaders();
      
      expect(headers).toHaveProperty('X-Content-Type-Options');
      expect(headers).toHaveProperty('X-Frame-Options');
    });

    test('should accept custom configuration', () => {
      const customGuard = new ServerSideSecurityGuard({
        enableSecurityLogging: true,
        maxRequestSize: 512 * 1024, // 512KB
        allowInactiveShops: true
      });

      const headers = customGuard.getSecurityHeaders();
      expect(headers).toHaveProperty('X-Content-Type-Options');
    });
  });

  describe('Session Sanitization', () => {
    test('should sanitize session object removing access tokens', () => {
      const unsafeSession = {
        shop: 'test-shop.myshopify.com',
        accessToken: 'shpat_secret_token_123',
        userId: '12345',
        scope: 'write_products'
      };

      // Access private method for testing
      const sanitized = (securityGuard as any).sanitizeSession(unsafeSession);

      expect(sanitized.shop).toBe('test-shop.myshopify.com');
      expect(sanitized.userId).toBe('12345');
      expect(sanitized.scope).toBe('write_products');
      expect(sanitized.accessToken).toBe('[REDACTED]');
    });

    test('should handle null session', () => {
      const sanitized = (securityGuard as any).sanitizeSession(null);
      expect(sanitized).toBeNull();
    });
  });
});