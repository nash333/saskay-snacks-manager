
# Implementation Plan: Ingredients Management System

**Branch**: `003-update-the-ingredients` | **Date**: 2025-09-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-update-the-ingredients/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
This feature implements a comprehensive Ingredients Management System for MM Stationery Shoppers. Merchants can configure ingredient categories, unit types, and recipes via a configuration page, then perform full CRUD operations on ingredients. The system uses Shopify-native Metaobjects API for structured data storage, implements many-to-many bidirectional relationships between ingredients and recipes, and enforces referential integrity by blocking deletion of metaobjects or ingredients that are in use. Key capabilities include search/filter functionality, soft delete with audit trail, and validation of ingredient data against configured metaobjects.

## Technical Context
**Language/Version**: TypeScript 5.2+ / Node.js 18.20+
**Primary Dependencies**: Remix 2.16, Shopify Polaris 12.0, Shopify App Bridge 4.1, Prisma 6.2, @shopify/shopify-app-remix 3.7
**Storage**: SQLite (development) / PostgreSQL (production) via Prisma ORM + Shopify Metaobjects API for structured ingredient data
**Testing**: Jest 29.7 with ts-jest, React Testing Library (implied by Remix setup)
**Target Platform**: Shopify embedded app (browser-based, Shopify Admin context)
**Project Type**: web (Remix full-stack with GraphQL API integration)
**Performance Goals**: <200ms API response time, <3s page load, real-time search filtering
**Constraints**: Shopify API rate limits (50 requests/second burst, 40/second sustained), metaobject query limits (250 objects per page)
**Scale/Scope**: ~500-1000 ingredients, ~50 categories/unit types, ~200 recipes, single-shop deployment

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: PASS - No project constitution file found (template constitution at .specify/memory/constitution.md is not customized). Proceeding with standard best practices:
- Test-driven development approach
- Service-oriented architecture with separation of concerns
- API contract-first design with validation
- Integration testing for Shopify API interactions
- Observability via structured logging

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
app/
├── routes/
│   ├── app.ingredients.tsx           # Main ingredients page (existing, needs enhancement)
│   ├── app.config.tsx                 # Configuration page for metaobjects (existing)
│   ├── app.api.ingredients.tsx        # Ingredients API routes (existing)
│   └── app.recipes.tsx                # NEW: Recipes management page
├── components/
│   └── ingredients/                   # NEW: Ingredient components
│       ├── IngredientList.tsx
│       ├── IngredientForm.tsx
│       ├── IngredientSearch.tsx
│       └── RecipeIngredientPicker.tsx
├── services/
│   ├── metaobjects.ts                 # NEW: Shopify Metaobjects API service
│   ├── ingredient-validation.ts       # NEW: Validation service
│   └── recipe-service.ts              # NEW: Recipe management service
└── shopify.server.ts                  # Shopify auth/API client (existing)

prisma/
└── schema.prisma                      # Session storage (existing, no changes needed)

tests/
├── unit/
│   ├── services/
│   │   ├── metaobjects.test.ts        # NEW: Metaobject service tests
│   │   ├── ingredient-validation.test.ts  # NEW: Validation tests
│   │   └── recipe-service.test.ts     # NEW: Recipe service tests
│   └── components/
│       └── ingredients/               # NEW: Component tests
├── integration/
│   ├── ingredients-crud.test.ts       # NEW: Full CRUD flow tests
│   ├── recipe-integration.test.ts     # NEW: Recipe-ingredient relationship tests
│   └── metaobjects-api.test.ts        # NEW: Shopify API integration tests
└── contract/
    ├── ingredient-metaobject.schema.json  # NEW: Metaobject contract
    ├── category-metaobject.schema.json    # NEW: Category contract
    ├── unit-type-metaobject.schema.json   # NEW: Unit type contract
    └── recipe-metaobject.schema.json      # NEW: Recipe contract
