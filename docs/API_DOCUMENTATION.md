# API Documentation
## Saskay Snacks Manager

### Document Information
- **Version**: 1.3.0
- **Last Updated**: December 2024
- **API Type**: GraphQL with Shopify Admin API
- **Authentication**: Shopify OAuth 2.0

---

## Table of Contents

1. [Authentication](#authentication)
2. [Core Services](#core-services)
3. [Data Models](#data-models)
4. [API Endpoints](#api-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Security](#security)
8. [Examples](#examples)
9. [SDKs and Libraries](#sdks-and-libraries)

---

## Authentication

### Shopify OAuth 2.0 Integration

The Saskay Snacks Manager uses Shopify's embedded app authentication system with OAuth 2.0.

**Authentication Flow**:
1. User installs the app from Shopify App Store
2. Shopify redirects to app with authorization code
3. App exchanges code for access token
4. All subsequent requests use the access token

**Authentication Example**:
```typescript
import { authenticate } from "~/shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  
  // admin: GraphQL client for Shopify Admin API
  // session: Contains shop info and access token
  
  return json({ shop: session.shop });
}
```

### Security Context

All authenticated requests create a security context:
```typescript
interface ShopContext {
  shopId: string;        // Shop identifier
  admin: AdminApiClient; // Shopify GraphQL client
  userId: string;        // User identifier
  session: Session;      // Session object (sanitized)
}
```

---

## Core Services

### MetaobjectsService

The primary service for managing ingredients, recipes, and related data through Shopify Metaobjects.

**Service Initialization**:
```typescript
import { MetaobjectsService } from "~/services/metaobjects";

const service = new MetaobjectsService(admin.graphql, session.shop);
```

**Key Features**:
- Shop-scoped data operations
- Automatic data validation
- Soft delete capabilities
- Price history tracking
- Audit trail generation

### SecurityGuardService

Server-side security enforcement and validation service.

**Service Usage**:
```typescript
import { ServerSideSecurityGuard } from "~/services/security-guard";

const securityGuard = new ServerSideSecurityGuard({
  enableSecurityLogging: true,
  maxRequestSize: 1024 * 1024 // 1MB
});

// Authenticate and validate request
const context = await securityGuard.authenticateRequest(request);
```

---

## Data Models

### MetaobjectIngredient

Represents a food ingredient with cost and unit information.

```typescript
interface MetaobjectIngredient {
  id: string | null;              // Internal ID
  gid?: string;                   // Shopify Global ID
  name: string;                   // Ingredient name
  costPerUnit: number;            // Cost per unit
  unitType: 'weight' | 'volume' | 'each'; // Unit type
  isActive: boolean;              // Active status
  isComplimentary: boolean;       // Complimentary item flag
  versionToken: string | null;    // Version control token
  createdAt?: string;             // Creation timestamp
  updatedAt?: string;             // Last update timestamp
  deletedAt?: string | null;      // Soft delete timestamp
}
```

**Field Validation**:
- `name`: Required, 1-100 characters
- `costPerUnit`: Required, positive number
- `unitType`: Required, one of: weight, volume, each
- `isActive`: Required, boolean
- `isComplimentary`: Required, boolean

### MetaobjectPackaging

Represents packaging information for ingredients.

```typescript
interface MetaobjectPackaging {
  id: string | null;              // Internal ID
  gid?: string;                   // Shopify Global ID
  name: string;                   // Package name
  unitCount: number;              // Units per package
  costPerPackage: number;         // Package cost
  isActive: boolean;              // Active status
  versionToken: string | null;    // Version control token
  createdAt?: string;             // Creation timestamp
  updatedAt?: string;             // Last update timestamp
}
```

### MetaobjectPriceHistory

Tracks price changes for ingredients with full audit trail.

```typescript
interface MetaobjectPriceHistory {
  id: string;                     // History entry ID
  gid?: string;                   // Shopify Global ID
  ingredientId: string;           // Associated ingredient ID
  ingredientGid: string;          // Associated ingredient GID
  costPerUnit: number;            // New cost per unit
  previousCost: number | null;    // Previous cost
  deltaPercent: number;           // Percentage change
  timestamp: string;              // Change timestamp
  changedBy: string;              // User who made change
  changeReason: string;           // Reason for change
  auditEntryId: string;           // Associated audit entry
}
```

### Query and Connection Types

```typescript
interface MetaobjectQuery {
  first?: number;                 // Number of items to fetch
  after?: string;                 // Cursor for pagination
  fields?: string[];              // Specific fields to return
  filter?: Record<string, any>;   // Filter criteria
  sortKey?: string;               // Sort field
  reverse?: boolean;              // Reverse sort order
}

interface MetaobjectConnection<T> {
  edges: Array<{
    cursor: string;               // Pagination cursor
    node: T;                      // Data object
  }>;
  pageInfo: {
    hasNextPage: boolean;         // More data available
    hasPreviousPage: boolean;     // Previous data available
    startCursor: string | null;   // First cursor
    endCursor: string | null;     // Last cursor
  };
  totalCount?: number;            // Total items (if available)
}
```

---

## API Endpoints

### Ingredient Management

#### Create Ingredient

**Method**: `POST`  
**Endpoint**: `/app/api/ingredients`  
**Authentication**: Required

**Request Body**:
```typescript
{
  name: string;
  costPerUnit: number;
  unitType: 'weight' | 'volume' | 'each';
  isActive?: boolean;          // Default: true
  isComplimentary?: boolean;   // Default: false
  description?: string;
  supplier?: string;
  category?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  data: MetaobjectIngredient;
  message?: string;
}
```

**Example**:
```typescript
// Request
const response = await fetch('/app/api/ingredients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'All-Purpose Flour',
    costPerUnit: 2.50,
    unitType: 'weight',
    category: 'grains',
    supplier: 'Local Mills'
  })
});

// Response
{
  "success": true,
  "data": {
    "id": "ingredient-12345",
    "gid": "gid://shopify/Metaobject/ingredient-12345",
    "name": "All-Purpose Flour",
    "costPerUnit": 2.50,
    "unitType": "weight",
    "isActive": true,
    "isComplimentary": false,
    "createdAt": "2024-12-20T10:00:00Z"
  }
}
```

#### Get Ingredient

**Method**: `GET`  
**Endpoint**: `/app/api/ingredients/:id`  
**Authentication**: Required

**Parameters**:
- `id`: Ingredient ID (required)

**Response**:
```typescript
{
  success: boolean;
  data: MetaobjectIngredient | null;
  message?: string;
}
```

#### List Ingredients

**Method**: `GET`  
**Endpoint**: `/app/api/ingredients`  
**Authentication**: Required

**Query Parameters**:
- `first`: Number of items (default: 50, max: 100)
- `after`: Pagination cursor
- `category`: Filter by category
- `search`: Search term
- `includeInactive`: Include inactive items (default: false)

**Response**:
```typescript
{
  success: boolean;
  data: MetaobjectConnection<MetaobjectIngredient>;
  message?: string;
}
```

**Example**:
```typescript
// Request
const response = await fetch('/app/api/ingredients?first=25&category=grains');

// Response
{
  "success": true,
  "data": {
    "edges": [
      {
        "cursor": "cursor-1",
        "node": {
          "id": "ingredient-1",
          "name": "All-Purpose Flour",
          "costPerUnit": 2.50,
          "unitType": "weight",
          "isActive": true
        }
      }
    ],
    "pageInfo": {
      "hasNextPage": false,
      "hasPreviousPage": false,
      "startCursor": "cursor-1",
      "endCursor": "cursor-1"
    }
  }
}
```

#### Update Ingredient

**Method**: `PUT`  
**Endpoint**: `/app/api/ingredients/:id`  
**Authentication**: Required

**Parameters**:
- `id`: Ingredient ID (required)

**Request Body**:
```typescript
{
  name?: string;
  costPerUnit?: number;
  unitType?: 'weight' | 'volume' | 'each';
  isActive?: boolean;
  isComplimentary?: boolean;
  description?: string;
  supplier?: string;
  category?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  data: MetaobjectIngredient;
  message?: string;
}
```

#### Delete Ingredient (Soft Delete)

**Method**: `DELETE`  
**Endpoint**: `/app/api/ingredients/:id`  
**Authentication**: Required

**Parameters**:
- `id`: Ingredient ID (required)

**Response**:
```typescript
{
  success: boolean;
  data: MetaobjectIngredient;
  message?: string;
}
```

### Price History

#### Get Price History

**Method**: `GET`  
**Endpoint**: `/app/api/ingredients/:id/price-history`  
**Authentication**: Required

**Parameters**:
- `id`: Ingredient ID (required)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)
- `startDate`: Filter from date (ISO string)
- `endDate`: Filter to date (ISO string)

**Response**:
```typescript
{
  success: boolean;
  data: {
    entries: MetaobjectPriceHistory[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalEntries: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  message?: string;
}
```

### Security Endpoints

#### Health Check

**Method**: `GET`  
**Endpoint**: `/app/api/health`  
**Authentication**: Not required

**Response**:
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: boolean;
    shopify: boolean;
    security: boolean;
  };
}
```

---

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```typescript
{
  success: false;
  error: {
    code: string;           // Error code
    message: string;        // Human-readable message
    details?: any;          // Additional error details
    timestamp: string;      // Error timestamp
    requestId: string;      // Request tracking ID
  };
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Authentication required |
| `AUTHORIZATION_DENIED` | 403 | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `SHOP_SCOPE_VIOLATION` | 403 | Cross-shop access attempt |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Error Examples

**Validation Error**:
```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": {
        "name": "Name is required",
        "costPerUnit": "Must be a positive number"
      }
    },
    "timestamp": "2024-12-20T10:00:00Z",
    "requestId": "req-12345"
  }
}
```

**Authorization Error**:
```typescript
{
  "success": false,
  "error": {
    "code": "SHOP_SCOPE_VIOLATION",
    "message": "Access denied: resource belongs to different shop",
    "timestamp": "2024-12-20T10:00:00Z",
    "requestId": "req-12346"
  }
}
```

---

## Rate Limiting

### Rate Limit Headers

All API responses include rate limiting headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
X-Retry-After: 60
```

### Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|---------|
| Read Operations | 1000 requests | 1 hour |
| Write Operations | 100 requests | 1 hour |
| Authentication | 10 attempts | 1 minute |
| Bulk Operations | 10 requests | 1 hour |

### Rate Limit Exceeded Response

```typescript
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "resetTime": "2024-12-20T11:00:00Z"
    },
    "timestamp": "2024-12-20T10:00:00Z",
    "requestId": "req-12347"
  }
}
```

---

## Security

### Security Headers

All API responses include security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
```

### Data Sanitization

All API responses are automatically sanitized to remove sensitive information:

**Sanitized Fields**:
- `accessToken`
- `sessionToken`
- `apiKey`
- `secret`
- `_shopify`
- `_session`
- Any field starting with `_`

### Shop Scope Validation

All data operations are automatically scoped to the authenticated shop:

```typescript
// Automatic shop scoping
const ingredients = await metaobjectsService.listIngredients();
// Only returns ingredients for the authenticated shop
```

---

## Examples

### Complete Ingredient Workflow

```typescript
// 1. Create ingredient
const createResponse = await fetch('/app/api/ingredients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Premium Chocolate',
    costPerUnit: 12.00,
    unitType: 'weight',
    category: 'chocolates'
  })
});

const { data: ingredient } = await createResponse.json();

// 2. Update ingredient price
const updateResponse = await fetch(`/app/api/ingredients/${ingredient.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    costPerUnit: 13.50
  })
});

