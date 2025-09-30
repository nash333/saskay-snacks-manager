# Feature Specification: Shopify Embedded Cost & Margin Manager

**Feature Branch**: `001-shopify-embedded-cost`  
**Created**: 2025-09-29  
**Status**: Draft  
**Input**: User description: "Shopify embedded cost & margin manager: track ingredient prices, editable recipes, packaging, margin calculation, intuitive UX with Remix + Polaris"

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
Use this condensed section to orient non-technical stakeholders. Full authoritative list lives in Functional Requirements.
 - Manual Selling Price override is ephemeral in v1 (FR-013)
 - Audit trail with bounded retention (FR-018)
 - Optimistic concurrency with explicit conflict choices (FR-019)
 - Global Save single action for all staged edits (FR-028/FR-031)
 - Soft delete / inactive handling (FR-027, FR-033, FR-034)
 - Complimentary ingredient semantics & transitions (FR-035, FR-036)
 - Price history visibility (FR-037)
 - Target margin persistence per product (FR-038)
 - Accessibility & performance budgets (FR-020, FR-021)
- **FR-001**: System MUST allow authenticated Shopify merchant staff to view a list of ingredients with current and previous price values.
- **FR-002**: System MUST allow adding a new ingredient with name, unit, current price, and optional previous price for delta tracking.
- **FR-003**: System MUST validate ingredient fields (name non-empty, price > 0 unless complimentaryFlag=true, unit from supported list, price >= 0 always).
- **FR-004**: System MUST allow editing ingredient prices inline; changes remain in a pending (unsaved) state until the user presses a single explicit Save button that batches all modified ingredients.
- **FR-005**: System MUST recalculate dependent recipe and margin values immediately after an ingredient price change.
- **FR-006**: System MUST support creating, viewing, and editing product recipes as a list of ingredient + quantity pairs (grams or configured base unit).
- **FR-007**: System MUST prevent duplicate ingredient rows within a single recipe (enforce uniqueness by ingredientId per product).
- **FR-008**: System MUST support removing an ingredient line from a recipe and updating costs.
- **FR-009**: System MUST allow adding packaging options (type, size/weight capacity, packaging cost, label cost) used in margin calculation.
- **FR-010**: System MUST compute per-product base batch cost from recipe using ingredient cost per gram/kg.
- **FR-011**: System MUST compute packaging-inclusive unit cost for a selected package size.
- **FR-012**: System MUST compute suggested selling price given a target margin %: sellingPrice = totalCost / (1 - margin/100).
- **FR-013**: System MUST show margin percentage achieved if a manual selling price is entered (reverse calculation); manual override input is ephemeral (not persisted) and resets on reload in v1.
- **FR-014**: System MUST allow adjusting target margin value (slider or input) and recalculate all suggested prices.
- **FR-015**: System MUST display a pricing matrix for multiple common margins (e.g., 40%, 45%, 50%, 55%, 60%).
- **FR-016**: System MUST persist ingredient, recipe, and packaging data using Shopify Metaobjects & Metafields scoped per merchant shop (no separate external DB in v1).
- **FR-017**: System MUST scope all data by shop (multi-tenant isolation) and prevent cross-shop access.
- **FR-018**: System MUST log changes to ingredient prices (old value, new value, timestamp, user) for audit.
- **FR-019**: System MUST implement optimistic concurrency: on Save, compare version tokens for all modified entities; if any mismatch, block automatic commit, present a stale data banner listing conflicted items, and offer actions: (a) Refresh (discard local changes for conflicted items and pull latest) or (b) Override & Save (force commit; audit log MUST record prior remote values). Non-conflicted items MAY still commit if user chooses override.
- **FR-020**: System MUST provide an accessible UI (keyboard navigation, aria labels, color contrast WCAG AA).
- **FR-021**: System MUST load primary dashboard view with current costs within performance budget (per constitution: perceived <1.5s LCP, interactions <100ms where feasible).
- **FR-022**: System MUST expose recalculation logic as pure functions for unit testing.
- **FR-023**: System MUST show delta (percentage change) between old and new ingredient price where both provided (delta display suppressed if complimentaryFlag=true and price=0).
- **FR-024**: System MUST allow filtering or searching ingredients by name.
- **FR-025**: System MUST allow cloning a recipe to bootstrap similar products (duplicate all lines & packaging associations into a new draft product context).
- **FR-026**: System MUST protect webhook-authenticated context and not expose sensitive tokens client-side.
- **FR-027**: System MUST support soft deletion (inactivation) of an ingredient: if referenced in any recipe, mark activeFlag=false; existing recipe lines retain the ingredient and its last price; ingredient cannot be added to new recipes while inactive; no hard delete in v1.
- **FR-028**: System MUST submit all pending ingredient & recipe edits in a single batched Save action (≤1 primary write request; ancillary logging request allowed) to keep API round trips ≤2 per interaction.
- **FR-029**: System MUST provide optimistic UI updates for ingredient and recipe edits (rollback on failure) where data integrity allows.
- **FR-030**: System MUST persist packaging configurations and reuse across products.
- **FR-031**: System MUST provide a global Save button (disabled when no pending changes) that commits all staged ingredient, recipe line, and packaging edits atomically from the user perspective.

