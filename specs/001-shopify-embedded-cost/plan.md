
# Implementation Plan: Shopify Embedded Cost & Margin Manager

**Branch**: `001-shopify-embedded-cost` | **Date**: 2025-09-29 | **Spec**: `spec.md`
**Input**: Feature specification at `specs/001-shopify-embedded-cost/spec.md`

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
Provide an embedded Shopify admin experience that lets merchant staff maintain ingredient pricing, define product recipes, manage packaging options, and view real-time computed unit costs and margin-driven suggested selling prices. Core emphases: Global Save (batched commit) for trust + performance (≤2 round trips), optimistic concurrency with version tokens and explicit user conflict resolution (Refresh Conflicts vs Override All), soft deletion preserving historical cost integrity, complimentary zero-cost ingredient handling, audit log with retention pruning, ingredient price history viewing, and per-product target margin persistence. Architectural approach: Remix + Polaris, Shopify Metaobjects & Metafields (no external DB v1), pure calculation module, structured logging + metrics for observability.

## Technical Context
**Language/Version**: TypeScript (Remix, Node 18+ runtime assumed)  
**Primary Dependencies**: Remix, Shopify App Bridge / Admin API, Polaris React components, Zod (validation), Jest + React Testing Library (tests)  
**Storage**: Shopify Metaobjects (ingredient, packaging_option) + Product metafields (recipe lines, packaging associations, complimentaryFlag etc.) + Metafields or Metaobjects for PriceChangeLog (if feasible; else embed audit entries in a single metaobject list)  
**Testing**: Jest (unit + calculation), Playwright or Remix testing utilities for integration, contract tests with mocked Shopify GraphQL/Admin REST using recorded fixtures  
**Target Platform**: Shopify embedded admin (browser) + Remix server (Node)  
**Project Type**: Web application (frontend + backend within Remix conventions)  
**Performance Goals**: p95 TTFB <300ms, LCP <1.5s initial view, interactions <100ms perceived, ≤2 API round trips per primary save, initial critical JS ≤220KB compressed  
**Constraints**: No external DB v1; use batching to stay under Shopify API rate limits; optimistic concurrency tokens derived from updatedAt or revision integer; accessibility WCAG AA  
**Scale/Scope**: Single merchant use initially; design to scale to dozens of concurrent staff sessions without lock contention; 38 functional requirements (FR-001–FR-038); expected ingredient count <500, recipes <500.

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Budget | Planned Compliance | Risk & Mitigation |
|--------------------|--------------------|-------------------|
| UX First | Polaris components only; consistent spacing/ARIA patterns; state preserved across tabs | Need design tokens audit early; add accessibility test checklist |
| Performance Budgets | Batch save (≤2 calls); lazy load secondary panels; code-split large editor chunks | Risk: Polaris bundle bloat → run bundle analyzer, tree-shake icons |
| Security & Data Minimalism | Only ingredient/recipe/packaging metaobjects; no extraneous PII; HMAC validation on webhooks | Ensure no logging of price deltas with merchant identifiable PII |
| TDD Reliability | Write failing calc + concurrency tests before logic; contract tests for Shopify interactions | Contract drift if Shopify API changes → periodic schema fetch |
| Observability | Structured logs (action, merchantId, latency); metrics on save latency & conflict rate | Add sampling to avoid log noise on rapid edits |
| Budgets (TTFB, LCP, bundle) | Parallel loaders; skeleton/optimistic UI; calculation pure functions | Monitor LCP via performance marks in dev & Lighthouse CI |

Initial Verdict: PASS (no violations). No complexity deviation table entries required.

### Remediation Additions Incorporated
- Global Save terminology standardized (replaces generic "save")
- Manual selling price override is ephemeral (not persisted)
- Audit log retention: keep last 200 entries OR ≤12 months (whichever larger) with pruning on append
- Price history viewing (FR-037) with pagination (most recent first)
- Target margin persistence per product (FR-038) via metafield
- Conflict resolution semantics explicit (Refresh Conflicts vs Override All) no partial silent commit
- Complimentary transition delta rules defined (FR-036)
- Inactive ordering and accessible badges (FR-033, FR-035)
- Performance mark naming schema added

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
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->
```
app/
 ├── routes/
 │    ├── app._index.tsx          # Dashboard / ingredients overview
 │    ├── app.additional.tsx      # (existing route placeholder)
 │    ├── app.tsx                 # Root app frame
 │    └── pricing.* (future)      # Pricing matrix & override UI (to add)
 ├── components/
 │    ├── ingredients/
 │    ├── recipes/
 │    ├── packaging/
 │    └── pricing/
 ├── services/
 │    ├── concurrency.server.ts   # Version token compare helpers
 │    ├── cost-calculation.ts     # Pure functions (unit tested)
 │    ├── metaobjects.server.ts   # CRUD wrappers & batching
 │    ├── audit-log.server.ts     # Price change + override logging
 │    └── transform.ts            # DTO <-> metaobject field mapping
 ├── validation/
 │    └── schemas.ts              # Zod schemas for inputs
 ├── lib/
 │    ├── shopify.server.ts       # Existing Shopify auth/context
 │    └── logging.ts              # Structured logging helpers
tests/
 ├── unit/
 │    ├── cost-calculation.test.ts
 │    └── concurrency.test.ts
 ├── integration/
 │    ├── save-batch-conflict.test.ts
 │    └── recipe-clone.test.ts
 └── contract/
   ├── metaobjects-ingest.test.ts
   └── pricing-endpoints.test.ts
```

