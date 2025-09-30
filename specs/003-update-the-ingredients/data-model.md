# Data Model: Ingredients Management System

**Feature**: 003-update-the-ingredients
**Date**: 2025-09-30
**Status**: Phase 1 Complete

## Overview

This document defines the data entities for the Ingredients Management System. All entities are stored as Shopify Metaobjects using the Admin GraphQL API.

## Entity Relationship Diagram

```
┌─────────────────────┐
│  Ingredient         │
│  Category           │──┐
└─────────────────────┘  │
                         │ 1
                         │
                         │ N
┌─────────────────────┐  │
│  Ingredient         │◄─┘
│                     │
│  - name             │
│  - category      ───┼──> Category
│  - unit_type    ────┼──> Unit Type
│  - quantity_on_hand │
│  - cost_per_unit    │
│  - sku              │
│  - supplier_name    │
│  - description      │
│  - notes            │
│  - is_active        │
│  - deleted_at       │
└─────────────────────┘
         ▲  N
         │
         │  M
         │
         ▼  N
┌─────────────────────┐
│  Recipe             │
│                     │
│  - name             │
│  - description      │
│  - ingredients   ───┼──> Ingredient (list with quantities)
│  - is_active        │
└─────────────────────┘
         │
         │ 1
         │
         ▼ N
┌─────────────────────┐
│  Recipe Ingredient  │
│  (embedded)         │
│                     │
│  - ingredient_ref   │
│  - quantity_needed  │
│  - unit             │
└─────────────────────┘

┌─────────────────────┐
│  Unit Type          │
│                     │
│  - name             │
│  - abbreviation     │
│  - type_category    │
└─────────────────────┘
```

## Core Entities

### 1. Ingredient

**Metaobject Type**: `ingredient`

**Description**: Represents a raw material or component used in products. Core entity of the system.

**Fields**:

| Field Name        | Type              | Required | Validation                          | Description |
|-------------------|-------------------|----------|-------------------------------------|-------------|
| name              | single_line_text  | Yes      | Unique, 1-255 chars                | Ingredient display name (e.g., "All-Purpose Flour") |
| category          | metaobject_reference | Yes   | Must reference existing category    | Link to Ingredient Category |
| unit_type         | metaobject_reference | Yes   | Must reference existing unit type   | Measurement unit (weight/volume/each) |
| quantity_on_hand  | number_decimal    | No       | ≥ 0                                | Current inventory quantity |
| cost_per_unit     | number_decimal    | Yes      | ≥ 0                                | Cost per unit (in shop currency) |
| sku               | single_line_text  | No       | Alphanumeric + hyphens, max 50 chars | Stock keeping unit identifier |
| supplier_name     | single_line_text  | No       | Max 255 chars                       | Supplier/vendor name |
| description       | multi_line_text   | No       | Max 1000 chars                      | Detailed ingredient description |
| notes             | multi_line_text   | No       | Max 2000 chars                      | Internal notes/comments |
| is_active         | boolean           | Yes      | Default: true                       | Soft delete flag |
| deleted_at        | single_line_text  | No       | ISO 8601 timestamp                  | Deletion timestamp (null if active) |
| version_token     | single_line_text  | No       | Auto-generated timestamp            | Optimistic locking version |
| used_in_recipes   | list.metaobject_reference | No | References recipe metaobjects | Bidirectional relationship to recipes |

**Unique Constraints**:
- `name` must be unique across all ingredients (enforced at application layer)

**State Transitions**:
```
[New] → [Active] → [Deleted (soft)]
                 ↓
              [Updated]
```

**Deletion Rules**:
- If `used_in_recipes` list is not empty → BLOCK deletion
- Otherwise → Set `is_active = false`, `deleted_at = current timestamp`
- Hard delete only allowed for orphaned ingredients (admin function)

### 2. Ingredient Category

**Metaobject Type**: `ingredient_category`

**Description**: Classification grouping for ingredients (e.g., "Grains", "Dairy", "Adhesives")

**Fields**:

| Field Name    | Type              | Required | Validation               | Description |
|---------------|-------------------|----------|--------------------------|-------------|
| name          | single_line_text  | Yes      | Unique, 1-100 chars     | Category display name |
| description   | multi_line_text   | No       | Max 500 chars           | Category description |
| display_order | number_integer    | No       | Default: 0              | Sort order for UI display |
| is_active     | boolean           | Yes      | Default: true           | Soft delete flag |

**Unique Constraints**:
- `name` must be unique (enforced at application layer)

**Deletion Rules**:
- Query all ingredients with `category` reference to this category
- If count > 0 → BLOCK deletion, return list of affected ingredients
- Otherwise → Set `is_active = false`

### 3. Unit Type

**Metaobject Type**: `ingredient_unit_type`

**Description**: Measurement unit for ingredient quantities (e.g., "grams", "liters", "pieces")

**Fields**:

| Field Name    | Type              | Required | Validation               | Description |
|---------------|-------------------|----------|--------------------------|-------------|
| name          | single_line_text  | Yes      | Unique, 1-50 chars      | Unit display name (e.g., "grams") |
| abbreviation  | single_line_text  | No       | Max 10 chars            | Short form (e.g., "g") |
| type_category | single_line_text  | Yes      | Enum: weight/volume/each | Unit classification |
| is_active     | boolean           | Yes      | Default: true           | Soft delete flag |

**Unique Constraints**:
- `name` must be unique (enforced at application layer)

