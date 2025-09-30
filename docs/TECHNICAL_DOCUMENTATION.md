# Saskay Snacks Manager - Technical Documentation

## Overview
The Saskay Snacks Manager is a comprehensive Shopify embedded application designed for cost management, recipe calculation, and inventory tracking for food businesses. This application implements robust security measures, shop-scoped data isolation, and comprehensive audit trails.

## Architecture

### Technology Stack
- **Frontend**: React with Shopify Polaris UI components
- **Backend**: Remix framework with TypeScript
- **Database**: Shopify Metaobjects for data storage
- **Authentication**: Shopify App authentication with session management
- **Testing**: Jest with comprehensive unit and E2E testing
- **Security**: Multi-layered security with shop isolation and server-side guards

### System Components

#### 1. Services Layer
- **MetaobjectsService**: Core CRUD operations for ingredients, recipes, and price history
- **SecurityGuardService**: Server-side security enforcement and validation
- **AuditLogService**: Comprehensive audit trail management
- **PriceHistoryService**: Price tracking and change management

#### 2. Security Architecture
- **Shop-scoped Isolation**: All data operations are scoped to the authenticated shop
- **Server-side Guards**: Authentication and authorization middleware
- **GraphQL Operation Validation**: Query analysis and security checks
- **Response Sanitization**: Automatic removal of sensitive data from responses
- **Session Management**: Secure session handling with token validation

#### 3. Data Models

##### MetaobjectIngredient
```typescript
interface MetaobjectIngredient {
  id: string | null;
  gid?: string; // Shopify GID
  name: string;
  costPerUnit: number;
  unitType: 'weight' | 'volume' | 'each';
  isActive: boolean;
  isComplimentary: boolean;
  versionToken: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}
```

##### MetaobjectPriceHistory
```typescript
interface MetaobjectPriceHistory {
  id: string;
  gid?: string;
  ingredientId: string;
  ingredientGid: string;
  costPerUnit: number;
  previousCost: number | null;
  deltaPercent: number;
  timestamp: string;
  changedBy: string;
  changeReason: string;
  auditEntryId: string;
}
```

## Functional Requirements Implementation

### FR-017: Shop Data Isolation
**Implementation Status**: ✅ **COMPLETE**

- **Service-level isolation**: All MetaobjectsService operations include shop scoping
- **Authentication validation**: Every request validates shop-specific authentication
- **Data filtering**: All queries automatically filter results by shop ID
- **Cross-shop access prevention**: Security guards prevent unauthorized shop data access
- **Testing coverage**: 11 comprehensive tests validating isolation mechanisms

**Security Measures**:
- Shop ID validation on all data operations
- GraphQL client scoping per shop
- Session-based shop identification
- Automatic data filtering by shop context

### FR-026: Security and Audit Compliance
**Implementation Status**: ✅ **COMPLETE**

- **Comprehensive audit trails**: All data changes logged with user attribution
- **Security guards**: Server-side validation and sanitization
- **Token management**: Secure handling and automatic sanitization of access tokens
- **Operation validation**: GraphQL query analysis for security threats
- **Response sanitization**: Automatic removal of sensitive fields

**Audit Features**:
- Change tracking with timestamps and user attribution
- Price history with delta calculations
- Soft delete capabilities with audit trails
- Security event logging
- Compliance reporting capabilities

## API Documentation

### MetaobjectsService Methods

#### Ingredient Operations
```typescript
// Create new ingredient
async createIngredient(ingredient: CreateIngredientInput): Promise<MetaobjectIngredient>

// Get single ingredient
async getIngredient(id: string): Promise<MetaobjectIngredient | null>

// List ingredients with filtering
async listIngredients(query?: MetaobjectQuery): Promise<MetaobjectConnection<MetaobjectIngredient>>

// Update ingredient
async updateIngredient(id: string, updates: Partial<MetaobjectIngredient>): Promise<MetaobjectIngredient>

// Soft delete ingredient
async softDeleteIngredient(id: string): Promise<MetaobjectIngredient>
```

#### Price History Operations
```typescript
// Get price history for ingredient
async getPriceHistory(ingredientId: string, options?: PriceHistoryOptions): Promise<PriceHistoryResponse>

// Create price history entry
async createPriceHistoryEntry(entry: CreatePriceHistoryInput): Promise<MetaobjectPriceHistory>
```

### SecurityGuardService Methods

#### Authentication and Validation
```typescript
// Authenticate request and get shop context
async authenticateRequest(request: Request): Promise<ShopContext>

// Validate shop scope access
validateShopScope(context: ShopContext, targetShopId: string): void

// Validate GraphQL operations
validateGraphQLOperation(query: string): void

// Sanitize response data
sanitizeResponse(data: any): any
```

