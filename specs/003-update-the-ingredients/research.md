# Research: Ingredients Management System

**Feature**: 003-update-the-ingredients
**Date**: 2025-09-30
**Status**: Complete

## Research Summary

This document consolidates research findings for implementing the Ingredients Management System using Shopify Metaobjects API, Remix framework patterns, and referential integrity enforcement.

## 1. Shopify Metaobjects API Research

### Decision: Use Shopify Admin GraphQL API for Metaobjects
**Rationale**:
- Native Shopify storage eliminates need for custom database tables
- Automatic data persistence and backup via Shopify infrastructure
- Built-in query/filtering capabilities through GraphQL
- Metaobjects support relationships (many-to-many for recipe-ingredient connections)
- Version tracking via `updatedAt` fields

**Key API Capabilities**:
- `metaobjectDefinitionCreate` - Define schemas for ingredient, category, unit_type, recipe
- `metaobjectCreate` - Create individual instances
- `metaobjectUpdate` - Update existing instances
- `metaobjectDelete` - Hard delete (we'll layer soft delete on top)
- `metaobjects` query - Pagination, filtering, relationship traversal

**Rate Limits**:
- 50 requests/second burst, 40/second sustained
- 250 metaobjects per page (requires pagination for large datasets)
- Cost-based throttling: queries count as 1-10 points depending on complexity

**Alternatives Considered**:
- Custom Prisma models → Rejected: Adds database complexity, loses Shopify integration benefits
- Shopify Products with metafields → Rejected: Ingredients aren't sellable products, misuse of product model

## 2. Data Relationships & Referential Integrity

### Decision: Many-to-Many with Relationship Field + Application-Layer Enforcement
**Rationale**:
- Shopify metaobjects support `list.metaobject_reference` field type for relationships
- Recipe metaobject contains `ingredients` field (list of ingredient references + quantities)
- Ingredient metaobject contains `used_in_recipes` field (list of recipe references)
- Bidirectional sync required at application layer (Shopify doesn't auto-sync reverse relationships)

**Deletion Strategy**:
- Query dependent entities before delete (`metaobjects` query with filter)
- Block deletion if dependencies found (return error with affected entity list)
- Soft delete via `is_active: false` field (preserves audit trail)
- Hard delete only for truly orphaned entities

**Implementation Pattern**:
```typescript
// Before delete ingredient
const recipes = await admin.graphql(`
  query FindRecipesUsingIngredient($ingredientGid: ID!) {
    metaobjects(type: "recipe", first: 250,
      query: "ingredients:$ingredientGid") {
      edges { node { id, name } }
    }
  }
`, { ingredientGid });

if (recipes.length > 0) {
  throw new Error(`Cannot delete: Used in ${recipes.length} recipe(s)`);
}
```

**Alternatives Considered**:
- Database foreign keys → Not available with Shopify metaobjects
- Cascade delete → Rejected: Dangerous, violates requirement to prevent deletion
- Orphan cleanup job → Partial solution, doesn't prevent deletion

## 3. Validation Strategy

### Decision: Multi-Layer Validation (Client + Server + Schema)
**Rationale**:
- Shopify metaobject definitions enforce schema-level validation (types, required fields)
- Server-side validation enforces business rules before API calls
- Client-side validation improves UX (immediate feedback)

**Validation Layers**:
1. **Schema Validation** (Shopify metaobject definition):
   - Field types (string, number, boolean, list, reference)
   - Required fields enforcement
   - Character limits

2. **Business Rule Validation** (Server service):
   - Unique name validation (query existing before create)
   - Category/unit type must exist (validate references)
   - Cost per unit ≥ 0
   - SKU format validation (alphanumeric + hyphens)

3. **UI Validation** (Polaris components):
   - Real-time field validation
   - Error messages with guidance
   - Disable submit until valid

**Implementation Pattern**:
```typescript
class IngredientValidationService {
  async validateCreate(data: IngredientFormData): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Uniqueness check
    const existing = await this.findByName(data.name);
    if (existing) errors.push({ field: 'name', message: 'Already exists' });

    // Reference validation
    const category = await this.metaobjects.getCategory(data.category);
    if (!category) errors.push({ field: 'category', message: 'Invalid category' });

    // Business rules
    if (data.cost_per_unit < 0) errors.push({ field: 'cost_per_unit', message: 'Must be ≥ 0' });

    return { isValid: errors.length === 0, errors };
  }
}
```

**Alternatives Considered**:
- Schema-only validation → Rejected: Doesn't enforce business rules like uniqueness
- Runtime validation library (Zod, Yup) → Future enhancement, not blocking

## 4. Search & Filtering Implementation

### Decision: Shopify GraphQL Query + Client-Side Filtering Hybrid
**Rationale**:
- Shopify metaobjects query supports basic text search via `query` parameter
- Filters (category, supplier, allergens) applied via GraphQL query clauses
- Pagination via `first/last` and `after/before` cursors
- Client-side sorting for < 250 results, server-side for larger datasets

**Query Pattern**:
```graphql
query SearchIngredients($query: String, $first: Int, $after: String) {
  metaobjects(
    type: "ingredient"
    first: $first
    after: $after
    query: $query
    sortKey: "display_name"
  ) {
    edges {
      node {
        id
        fields {
          key
          value
          references { edges { node { id, handle } } }
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Search Query Syntax**:
- Name search: `query: "name:flour"`
- Category filter: `query: "category:grains"`
- Combined: `query: "name:flour AND category:grains"`
- Cost range: `query: "cost_per_unit:>=5 AND cost_per_unit:<=10"`

**Alternatives Considered**:
- Algolia/Elasticsearch → Rejected: Overkill for 500-1000 ingredients
- Load all + client filter → Rejected: Poor performance >250 ingredients
- Custom search service → Future optimization if Shopify query insufficient

## 5. Remix Route & Data Loading Patterns

### Decision: Resource Routes with Loader/Action Pattern
**Rationale**:
- `loader` function for GET requests (search, list, detail views)
- `action` function for mutations (create, update, delete)
- Form submissions use Remix `<Form>` component (progressive enhancement)
- Optimistic UI updates via `useNavigation` and `useActionData`

**Route Structure**:
- `/app/ingredients` → Main ingredient list page (existing, enhance)
- `/app/ingredients/:id` → Ingredient detail/edit view (NEW)
- `/app/config` → Metaobject configuration (existing, enhance)
- `/app/recipes` → Recipe management (NEW)

**Data Loading Pattern**:
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  const searchParams = {
    query: url.searchParams.get('query'),
    category: url.searchParams.get('category'),
    page: parseInt(url.searchParams.get('page') || '1')
  };

  const service = new IngredientSearchService(admin.graphql);
  const results = await service.search(searchParams);

  return json({ results, searchParams });
}
```

**Alternatives Considered**:
- API routes only → Rejected: Loses Remix SSR and progressive enhancement benefits
- Client-side data fetching → Rejected: Slower initial page load, no SSR

## 6. Soft Delete & Audit Trail

### Decision: `is_active` Flag + `deleted_at` Timestamp
**Rationale**:
- Preserves ingredient data for historical recipes
- Allows audit trail without separate audit log table
- Simple implementation: filter `is_active:true` in queries
- Hard delete option for admin cleanup (future feature)

**Metaobject Fields**:
- `is_active`: boolean (default: true)
- `deleted_at`: string (ISO 8601 timestamp, null if active)
- `deleted_by`: string (user ID who deleted, optional)

**Query Pattern**:
```typescript
// Active ingredients only
query: "is_active:true"

// Include deleted (admin view)
query: "*" // No filter

// Restore ingredient
await metaobjects.update(id, {
  is_active: true,
  deleted_at: null
});
```

**Alternatives Considered**:
- Separate audit log table → Rejected: Adds complexity, separate storage
- Hard delete only → Rejected: Violates data retention requirements
- Version history tracking → Future enhancement, not blocking

## 7. Component Library & UI Patterns

### Decision: Shopify Polaris Components
**Rationale**:
- Already in use (existing app.ingredients.tsx uses Polaris)
- Native Shopify Admin look and feel
- Accessibility built-in (WCAG 2.1 AA compliance)
- Form validation, loading states, error handling components

**Key Components**:
- `Page` + `Layout` → Page structure
- `Card` → Content containers
- `DataTable` → Ingredient list view
- `Form` + `FormLayout` → Create/edit forms
- `Modal` → Create/edit overlays
- `TextField`, `Select`, `Checkbox` → Form inputs
- `ResourcePicker` → Category/unit type selection
- `Banner` → Error/warning messages
- `Toast` → Success confirmations

**Form Pattern**:
```tsx
<Form method="post">
  <FormLayout>
    <TextField
      label="Ingredient Name"
      name="name"
      value={name}
      onChange={setName}
      error={errors.name}
      required
    />
    <Select
      label="Category"
      name="category"
      options={categories}
      value={category}
      onChange={setCategory}
      error={errors.category}
    />
    <Button submit primary>Save</Button>
  </FormLayout>
</Form>
```

**Alternatives Considered**:
- Custom component library → Rejected: Reinventing the wheel, breaks Shopify consistency
- Headless UI → Rejected: Requires custom styling, loses Polaris benefits

## 8. Testing Strategy

### Decision: Jest + Integration Tests for Shopify API
**Rationale**:
- Jest already configured (package.json has jest + ts-jest)
- Unit tests for services (mock GraphQL responses)
- Integration tests for real Shopify API (development store)
- Contract tests for metaobject schemas (validate structure)

**Test Categories**:
1. **Contract Tests**: Validate metaobject definition schemas match expected structure
2. **Unit Tests**: Service methods with mocked GraphQL responses
3. **Integration Tests**: Real API calls to development store (creates test data)

**Mocking Pattern**:
```typescript
// Unit test
jest.mock('../shopify.server', () => ({
  admin: {
    graphql: jest.fn().mockResolvedValue({
      metaobject: { id: 'gid://shopify/Metaobject/123', ... }
    })
  }
}));

// Integration test (uses real API)
const { admin } = await authenticate.admin(request);
const service = new MetaobjectsService(admin.graphql);
const result = await service.createIngredient(testData);
expect(result.id).toBeDefined();
```

**Alternatives Considered**:
- Playwright E2E only → Rejected: Slow, brittle, doesn't test API layer
- No integration tests → Rejected: Misses Shopify API behavior and rate limits
- Separate test environment → Future enhancement (dedicated test store)

## Open Questions Resolved

All critical clarifications resolved in specification phase:
1. ✅ Core ingredient fields defined (9 fields)
2. ✅ Many-to-many bidirectional relationships confirmed
3. ✅ Block deletion behavior specified
4. ✅ Shopify-native metaobjects confirmed
5. ✅ Block metaobject deletion when in use

## References

- [Shopify Metaobjects API](https://shopify.dev/docs/api/admin-graphql/latest/objects/Metaobject)
- [Remix Data Loading](https://remix.run/docs/en/main/route/loader)
- [Shopify Polaris Components](https://polaris.shopify.com/components)
- [GraphQL Rate Limits](https://shopify.dev/docs/api/usage/rate-limits)

## Next Steps

Proceed to Phase 1: Design & Contracts
- Create data-model.md (entity definitions)
- Generate metaobject schema contracts
- Create quickstart.md (test scenarios)
- Update CLAUDE.md with new context