// 3. Get price history
const historyResponse = await fetch(`/app/api/ingredients/${ingredient.id}/price-history`);
const { data: priceHistory } = await historyResponse.json();

// 4. List all ingredients
const listResponse = await fetch('/app/api/ingredients?first=50');
const { data: ingredients } = await listResponse.json();

// 5. Soft delete ingredient
const deleteResponse = await fetch(`/app/api/ingredients/${ingredient.id}`, {
  method: 'DELETE'
});
```

### Error Handling Example

```typescript
async function createIngredient(ingredientData) {
  try {
    const response = await fetch('/app/api/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ingredientData)
    });

    const result = await response.json();

    if (!result.success) {
      // Handle API error
      console.error('API Error:', result.error.message);
      
      if (result.error.code === 'VALIDATION_ERROR') {
        // Handle validation errors
        Object.entries(result.error.details.fields).forEach(([field, message]) => {
          console.error(`${field}: ${message}`);
        });
      }
      
      return null;
    }

    return result.data;
  } catch (error) {
    // Handle network error
    console.error('Network Error:', error.message);
    return null;
  }
}
```

### Pagination Example

```typescript
async function getAllIngredients() {
  const allIngredients = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const url = cursor 
      ? `/app/api/ingredients?first=50&after=${cursor}`
      : '/app/api/ingredients?first=50';
    
    const response = await fetch(url);
    const { data } = await response.json();

    allIngredients.push(...data.edges.map(edge => edge.node));
    
    hasNextPage = data.pageInfo.hasNextPage;
    cursor = data.pageInfo.endCursor;
  }

  return allIngredients;
}
```

---

## SDKs and Libraries

### JavaScript/TypeScript SDK

```typescript
import { SaskaySnacksClient } from '@saskay/snacks-sdk';