**Structure Decision**: Use existing Remix `app/` monolith; add subfolders for components, services, validation, lib. Avoid splitting backend/frontend since Remix unifies. Dedicated tests hierarchy mirrors service layers + integration.

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

Planned Research Topics:
1. Shopify Metaobjects constraints: field limits, batch mutation patterns, rate limits for writes.
2. Version token strategy: choose between updatedAt vs custom revision metafield (consistency vs precision).
3. Conflict UX patterns in Polaris: best component for stale banner & actionable choices.
4. Performance: measuring LCP in Remix embedded context (App Bridge frame considerations).
5. Batching strategy: explore single GraphQL mutation for multiple metaobject updates vs sequential with concurrency.
6. Calculation precision: rounding strategy (banker's vs standard) and display formatting (currency minor units).
7. Complimentary ingredient analytics impact: exclude from negative margin alerts logic.

Research Method: Use Shopify dev MCP docs for metaobject & metafield API specifics; Polaris docs for banner/inline error pattern; gather alternatives & pick final decisions recorded in `research.md`.

### Performance Instrumentation Plan
Define web performance marks for consistent measurement (dev & potential CI Lighthouse):
- app-load-start (script inline as early as possible)
- dashboard-first-render (after main layout + ingredient list skeleton mounts)
- ingredients-table-render (after data rows populated)
- pricing-panel-render (after pricing matrix first paint)
- global-save-click (user interaction start)
- global-save-complete (after all writes + UI state reconciled)
Measure LCP using PerformanceObserver in dev; record value in structured log once per session.

### Observability Metrics
- counter: save_conflict_total (labels: shopId)
- counter: save_override_total
- counter: audit_prune_total (labels: shopId)
- histogram: save_latency_ms (p50/p95 tracked)
- gauge (optional dev): in_memory_pending_changes_count
Structured log fields: timestamp, level, event, shopId, durationMs, entityCounts, conflictCount, override=true/false.

### Retention & History
Retention pruning executed opportunistically on new price change append; if post-append length >200 and oldest >12 months, prune oldest beyond policy. History endpoint paginates newest-first.

### Target Margin Persistence
Metafield (namespace: pricing, key: target_margin_percent) per product. On first load: if absent use default (e.g., 50) and do not write until user changes value.

**Output**: research.md with all topics decisions: Decision, Rationale, Alternatives.

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Data Model** (`data-model.md`): Define Ingredient, PackagingOption, RecipeLine container structure (metafield JSON shape), PriceChangeLog approach (list metaobject vs separate type), Version token method, complimentaryFlag semantics, soft delete transitions.

2. **API Contracts**: Describe internal Remix actions + GraphQL interactions. Contracts for:
   - POST /ingredients/batchSave (batched create/update + concurrency check)
   - POST /recipes/save
   - POST /packaging/save
   - POST /recipe/clone
   - POST /price/override (manual selling price margin calculation if persisted later)
   - GET /pricing/matrix?productId=...
   Include request/response JSON schemas (Zod) & error codes (409 conflict, 422 validation, 400 malformed, 500 transient). Store schemas in `contracts/`.

3. **Contract Tests**: For each endpoint create failing contract tests asserting shape + concurrency conflict path (expect 409 with conflict details). Use fixtures for metaobject responses.

4. **Integration Scenarios**: Map acceptance scenarios (5) + edge cases (conflict, soft delete, complimentary) into tests. Quickstart highlights creating ingredient, editing price, cloning recipe, saving batch with conflicting version.

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
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
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 28-34 numbered, ordered tasks in tasks.md (tests-first, concurrency & calc early).

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
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*