*Unclear / awaiting decisions (will block readiness until resolved):*
-- (None remaining) All previous clarification markers resolved; any new ambiguities must be added explicitly.

### Key Entities *(include if feature involves data)*
- **Ingredient**: (Metaobject type: `ingredient`) Unique per shop; attributes: id, shopId, name, unit (kg, g), currentPrice, previousPrice, complimentaryFlag (boolean), updatedAt, updatedBy.
- **Product**: Represents a sellable item; attributes: id, shopId, name, activeFlag, createdAt.
- **RecipeLine**: (Stored as part of a product metafield referencing ingredient metaobject IDs) Association of product to ingredient; attributes: id, productId, ingredientId, quantity (grams); uniqueness constraint (productId, ingredientId).
- **PackagingOption**: (Metaobject type: `packaging_option`) Reusable packaging configuration; attributes: id, shopId, type, size (grams capacity), packageCost, labelCost, activeFlag.
- **PriceChangeLog**: Audit trail; attributes: id, ingredientId, oldPrice, newPrice, changedAt, userId.
- **ComputedPrice (ephemeral)**: Derived object (not persisted) used for UI display: productId, packagingOptionId, batchCost, unitCost, targetMargin%, suggestedPrice, marginAtSuggestedPrice.
- **Version Token (implicit on mutable entities)**: Not a standalone entity; each mutable record (Ingredient, RecipeLine container, PackagingOption) carries a version (incrementing integer or updatedAt timestamp) used for concurrency checks.

## Clarifications
### Session 2025-09-29
- Q: How should ingredient and recipe edits be persisted to balance performance (batching) and user trust (no data loss)? → A: Explicit Save button (batched commit)
- Q: What is the conflict resolution strategy for concurrent edits? → A: Option B (Optimistic concurrency with version tokens). On Save: if any version mismatch, show stale banner summarizing conflicts; user can Refresh (pull latest & discard local for conflicted items) or Override & Save (force commit) with audit entries capturing previous remote values.
- Q: How should ingredient deletion work when ingredient is referenced? → A: Option B (Soft delete / inactivation). Mark ingredient inactive; retain in existing recipes for historical cost integrity; hide inactive by default with toggle; cannot add inactive ingredient to new recipes; no hard delete v1.
- Q: What is the zero-cost ingredient policy? → A: Option D (Complimentary flag). Price may be 0 only if complimentaryFlag=true; deltas suppressed for complimentary zero-priced ingredients; validation blocks negative prices.
- Q: Should manual selling price override be in v1? → A: Yes (override input included; FR-013 confirmed MUST)
- Q: Should recipe cloning be in v1? → A: Yes (promoted to MUST; FR-025 updated)
- Q: Are additional role-based permissions needed beyond Shopify staff? → A: No (rely on Shopify staff access only; no extra role granularity in v1).

### Added Requirements from Clarifications
- **FR-032**: Each mutable entity MUST include a version token (updatedAt timestamp or monotonically incrementing revision). Save requests MUST include the client-known version for conditional validation. Mismatches trigger the stale conflict flow (FR-019).
- **FR-033**: Ingredient list MUST hide inactive ingredients by default and provide a "Show inactive" toggle plus visual badge for inactive rows.
- **FR-034**: Cost and margin calculations MUST continue to include inactive ingredients that remain in a recipe until they are explicitly removed from that recipe.
- **FR-035**: Ingredients with complimentaryFlag=true and price=0 MUST be visually distinguished (badge) and excluded from negative margin alerts.
- **FR-036**: Attempting to mark an ingredient complimentary while price > 0 MUST prompt user to zero the price or cancel (cannot have non-zero price with complimentaryFlag=true).

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs) [Some implied (Shopify embedded) acceptable context]
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (currently pending decisions listed above)
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
