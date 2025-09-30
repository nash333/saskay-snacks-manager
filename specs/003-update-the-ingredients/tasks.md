# Tasks: Ingredients Management System

**Feature**: 003-update-the-ingredients
**Branch**: `003-update-the-ingredients`
**Input**: Design documents from `/specs/003-update-the-ingredients/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Technical Stack Summary
- **Language**: TypeScript 5.2+ / Node.js 18.20+
- **Framework**: Remix 2.16, Shopify Polaris 12.0, Shopify App Bridge 4.1
- **Database**: Prisma 6.2, SQLite (dev) / PostgreSQL (prod)
- **API**: Shopify Metaobjects API via @shopify/shopify-app-remix 3.7
- **Testing**: Jest 29.7 with ts-jest, React Testing Library

## Path Structure (Remix Full-Stack)
```
app/
├── routes/              # Remix routes (loader/action functions)
├── components/          # React components (Polaris UI)
├── services/            # Business logic & Shopify API calls
└── shopify.server.ts    # Shopify auth/API client

tests/
├── contract/            # JSON schema validation tests
├── integration/         # Full flow tests
└── unit/                # Service & component unit tests
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths relative to repository root

---

## Phase 3.1: Setup & Dependencies

- [ ] **T001** Verify TypeScript 5.2+ configuration in `tsconfig.json` (target: ES2022, lib: DOM, moduleResolution: Bundler)
- [ ] **T002** Verify Jest 29.7 configuration in `jest.config.json` (ts-jest preset, testEnvironment: node)
- [ ] **T003** Create directory structure: `app/services/`, `app/components/ingredients/`, `tests/contract/`, `tests/integration/`, `tests/unit/services/`, `tests/unit/components/`

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (JSON Schema Validation)
- [ ] **T004** [P] Contract test for ingredient metaobject schema in `tests/contract/ingredient-metaobject.test.ts` - validate against `specs/003-update-the-ingredients/contracts/ingredient-metaobject.schema.json`
- [ ] **T005** [P] Contract test for category metaobject schema in `tests/contract/category-metaobject.test.ts` - validate against `specs/003-update-the-ingredients/contracts/category-metaobject.schema.json`
- [ ] **T006** [P] Contract test for unit type metaobject schema in `tests/contract/unit-type-metaobject.test.ts` - validate against `specs/003-update-the-ingredients/contracts/unit-type-metaobject.schema.json`
- [ ] **T007** [P] Contract test for recipe metaobject schema in `tests/contract/recipe-metaobject.test.ts` - validate against `specs/003-update-the-ingredients/contracts/recipe-metaobject.schema.json`