#### Service Creation
```typescript
// Create shop-scoped services
createScopedServices(context: ShopContext): ScopedServices

// Get security headers
getSecurityHeaders(): Record<string, string>
```

## Testing Documentation

### Test Coverage Summary
- **Security Tests**: 24 tests (11 shop isolation + 13 security guard)
- **E2E Tests**: 15 tests (8 ingredient workflow + 7 recipe/cost workflow)
- **Total Coverage**: 39 comprehensive tests

### Test Categories

#### 1. Security Tests (`tests/security/`)
- **Shop-scoped Isolation Tests**: Validate FR-017 compliance
  - Multi-shop data isolation
  - Cross-shop access prevention
  - Session token security
  - Service scoping validation

- **Security Guard Tests**: Validate FR-026 compliance
  - Authentication middleware
  - GraphQL operation validation
  - Response sanitization
  - Security header management

#### 2. End-to-End Tests (`tests/e2e/`)
- **Ingredient Workflow Tests**: Complete CRUD lifecycle testing
  - Full lifecycle: create → read → update → delete
  - Search and filtering operations
  - Error handling and validation
  - Performance and pagination
  - Data consistency validation

- **Recipe and Cost Workflow Tests**: Business logic testing
  - Recipe creation with ingredients
  - Cost calculation accuracy
  - Price history tracking
  - Bulk operations and imports
  - Profitability analysis

### Running Tests
```bash
# Run all tests
npm test

# Run security tests only
npm test -- tests/security/

# Run E2E tests only
npm test -- tests/e2e/

# Run specific test file
npm test -- tests/security/shop-scoped-isolation.test.ts
```

## Security Compliance

### Data Protection Measures
1. **Shop Isolation**: Complete data segregation between shops
2. **Access Control**: Authentication required for all operations
3. **Data Sanitization**: Automatic removal of sensitive information
4. **Audit Trails**: Comprehensive logging of all data changes
5. **Session Security**: Secure session management with token validation

### Security Headers
The application implements comprehensive security headers:
```typescript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache'
}
```

### GraphQL Security
- **Query Validation**: Analysis of GraphQL operations for security threats
- **Rate Limiting**: Protection against excessive queries
- **Field Filtering**: Restriction of sensitive field access
- **Operation Limits**: Prevention of overly broad queries

## Performance Considerations

### Optimization Features
1. **Pagination**: Efficient handling of large datasets
2. **Caching**: Strategic caching of frequently accessed data
3. **Bulk Operations**: Efficient batch processing for imports
4. **Lazy Loading**: On-demand data fetching
5. **Connection Pooling**: Optimized database connections

### Monitoring and Metrics
- **Performance Tracking**: Response time monitoring
- **Error Tracking**: Comprehensive error logging
- **Usage Analytics**: Operation frequency analysis
- **Security Monitoring**: Security event tracking

## Deployment Requirements

### Environment Variables
```bash
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=your_app_url
DATABASE_URL=your_database_url
SESSION_SECRET=your_session_secret
```

### Prerequisites
- Node.js 18+
- Shopify Partner Account
- Shopify App registration
- Database setup (Shopify Metaobjects)

### Production Checklist
- [ ] Environment variables configured
- [ ] Security headers enabled
- [ ] Audit logging enabled
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] GDPR compliance verified

## Maintenance and Support

### Monitoring
- **Health Checks**: Regular system health validation
- **Performance Metrics**: Response time and throughput monitoring
- **Error Tracking**: Comprehensive error logging and alerting
- **Security Monitoring**: Real-time security event tracking

### Backup and Recovery
- **Data Backup**: Regular backups of critical data
- **Disaster Recovery**: Recovery procedures for system failures
- **Version Control**: Complete version history maintenance
- **Rollback Procedures**: Safe rollback mechanisms for deployments

### Updates and Maintenance
- **Security Updates**: Regular security patch application
- **Feature Updates**: Controlled feature deployment
- **Performance Optimization**: Ongoing performance improvements
- **Compliance Updates**: Regular compliance requirement updates

---

## Version History
- **v1.0.0**: Initial release with core ingredient management
- **v1.1.0**: Added security guards and shop isolation
- **v1.2.0**: Implemented comprehensive testing suite
- **v1.3.0**: Added recipe and cost calculation features
- **Current**: v1.3.0 - Production ready with full security compliance

## Support Contacts
- **Technical Support**: [Contact Information]
- **Security Issues**: [Security Contact]
- **Business Support**: [Business Contact]

---

*This documentation is maintained as part of the Saskay Snacks Manager project and is updated with each release.*