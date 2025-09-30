# Data Model: Shopify Embedded Cost & Margin Manager

Status: Draft (includes remediation updates 2025-09-29)

## Entities

### Ingredient (Metaobject: ingredient)
Fields:
- id (string, metaobject id)
- shopId (string)
- name (string, <=80 chars)
- unit (enum: g|kg)
- currentPrice (decimal(12,4))  // currency minor units normalized to base
- previousPrice (decimal(12,4) nullable)
- complimentaryFlag (boolean)
- activeFlag (boolean, default true)
- updatedAt (timestamp)
- updatedBy (string staff identifier)
- versionToken (derived: updatedAt ISO or revision int metafield)

Constraints:
- currentPrice >= 0
- currentPrice == 0 ⇒ complimentaryFlag MUST be true
- complimentaryFlag true ⇒ currentPrice == 0 (enforced during transitions)

### PackagingOption (Metaobject: packaging_option)
Fields: id, shopId, type (string), sizeGramsCapacity (int), packageCost (decimal), labelCost (decimal), activeFlag (boolean), updatedAt, updatedBy, versionToken.

### Product (Shopify product reference)
Metafields used:
- recipe_lines (namespace: recipe, key: lines) JSON structure (see RecipeLinesContainer)
- target_margin_percent (namespace: pricing, key: target_margin_percent) int (0-95), persisted (FR-038)

### RecipeLinesContainer (Metafield JSON)
Shape:
```
{
  version: number,             // bump on mutation (for concurrency)
  lines: [
    { id: string, ingredientId: string, quantityGrams: number }
  ]
}
```
Constraints:
- (productId, ingredientId) uniqueness inside lines
- quantityGrams > 0 and reasonable upper bound (e.g., < 10_000_000)

### PriceChangeLog (Metaobject: ingredient_price_change)
Fields:
- id
- ingredientId
- oldPrice
- newPrice
- changedAt
- userId
- reason (enum: price_update|override_conflict)

Retention Policy (FR-018):
- Keep last 200 entries OR entries ≤ 12 months old (whichever larger)
- Prune oldest beyond policy on append (opportunistic)

### ComputedPrice (Ephemeral)
Not persisted. Derived for UI.
- productId
- packagingOptionId
- batchCost
- unitCost
- targetMarginPercent
- suggestedPrice
- marginAtSuggestedPrice

### PriceHistoryPage (Ephemeral API Response) (FR-037)
```
{
  ingredientId: string,
  page: number,
  pageSize: number,
  total: number,
  entries: [
    { id, oldPrice, newPrice, changedAt, userId, reason }
  ]
}
```

### Version Token Strategy (FR-019, FR-032)
- Use updatedAt timestamps for metaobjects (optimistic concurrency) and version integer in recipe_lines container.
- Save requests include client-known token; mismatch triggers conflict list.

## Relationships
- Product references Ingredient via recipe_lines.lines[].ingredientId.
- PackagingOption reused across Products (no direct foreign key – query by shopId).
- PriceChangeLog rows reference Ingredient by ingredientId.

## Derived Behaviors
- Soft Delete: activeFlag=false hides ingredient unless show inactive toggle; cost calculations still include inactive lines until removed.
- Complimentary Transition: Paid→Complimentary suppress delta display; Complimentary→Paid baseline delta is 0 (large positive increase) (FR-036).

## Indexing / Query Considerations
- Ingredient list queries filter shopId + activeFlag (+ name contains for search).
- Price history paginates newest-first using changedAt DESC with a cursor or offset.

## Validation Summary
| Rule | Enforced In |
|------|-------------|
| complimentaryFlag && currentPrice>0 forbidden | service validation |
| Duplicate ingredient in product lines | recipe save action |
| Retention policy pruning | audit append helper |
| Target margin bounds (0-95) | pricing panel write |

## Open Future Extensions (Non-v1)
- Reactivation workflow (currently unsupported v1)
- Multi-currency cost support
- Role-based granular permissions
