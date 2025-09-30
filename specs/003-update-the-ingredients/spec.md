# Feature Specification: Ingredients Management System

**Feature Branch**: `003-update-the-ingredients`
**Created**: 2025-09-30
**Status**: Draft
**Input**: User description: "update the ingredients page. ensure all crud operations function, add metaobjects for ingerdient catergories and ingredient unit type and reciepes. these metafields will be created in the configuration page"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature focuses on ingredients page enhancement with CRUD operations and metaobject management
2. Extract key concepts from description
   → Actors: Merchants (administrators)
   → Actions: Create, Read, Update, Delete ingredients; Configure metaobjects
   → Data: Ingredients, ingredient categories, unit types, recipes, metaobjects
   → Constraints: Metaobjects created via configuration page; integration with Shopify
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: What is the current state of the ingredients page?]
   → [NEEDS CLARIFICATION: What data fields does an ingredient have?]
   → [NEEDS CLARIFICATION: How do recipes relate to ingredients - fixed recipe list or dynamic?]
   → [NEEDS CLARIFICATION: Are metaobjects Shopify-native or custom data structures?]
   → [NEEDS CLARIFICATION: What validation rules apply to ingredients?]
4. Fill User Scenarios & Testing section
   → Primary flow: Configure metaobjects → Manage ingredients via CRUD → Link to recipes
5. Generate Functional Requirements
   → Each requirement testable and specific
6. Identify Key Entities
   → Ingredient, Ingredient Category, Unit Type, Recipe, Metaobject Configuration
7. Run Review Checklist
   → WARN "Spec has uncertainties requiring clarification"