const client = new SaskaySnacksClient({
  apiUrl: 'https://your-app.com/app/api',
  authentication: 'shopify-session' // Handled automatically in embedded app
});

// Usage
const ingredients = await client.ingredients.list({ first: 25 });
const newIngredient = await client.ingredients.create({
  name: 'Vanilla Extract',
  costPerUnit: 25.00,
  unitType: 'volume'
});
```

### React Hooks

```typescript
import { useIngredients, useCreateIngredient } from '@saskay/snacks-react';

function IngredientsPage() {
  const { data: ingredients, loading, error } = useIngredients({ first: 50 });
  const [createIngredient, { loading: creating }] = useCreateIngredient();

  const handleCreate = async (ingredientData) => {
    try {
      const newIngredient = await createIngredient(ingredientData);
      console.log('Created:', newIngredient);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {ingredients.edges.map(({ node: ingredient }) => (
        <div key={ingredient.id}>{ingredient.name}</div>
      ))}
    </div>
  );
}
```

---

## Changelog

### Version 1.3.0 (Current)
- Added comprehensive security controls
- Implemented shop-scoped data isolation
- Added price history tracking
- Enhanced error handling and validation

### Version 1.2.0
- Added soft delete functionality
- Implemented audit trails
- Enhanced pagination support
- Added bulk operation capabilities

### Version 1.1.0
- Added packaging management
- Implemented version control
- Enhanced search and filtering
- Added rate limiting

### Version 1.0.0
- Initial API release
- Basic ingredient management
- Shopify integration
- Authentication system

---

## Support and Feedback

### API Support
- **Documentation**: [https://docs.saskaysnacks.com](https://docs.saskaysnacks.com)
- **Support Email**: api-support@saskaysnacks.com
- **Discord Community**: [https://discord.gg/saskaysnacks](https://discord.gg/saskaysnacks)

### Reporting Issues
- **Bug Reports**: [GitHub Issues](https://github.com/saskaysnacks/manager/issues)
- **Feature Requests**: [Feature Request Form](https://saskaysnacks.com/feature-request)
- **Security Issues**: security@saskaysnacks.com

---

**Last Updated**: December 2024  
**API Version**: 1.3.0  
**Documentation Version**: 1.0