```

**Structure Decision**: Remix full-stack application structure. Frontend routes in `app/routes/`, reusable Polaris components in `app/components/`, backend services in `app/services/`. Shopify GraphQL API integration via `@shopify/shopify-app-remix` client. Tests organized by type (unit/integration/contract) following existing project patterns.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base structure
- Generate tasks from Phase 1 artifacts:
  - **From contracts/** → Create contract validation tests (4 tests, [P])
  - **From data-model.md** → Create service layer tasks (MetaobjectsService, ValidationService, RecipeService)
  - **From quickstart.md** → Extract integration test scenarios (10 test scenarios)
- Follow TDD workflow: Contract tests → Integration tests → Implementation → Validation

**Task Categories & Counts**:
1. **Contract Tests** (4 tasks, [P]): Validate JSON schemas match Shopify metaobject structure
   - ingredient-metaobject.schema.json validation
   - category-metaobject.schema.json validation
   - unit-type-metaobject.schema.json validation
   - recipe-metaobject.schema.json validation

2. **Service Implementation** (6 tasks):
   - MetaobjectsService (CRUD operations for all metaobject types)
   - IngredientValidationService (uniqueness, reference checks, business rules)
   - RecipeService (recipe-ingredient relationship management)
   - CategoryService (with deletion dependency checks)
   - UnitTypeService (with deletion dependency checks)
   - SearchService (filtering, pagination, sorting)

3. **UI Components** (7 tasks, some [P]):
   - IngredientForm component (create/edit forms with validation)
   - IngredientList component (table/card views with selection)
   - IngredientSearch component (filters, search, sorting controls)
   - RecipeIngredientPicker component (multi-select with quantities)
   - Configuration page enhancements (category/unit type CRUD)
   - Recipes page implementation (NEW route)
   - Error handling & toast notifications

4. **Integration Tests** (10 scenarios from quickstart.md):
   - Metaobject setup flow
   - Category CRUD with uniqueness validation
   - Unit type CRUD with type categories
   - Ingredient CRUD with all validations
   - Search and filtering combinations
   - Recipe creation with ingredients
   - Referential integrity enforcement (deletion blocking) - **CRITICAL**
   - Soft delete and restoration
   - Pagination with > 20 ingredients
   - Error handling scenarios

5. **Route Enhancement** (2 tasks):
   - app.ingredients.tsx loader/action enhancement (search params, error handling)
   - app.recipes.tsx new route creation (full CRUD)

**Ordering Strategy**:
1. **Wave 1 - Foundation** (Parallel [P]):
   - Contract test tasks (can run independently)
   - TypeScript type generation from schemas

2. **Wave 2 - Services** (Sequential with some parallel):
   - MetaobjectsService first (foundation for others)
   - ValidationService + CategoryService + UnitTypeService [P]
   - RecipeService + SearchService [P]

3. **Wave 3 - UI Components** (Parallel where possible):
   - IngredientForm + IngredientList [P]
   - IngredientSearch + RecipeIngredientPicker [P]
   - Configuration page enhancements

4. **Wave 4 - Routes & Integration**:
   - Route implementations
   - Integration tests (validate full flow)

5. **Wave 5 - Validation & Polish**:
   - Run all tests
   - Fix failures
   - Performance validation
   - Execute quickstart.md scenarios manually

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**Dependency Graph**:
```
Contract Tests [P]
    ↓
MetaobjectsService
    ↓
    ├─> ValidationService + CategoryService + UnitTypeService [P]
    ├─> RecipeService + SearchService [P]
    └─> IngredientForm + IngredientList + IngredientSearch [P]
           ↓
        Route Implementations
           ↓
        Integration Tests
           ↓
        Quickstart Validation
```

**Critical Path**: Contract Tests → MetaobjectsService → ValidationService → IngredientForm → Route Enhancement → Integration Tests (especially referential integrity tests)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no project constitution, using best practices)
- [x] Post-Design Constitution Check: PASS (design follows standard patterns)
- [x] All NEEDS CLARIFICATION resolved (5 critical questions answered in clarification phase)
- [x] Complexity deviations documented (none - architecture is straightforward)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