**Type Category Values**:
- `weight`: Mass-based units (grams, kilograms, pounds, ounces)
- `volume`: Volume-based units (milliliters, liters, cups, gallons)
- `each`: Count-based units (pieces, sheets, items, dozen)

**Deletion Rules**:
- Query all ingredients with `unit_type` reference to this unit type
- If count > 0 → BLOCK deletion, return list of affected ingredients
- Otherwise → Set `is_active = false`

### 4. Recipe

**Metaobject Type**: `recipe`

**Description**: Formula or bill of materials that combines multiple ingredients. Flat structure (no nested recipes).

**Fields**:

| Field Name    | Type              | Required | Validation               | Description |
|---------------|-------------------|----------|--------------------------|-------------|
| name          | single_line_text  | Yes      | Unique, 1-255 chars     | Recipe display name |
| description   | multi_line_text   | No       | Max 2000 chars          | Recipe description/instructions |
| ingredients   | list.metaobject_reference | Yes | Min 1 ingredient    | List of ingredient references |
| ingredient_quantities | json | Yes | JSON array with quantities | Quantity per ingredient (see structure below) |
| is_active     | boolean           | Yes      | Default: true           | Soft delete flag |
| created_at    | single_line_text  | Yes      | ISO 8601 timestamp      | Creation timestamp |
| updated_at    | single_line_text  | Yes      | ISO 8601 timestamp      | Last update timestamp |

**ingredient_quantities JSON Structure**:
```json
[
  {
    "ingredient_gid": "gid://shopify/Metaobject/12345",
    "quantity_needed": 500,
    "unit_type_gid": "gid://shopify/Metaobject/67890"
  },
  {
    "ingredient_gid": "gid://shopify/Metaobject/54321",
    "quantity_needed": 2,
    "unit_type_gid": "gid://shopify/Metaobject/09876"
  }
]
```

**Unique Constraints**:
- `name` must be unique (enforced at application layer)

**Deletion Rules**:
- Check if recipe is linked to products (future feature consideration)
- If linked → BLOCK deletion
- Otherwise → Set `is_active = false`
- On delete, DO NOT delete ingredients (ingredients can exist independently)

## Relationships

### Ingredient ↔ Category (Many-to-One)
- Each ingredient has exactly one category
- Each category can have multiple ingredients
- Enforced via `metaobject_reference` field type

### Ingredient ↔ Unit Type (Many-to-One)
- Each ingredient has exactly one unit type
- Each unit type can be used by multiple ingredients
- Enforced via `metaobject_reference` field type

### Ingredient ↔ Recipe (Many-to-Many, Bidirectional)
- Each ingredient can be used in multiple recipes
- Each recipe contains multiple ingredients
- Recipe stores list of ingredient references + quantities in `ingredients` + `ingredient_quantities`
- Ingredient stores list of recipe references in `used_in_recipes`
- **Bidirectional sync required**: When recipe is created/updated, update ingredient's `used_in_recipes` list

## Data Validation Rules

### Application-Layer Validation

1. **Uniqueness Validation**:
   - Before create: Query metaobjects by name to check existence
   - Return error if duplicate found

2. **Reference Validation**:
   - Before create/update: Verify referenced entities exist
   - Query category/unit type/ingredient metaobject by GID
   - Return error if reference not found or inactive

3. **Business Rule Validation**:
   - `cost_per_unit` ≥ 0
   - `quantity_on_hand` ≥ 0 (if provided)
   - SKU format: alphanumeric characters and hyphens only
   - Category/unit type must be active (`is_active = true`)

4. **Deletion Validation**:
   - Query dependent entities before delete
   - Block if dependencies exist
   - Return detailed error with list of affected entities

### Schema-Level Validation (Shopify)

- Field types enforced by metaobject definition
- Required fields enforced at creation
- Character limits enforced by field type

## Indexing Strategy

### Shopify Metaobject Queries
- Primary index: `id` (GID) - automatic
- Secondary index: `type` - automatic
- Full-text search: `query` parameter supports name, description fields
- Filtering: `query` parameter supports field-level filters (e.g., `category:grains`)

### Query Patterns
```graphql
# Search by name
query: "name:flour"

# Filter by category
query: "category:gid://shopify/Metaobject/123"

# Active ingredients only
query: "is_active:true"

# Combined filters
query: "is_active:true AND category:gid://shopify/Metaobject/123"

# Cost range
query: "cost_per_unit:>=5 AND cost_per_unit:<=20"
```

## Migration Strategy

### Initial Setup
1. Create metaobject definitions (ingredient, category, unit_type, recipe)
2. Seed default categories (via configuration page)
3. Seed default unit types (via configuration page)
4. Import existing ingredients (if any) from previous system

### Data Import Format (CSV)
```csv
name,category,unit_type,cost_per_unit,sku,supplier_name,description
"All-Purpose Flour","Grains","grams",0.005,"FLR-001","ABC Suppliers","Standard baking flour"
"Butter (Unsalted)","Dairy","grams",0.015,"BTR-001","XYZ Dairy","Premium unsalted butter"
```

## Performance Considerations

- **Pagination**: Use cursor-based pagination for > 250 ingredients
- **Caching**: Cache category/unit type lists (low churn, frequently accessed)
- **Batch Operations**: Use GraphQL mutations batching for bulk operations
- **Rate Limiting**: Implement retry logic for Shopify API rate limits

## Next Steps

- Create JSON schema contracts for each metaobject type
- Generate TypeScript types from schemas
- Create integration tests for CRUD operations
- Implement metaobject service layer