### Integration Tests (Full Flow Scenarios from quickstart.md)
- [ ] **T008** [P] Integration test: Metaobject setup flow in `tests/integration/metaobject-setup.test.ts` - test creating ingredient/category/unit_type/recipe definitions via Shopify GraphQL API (mock API calls)
- [ ] **T009** [P] Integration test: Category CRUD with uniqueness validation in `tests/integration/category-crud.test.ts` - test create, read, update, delete operations; verify unique name constraint
- [ ] **T010** [P] Integration test: Unit type CRUD in `tests/integration/unit-type-crud.test.ts` - test CRUD operations; verify type_category enum (weight/volume/each)
- [ ] **T011** [P] Integration test: Ingredient CRUD with all validations in `tests/integration/ingredient-crud.test.ts` - test full lifecycle with all 9 fields; verify category/unit_type references
- [ ] **T012** [P] Integration test: Search and filtering in `tests/integration/ingredient-search.test.ts` - test name search, category filter, cost range filter, sorting
- [ ] **T013** [P] Integration test: Recipe-ingredient relationships in `tests/integration/recipe-integration.test.ts` - test creating recipe with ingredients; verify bidirectional relationship sync
- [ ] **T014** [P] Integration test: Referential integrity - ingredient deletion blocking in `tests/integration/deletion-integrity-ingredient.test.ts` - **CRITICAL**: verify deletion blocked when ingredient used in recipes; verify error message lists affected recipes
- [ ] **T015** [P] Integration test: Referential integrity - category/unit type deletion blocking in `tests/integration/deletion-integrity-metaobjects.test.ts` - **CRITICAL**: verify deletion blocked when category/unit_type in use; verify error lists affected ingredients
- [ ] **T016** [P] Integration test: Soft delete and restoration in `tests/integration/soft-delete.test.ts` - test is_active flag; verify deleted_at timestamp; test filtering active vs deleted
- [ ] **T017** [P] Integration test: Pagination with >20 ingredients in `tests/integration/pagination.test.ts` - test cursor-based pagination; verify 250 item limit per page

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Service Layer - Shopify Metaobjects API Integration
- [ ] **T018** [P] MetaobjectsService in `app/services/metaobjects.ts` - implement CRUD operations for all metaobject types (ingredient, category, unit_type, recipe) using Shopify Admin GraphQL API; methods: `createIngredient()`, `updateIngredient()`, `deleteIngredient()`, `getIngredient()`, `listIngredients()`, `createCategory()`, `updateCategory()`, `deleteCategory()`, `listCategories()`, `createUnitType()`, `updateUnitType()`, `deleteUnitType()`, `listUnitTypes()`, `createRecipe()`, `updateRecipe()`, `deleteRecipe()`, `listRecipes()`, `ensureMetaobjectDefinitionExists()`
- [ ] **T019** [P] IngredientValidationService in `app/services/ingredient-validation.ts` - implement uniqueness checks (name must be unique), reference validation (category/unit_type must exist and be active), business rule validation (cost_per_unit ≥ 0, quantity_on_hand ≥ 0, SKU format alphanumeric+hyphens); methods: `validateCreate()`, `validateUpdate()`, `validateUniqueName()`, `validateReferences()`, `validateBusinessRules()`
- [ ] **T020** [P] CategoryService in `app/services/category-service.ts` - implement category CRUD with deletion dependency checks; methods: `create()`, `update()`, `delete()`, `list()`, `checkDeletionDependencies()` (query ingredients using this category, block if count > 0)
- [ ] **T021** [P] UnitTypeService in `app/services/unit-type-service.ts` - implement unit type CRUD with deletion dependency checks; methods: `create()`, `update()`, `delete()`, `list()`, `checkDeletionDependencies()` (query ingredients using this unit type, block if count > 0)

**Dependency Checkpoint**: T018-T021 must complete before T022-T023