8. Return: SUCCESS (spec ready for clarification phase)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-09-30
- Q: What core fields does an Ingredient entity require beyond name, category, and unit type? → A: Name, category, unit type, quantity on hand, cost per unit, SKU, supplier name, description, notes
- Q: How should the system handle ingredient-recipe relationships? → A: Many-to-many bidirectional (recipes specify ingredients with quantities; ingredients show which recipes use them)
- Q: What deletion behavior should the system use for ingredients linked to recipes? → A: Block deletion entirely (show error message listing affected recipes, prevent delete)
- Q: Are metaobjects (categories, unit types, recipes) Shopify-native metaobjects or custom data structures? → A: Shopify-native metaobjects (using Shopify's Metaobject API)
- Q: Should metaobjects (categories/unit types) in use by ingredients be deletable? → A: Block deletion entirely (prevent delete, show error listing affected ingredients)

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A merchant managing MM Stationery Shoppers needs to maintain a comprehensive inventory of ingredients used in their products. They need to configure ingredient categories (e.g., Paper, Adhesives, Plastics) and unit types (e.g., grams, milliliters, pieces) through a configuration page, then create, view, update, and delete individual ingredients with proper categorization. Ingredients should be linkable to recipes [NEEDS CLARIFICATION: are recipes for manufactured products or something else?], enabling proper tracking of component materials.

### Acceptance Scenarios

**Configuration Management**
1. **Given** a merchant is on the configuration page, **When** they create a new ingredient category (e.g., "Binding Materials"), **Then** the category becomes available for ingredient assignment
2. **Given** a merchant is on the configuration page, **When** they create a new unit type (e.g., "meters"), **Then** the unit type becomes available for ingredient measurement
3. **Given** metaobjects are configured, **When** a merchant navigates to the ingredients page, **Then** the metaobject options are available in dropdown/selection fields

**Ingredient CRUD Operations**
4. **Given** a merchant is on the ingredients page, **When** they click "Add Ingredient", **Then** they can enter ingredient details (name, category, unit type, quantity on hand, cost per unit, SKU, supplier name, description, notes) and save
5. **Given** ingredients exist in the system, **When** a merchant views the ingredients page, **Then** all ingredients are displayed with their name, category, unit type, quantity on hand, cost per unit, and SKU
6. **Given** a merchant views an ingredient, **When** they click "Edit", **Then** they can modify ingredient details and save changes
7. **Given** a merchant views an ingredient not linked to recipes, **When** they click "Delete" and confirm, **Then** the ingredient is permanently removed from the system
8. **Given** an ingredient is linked to recipes, **When** a merchant attempts to delete it, **Then** deletion is blocked and an error message displays listing all affected recipes with navigation links

**Recipe Integration**
9. **Given** recipes are configured, **When** a merchant creates or edits a recipe, **Then** they can specify which ingredients are needed with quantity per ingredient
10. **Given** an ingredient is used in recipes, **When** viewing the ingredient detail page, **Then** all recipes using that ingredient are displayed with links to recipe details

### Edge Cases
- What happens when a merchant tries to delete a category that has ingredients assigned to it?
- What happens when a merchant tries to delete a unit type that is in use?
- How does the system handle duplicate ingredient names?
- What happens if a merchant creates an ingredient without selecting a category or unit type?
- How does the system handle bulk import/export of ingredients?
- What happens when metaobjects are modified after ingredients have been created using them?
- How does the system validate ingredient quantities and measurements?
- What happens when a recipe references an ingredient that no longer exists?

## Requirements *(mandatory)*

### Functional Requirements

**Metaobject Configuration**
- **FR-001**: System MUST provide a configuration page for managing ingredient-related metaobjects
- **FR-002**: System MUST allow merchants to create ingredient categories via the configuration page
- **FR-003**: System MUST allow merchants to create unit types via the configuration page
- **FR-004**: System MUST allow merchants to create recipe metaobjects via the configuration page [NEEDS CLARIFICATION: what defines a recipe - just a name or full structure?]
- **FR-005**: System MUST validate that category names are unique and non-empty
- **FR-006**: System MUST validate that unit type names are unique and non-empty
- **FR-007**: System MUST persist all metaobject configurations using Shopify's Metaobject API
- **FR-008**: System MUST allow editing of existing metaobject entries [NEEDS CLARIFICATION: with what restrictions?]
- **FR-009**: System MUST block deletion of metaobjects (categories, unit types) that are in use by ingredients and display error message listing all affected ingredients

**Ingredient Creation**
- **FR-010**: System MUST provide an "Add Ingredient" function on the ingredients page
- **FR-011**: System MUST require ingredient name as mandatory field
- **FR-012**: System MUST require ingredient category selection from configured categories
- **FR-013**: System MUST require unit type selection from configured unit types
- **FR-014**: System MUST allow merchants to specify quantity on hand (numeric), cost per unit (currency), SKU (alphanumeric), supplier name (text), description (text), and notes (text area)
- **FR-015**: System MUST validate ingredient name uniqueness [NEEDS CLARIFICATION: case-sensitive? within category?]
- **FR-016**: System MUST validate [NEEDS CLARIFICATION: what other validation rules - numeric fields, required fields, format constraints?]
- **FR-017**: System MUST save ingredient data and confirm successful creation
- **FR-018**: System MUST support many-to-many relationships between ingredients and recipes (one ingredient can be used in multiple recipes; one recipe can contain multiple ingredients)

**Ingredient Reading/Viewing**
- **FR-019**: System MUST display all ingredients in a list/table format on the ingredients page
- **FR-020**: System MUST display for each ingredient in list view: name, category, unit type, quantity on hand, cost per unit, SKU (supplier, description, notes available in detail view)
- **FR-021**: System MUST provide filtering capabilities by [NEEDS CLARIFICATION: category? unit type? recipe? search by name?]
- **FR-022**: System MUST provide sorting capabilities by [NEEDS CLARIFICATION: name? category? date added?]
- **FR-023**: System MUST provide pagination when ingredient count exceeds [NEEDS CLARIFICATION: what threshold?]
- **FR-024**: System MUST provide search functionality to find ingredients by [NEEDS CLARIFICATION: name only or other fields?]
- **FR-025**: System MUST display associated recipes in ingredient detail view with navigation links to recipe pages

**Ingredient Updating**
- **FR-026**: System MUST provide an "Edit" function for each ingredient
- **FR-027**: System MUST load existing ingredient data into an editable form
- **FR-028**: System MUST allow merchants to modify all ingredient fields except [NEEDS CLARIFICATION: any immutable fields?]
- **FR-029**: System MUST re-validate data when changes are made using same rules as creation
- **FR-030**: System MUST save updated ingredient data and confirm successful update
- **FR-031**: System MUST [NEEDS CLARIFICATION: maintain version history? audit trail? or just overwrite?]

**Ingredient Deletion**
- **FR-032**: System MUST provide a "Delete" function for each ingredient
- **FR-033**: System MUST require confirmation before deleting an ingredient
- **FR-034**: System MUST check if ingredient is linked to recipes before deletion
- **FR-035**: System MUST block deletion if ingredient is linked to recipes and display error message listing all affected recipes with navigation links
- **FR-036**: System MUST perform hard delete (permanent removal) for ingredients not linked to recipes
- **FR-037**: System MUST confirm successful deletion and remove ingredient from display immediately

**Recipe Integration**
- **FR-038**: System MUST allow recipes to specify ingredient requirements with quantity per ingredient
- **FR-039**: System MUST support many-to-many relationships (one ingredient in multiple recipes; one recipe with multiple ingredients)
- **FR-040**: System MUST display all recipes using an ingredient when viewing ingredient detail page with navigation links
- **FR-041**: System MUST allow merchants to specify quantity needed for each ingredient in a recipe
- **FR-042**: System MUST support flat ingredient lists in recipes (no nested recipe structures)

**Data Integrity**
- **FR-043**: System MUST prevent orphaned ingredients (ingredients without category or unit type)
- **FR-044**: System MUST handle metaobject updates gracefully without breaking existing ingredients
- **FR-045**: System MUST [NEEDS CLARIFICATION: validate data types and ranges for numeric fields?]
- **FR-046**: System MUST [NEEDS CLARIFICATION: support bulk import/export or manual entry only?]

**User Experience**
- **FR-047**: System MUST provide clear error messages for validation failures
- **FR-048**: System MUST provide success confirmations for all CRUD operations
- **FR-049**: System MUST [NEEDS CLARIFICATION: auto-save drafts or require explicit save?]
- **FR-050**: System MUST [NEEDS CLARIFICATION: support keyboard shortcuts or accessibility features?]

### Key Entities *(include if feature involves data)*

- **Ingredient**: Represents a raw material or component used in products. Includes name (text, required, unique), assigned category (reference, required), assigned unit type (reference, required), quantity on hand (numeric), cost per unit (currency), SKU (alphanumeric), supplier name (text), description (text), notes (text area), and relationships to recipes. Must be uniquely identifiable and properly categorized.

- **Ingredient Category**: Represents a classification grouping for ingredients (e.g., Paper, Adhesives, Binding Materials). Created via configuration page as a metaobject. Includes category name and [NEEDS CLARIFICATION: description? display order? icon/color?]. Used to organize and filter ingredients.

- **Unit Type**: Represents the measurement unit for ingredient quantities (e.g., grams, kilograms, milliliters, liters, pieces, sheets). Created via configuration page as a metaobject. Includes unit name, [NEEDS CLARIFICATION: abbreviation? conversion factors? unit system (metric/imperial)?]. Ensures consistent measurement across ingredients.

- **Recipe**: Represents a formula or bill of materials that combines multiple ingredients to create products. Created via configuration page as a metaobject. Includes recipe name and many-to-many relationships to ingredients with quantity specification per ingredient. Flat structure only (no nested recipes).

- **Metaobject Configuration**: Represents Shopify-native metaobject definitions for ingredient-related data structures (categories, unit types, recipes). Managed via Shopify's Metaobject API. Includes metaobject type definitions and field schemas that enable structured data storage within Shopify's system.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [x] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (pending clarifications)

---

## Dependencies & Assumptions

### Dependencies
- Existing ingredients page (current state unknown - requires investigation)
- Configuration page infrastructure (may need creation or enhancement)
- Shopify metaobjects system [NEEDS CLARIFICATION: or custom solution?]
- Shopify admin UI framework and patterns

### Assumptions
- Merchants have permission to manage ingredients and configuration
- System already has basic navigation to ingredients page
- Shopify metaobjects API is available and accessible [NEEDS CLARIFICATION: if using Shopify metaobjects]
- Browser supports required UI interactions for CRUD operations

### Open Questions Requiring Clarification
1. **Current State**: What is the existing state of the ingredients page - does it exist? What functionality is currently present?
2. **Ingredient Data Model**: What fields/attributes does an ingredient have beyond name, category, and unit type (e.g., cost, quantity, supplier, SKU, description)?
3. **Recipe Purpose**: What are recipes used for - manufacturing, bundling, cost calculation, inventory management?
4. **Recipe-Ingredient Relationship**: How do recipes and ingredients relate - one-to-many, many-to-many? Do recipes specify quantities per ingredient?
5. **Metaobject Type**: Are metaobjects Shopify-native metaobjects or a custom data structure within the app?
6. **Deletion Behavior**: Should ingredient deletion be hard delete (permanent) or soft delete (mark inactive)? What happens to linked recipes?
7. **Dependency Constraints**: Can categories/unit types be deleted if in use? How are dependencies managed?
8. **Validation Rules**: What specific validation rules apply to ingredient data (uniqueness, format, ranges)?
9. **Display Fields**: What information should be shown in the ingredient list view versus detail view?
10. **Search & Filter**: What filtering, sorting, and search capabilities are needed for ingredients?
11. **Bulk Operations**: Is bulk import/export of ingredients required?
12. **Audit Trail**: Should the system maintain version history or audit trail for ingredient changes?
13. **Nested Recipes**: Do recipes support nested structures (recipes containing other recipes) or only flat ingredient lists?
14. **Auto-save**: Should forms auto-save drafts or require explicit save actions?
15. **Accessibility**: What accessibility features are required (keyboard navigation, screen reader support)?

---