- [ ] **T022** RecipeService in `app/services/recipe-service.ts` - implement recipe CRUD with bidirectional relationship management; methods: `create()` (add recipe to ingredient's used_in_recipes list), `update()`, `delete()`, `list()`, `syncIngredientRelationships()` (update ingredient.used_in_recipes when recipe changes); **depends on T018 (MetaobjectsService)**
- [ ] **T023** IngredientSearchService in `app/services/ingredient-search.ts` - implement search, filtering, sorting, pagination; methods: `search(criteria: IngredientSearchCriteria)` (name query, category filter, supplier filter, cost range, allergens, sorting), `getCategories()`, `getSuppliers()`, `getAllergens()`, `getUnitTypes()`; use Shopify GraphQL query with filters; **depends on T018 (MetaobjectsService)**

### UI Components - Shopify Polaris
- [ ] **T024** [P] IngredientForm component in `app/components/ingredients/IngredientForm.tsx` - create/edit form with all 9 fields (name, category select, unit_type select, quantity_on_hand number, cost_per_unit currency, SKU text, supplier_name text, description textarea, notes textarea); use Polaris `Form`, `TextField`, `Select`, `Button`; client-side validation; modes: create/edit; props: `initialData?`, `categories`, `suppliers`, `unitTypes`, `availableAllergens`, `onSubmit`, `onCancel`, `isLoading`, `mode`
- [ ] **T025** [P] IngredientList component in `app/components/ingredients/IngredientList.tsx` - table/card view with selection; use Polaris `DataTable` or `ResourceList`; columns: name, category, unit_type, quantity_on_hand, cost_per_unit, SKU, actions (edit/delete); props: `result: IngredientSearchResult`, `onEdit`, `onDelete`, `onExport`, `onPageChange`, `currentPage`, `viewMode`, `onViewModeChange`, `isLoading`
- [ ] **T026** [P] IngredientSearch component in `app/components/ingredients/IngredientSearch.tsx` - filters, search bar, sorting controls; use Polaris `Filters`, `TextField`, `Select`, `Button`; filters: category, supplier, allergens, cost range, is_active; props: `onSearch`, `categories`, `suppliers`, `allergens`, `unitTypes`, `isLoading`, `initialCriteria`
- [ ] **T027** [P] RecipeIngredientPicker component in `app/components/ingredients/RecipeIngredientPicker.tsx` - multi-select ingredient picker with quantity inputs; use Polaris `ResourcePicker`, `TextField` for quantities; props: `selectedIngredients`, `onIngredientAdd`, `onIngredientRemove`, `onQuantityChange`, `availableIngredients`

### Route Implementation - Remix Loaders & Actions
- [ ] **T028** Enhance `app/routes/app.ingredients.tsx` - update loader function to parse search params (query, category, supplier, allergens, costMin, costMax, isActive, sortBy, sortOrder, page, limit), call IngredientSearchService, return results + filter options; update action function to handle create/update/delete/export operations; integrate IngredientForm, IngredientList, IngredientSearch components; handle error states, loading states, toast notifications; **depends on T018, T019, T023, T024, T025, T026**
- [ ] **T029** Create `app/routes/app.recipes.tsx` - NEW route for recipe management; loader: fetch recipes with ingredient details; action: handle recipe create/update/delete; UI: recipe list with RecipeIngredientPicker for editing; use Polaris Page, Card, Modal components; **depends on T018, T022, T027**
- [ ] **T030** Enhance `app/routes/app.config.tsx` - add sections for category CRUD, unit type CRUD, recipe CRUD (if not already present); loader: fetch categories, unit_types, recipes; action: handle create/update/delete for each metaobject type; verify deletion dependency checks work (show error messages); **depends on T020, T021, T022**

---

## Phase 3.4: Integration & Error Handling

- [ ] **T031** Error handling and toast notifications - ensure all routes show user-friendly error messages for: validation failures, Shopify API errors (rate limits, timeouts), referential integrity violations (deletion blocking); use Polaris `Toast`, `Banner` components; standardize error response format across all actions
- [ ] **T032** Shopify API rate limit handling - implement retry logic with exponential backoff in MetaobjectsService; handle 429 responses; add request queuing if burst limit exceeded (50 req/s); log rate limit warnings
- [ ] **T033** Optimistic UI updates - implement optimistic updates in IngredientList for delete operations (immediately remove from UI, restore on error); use Remix `useNavigation` and `useActionData` hooks for loading states

---

## Phase 3.5: Unit Tests & Polish

### Unit Tests
- [ ] **T034** [P] Unit tests for MetaobjectsService in `tests/unit/services/metaobjects.test.ts` - test all CRUD methods with mocked GraphQL responses; test error handling (404, 500, rate limits); test query construction
- [ ] **T035** [P] Unit tests for IngredientValidationService in `tests/unit/services/ingredient-validation.test.ts` - test uniqueness validation, reference validation, business rules validation (negative numbers, invalid SKU format, missing required fields)
- [ ] **T036** [P] Unit tests for RecipeService in `tests/unit/services/recipe-service.test.ts` - test bidirectional relationship sync; test syncIngredientRelationships() with multiple ingredients; test edge cases (empty ingredient list, duplicate ingredients)
- [ ] **T037** [P] Unit tests for IngredientSearchService in `tests/unit/services/ingredient-search.test.ts` - test query construction with various filter combinations; test sorting; test pagination cursor handling
- [ ] **T038** [P] Component tests for IngredientForm in `tests/unit/components/IngredientForm.test.tsx` - test form validation, field interactions, submit/cancel handlers; test create vs edit modes; use React Testing Library
- [ ] **T039** [P] Component tests for IngredientList in `tests/unit/components/IngredientList.test.tsx` - test rendering with data; test edit/delete actions; test pagination controls; test view mode switching (table/cards)
- [ ] **T040** [P] Component tests for IngredientSearch in `tests/unit/components/IngredientSearch.test.tsx` - test filter changes trigger onSearch; test search input debouncing (if implemented); test filter clearing

### Performance & Validation
- [ ] **T041** Performance validation - verify API response times <200ms (measure loader execution time); verify page load <3s (Lighthouse test); verify real-time search filtering performance with 500+ ingredients; add performance logging
- [ ] **T042** Manual validation using quickstart.md - execute all 10 test scenarios from `specs/003-update-the-ingredients/quickstart.md` in development store; verify all acceptance criteria pass; document any deviations or bugs found
- [ ] **T043** TypeScript type safety audit - ensure no `any` types in service layer; verify all Shopify GraphQL responses typed correctly; verify component props fully typed; run `tsc --noEmit` and fix all errors
- [ ] **T044** Accessibility validation - verify all forms keyboard navigable; verify Polaris components meet WCAG 2.1 AA; test with screen reader (NVDA/JAWS); verify focus management in modals

### Documentation & Cleanup
- [ ] **T045** Update CLAUDE.md - verify all new technologies, commands, and recent changes are documented; ensure under 150 lines for token efficiency
- [ ] **T046** Code cleanup - remove console.log statements; remove commented code; ensure consistent formatting (run Prettier); remove unused imports; verify all TODOs resolved
- [ ] **T047** Test coverage report - run `npm run test:coverage` (if configured); verify >80% coverage for services; verify >70% coverage for components; identify uncovered edge cases and add tests if critical

---

## Dependencies Graph

```
Setup (T001-T003)
    ↓
Contract Tests (T004-T007) [P]
    ↓
Integration Tests (T008-T017) [P]
    ↓
    ├─> MetaobjectsService (T018) [P]
    ├─> IngredientValidationService (T019) [P]
    ├─> CategoryService (T020) [P]
    └─> UnitTypeService (T021) [P]
           ↓
           ├─> RecipeService (T022) ──┐
           ├─> IngredientSearchService (T023) ──┤
           ├─> IngredientForm (T024) [P] ──┤
           ├─> IngredientList (T025) [P] ──┤
           ├─> IngredientSearch (T026) [P] ──┤
           └─> RecipeIngredientPicker (T027) [P] ──┤
                  ↓
                  ├─> app.ingredients.tsx (T028)
                  ├─> app.recipes.tsx (T029)
                  └─> app.config.tsx (T030)
                         ↓
                         ├─> Error Handling (T031-T033)
                         ↓
                         ├─> Unit Tests (T034-T040) [P]
                         ↓
                         └─> Polish (T041-T047) [P]
```

**Critical Path**: T001 → T004-T007 → T008-T017 → T018 → T022, T023 → T028 → T042 (quickstart validation)

---

## Parallel Execution Examples

### Wave 1: Contract Tests (After Setup)
```bash
# All contract tests can run in parallel (different files, no dependencies)
Task: "Contract test for ingredient metaobject schema in tests/contract/ingredient-metaobject.test.ts"
Task: "Contract test for category metaobject schema in tests/contract/category-metaobject.test.ts"
Task: "Contract test for unit type metaobject schema in tests/contract/unit-type-metaobject.test.ts"
Task: "Contract test for recipe metaobject schema in tests/contract/recipe-metaobject.test.ts"
```

### Wave 2: Integration Tests (After Contract Tests Pass)
```bash
# All integration tests can run in parallel (different test files)
Task: "Integration test: Metaobject setup flow in tests/integration/metaobject-setup.test.ts"
Task: "Integration test: Category CRUD in tests/integration/category-crud.test.ts"
Task: "Integration test: Unit type CRUD in tests/integration/unit-type-crud.test.ts"
Task: "Integration test: Ingredient CRUD in tests/integration/ingredient-crud.test.ts"
Task: "Integration test: Search and filtering in tests/integration/ingredient-search.test.ts"
Task: "Integration test: Recipe-ingredient relationships in tests/integration/recipe-integration.test.ts"
Task: "Integration test: Ingredient deletion blocking in tests/integration/deletion-integrity-ingredient.test.ts"
Task: "Integration test: Category/unit type deletion blocking in tests/integration/deletion-integrity-metaobjects.test.ts"
Task: "Integration test: Soft delete in tests/integration/soft-delete.test.ts"
Task: "Integration test: Pagination in tests/integration/pagination.test.ts"
```

### Wave 3: Service Layer (After Integration Tests Fail as Expected)
```bash
# Base services can run in parallel (different files, no dependencies)
Task: "MetaobjectsService in app/services/metaobjects.ts"
Task: "IngredientValidationService in app/services/ingredient-validation.ts"
Task: "CategoryService in app/services/category-service.ts"
Task: "UnitTypeService in app/services/unit-type-service.ts"
```

### Wave 4: Dependent Services & Components
```bash
# After T018-T021 complete, these can run in parallel
Task: "RecipeService in app/services/recipe-service.ts"
Task: "IngredientSearchService in app/services/ingredient-search.ts"
Task: "IngredientForm component in app/components/ingredients/IngredientForm.tsx"
Task: "IngredientList component in app/components/ingredients/IngredientList.tsx"
Task: "IngredientSearch component in app/components/ingredients/IngredientSearch.tsx"
Task: "RecipeIngredientPicker component in app/components/ingredients/RecipeIngredientPicker.tsx"
```

### Wave 5: Unit Tests (After Implementation Complete)
```bash
# All unit tests can run in parallel (different files)
Task: "Unit tests for MetaobjectsService in tests/unit/services/metaobjects.test.ts"
Task: "Unit tests for IngredientValidationService in tests/unit/services/ingredient-validation.test.ts"
Task: "Unit tests for RecipeService in tests/unit/services/recipe-service.test.ts"
Task: "Unit tests for IngredientSearchService in tests/unit/services/ingredient-search.test.ts"
Task: "Component tests for IngredientForm in tests/unit/components/IngredientForm.test.tsx"
Task: "Component tests for IngredientList in tests/unit/components/IngredientList.test.tsx"
Task: "Component tests for IngredientSearch in tests/unit/components/IngredientSearch.test.tsx"
```

### Wave 6: Polish Tasks
```bash
# Final polish tasks can run in parallel
Task: "Performance validation"
Task: "TypeScript type safety audit"
Task: "Accessibility validation"
Task: "Code cleanup"
Task: "Test coverage report"
```

---

## Task Execution Notes

### TDD Workflow
1. **Phase 3.2 MUST complete first** - All tests must be written and failing
2. **Verify test failures** - Run `npm test` and confirm all integration tests fail appropriately
3. **Implement one service at a time** - Complete T018 (MetaobjectsService) before moving to dependent services
4. **Verify tests pass incrementally** - After each implementation task, run corresponding tests and verify they pass
5. **Do not skip tests** - Integration tests cover critical referential integrity requirements (T014, T015)

### Critical Tasks (High Risk)
- **T014**: Ingredient deletion blocking - ensures data integrity, MUST work correctly
- **T015**: Category/unit type deletion blocking - prevents orphaned ingredients
- **T018**: MetaobjectsService - foundation for all other services, must handle Shopify API correctly
- **T028**: app.ingredients.tsx - main user-facing route, integrates all services and components
- **T042**: Manual validation - final acceptance before considering feature complete

### Shopify-Specific Considerations
- **Rate Limits**: T032 handles 50 req/s burst, 40 req/s sustained limits
- **GID Format**: All metaobject references use `gid://shopify/Metaobject/{id}` format
- **Pagination**: Shopify returns max 250 metaobjects per query (use cursor-based pagination)
- **GraphQL Complexity**: Monitor query complexity cost (point-based throttling)

### Testing Strategy
- **Contract Tests (T004-T007)**: Validate JSON schemas match implementation expectations
- **Integration Tests (T008-T017)**: Test full flows with mocked Shopify API
- **Unit Tests (T034-T040)**: Test services and components in isolation
- **Manual Tests (T042)**: Execute quickstart.md scenarios in real development store

---

## Validation Checklist

- [x] All contracts (4) have corresponding tests (T004-T007)
- [x] All entities (4: Ingredient, Category, UnitType, Recipe) have service tasks
- [x] All tests (T004-T017) come before implementation (T018-T030)
- [x] Parallel tasks marked [P] are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] Critical referential integrity tests included (T014, T015)
- [x] TDD workflow enforced (Phase 3.2 before Phase 3.3)
- [x] Dependencies graph reflects actual blocking relationships

---

## Estimated Effort

- **Setup**: 1-2 hours (T001-T003)
- **Contract Tests**: 2-3 hours (T004-T007)
- **Integration Tests**: 8-10 hours (T008-T017)
- **Service Layer**: 12-15 hours (T018-T023)
- **UI Components**: 10-12 hours (T024-T027)
- **Route Implementation**: 6-8 hours (T028-T030)
- **Integration & Error Handling**: 4-5 hours (T031-T033)
- **Unit Tests**: 8-10 hours (T034-T040)
- **Polish & Validation**: 6-8 hours (T041-T047)

**Total Estimated Effort**: 57-73 hours (7-9 days for single developer)

---

**Next Command**: Begin with T001 to set up project structure, then proceed sequentially through Phase 3.2 (Tests First).