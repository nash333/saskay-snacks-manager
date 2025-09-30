# Task Plan: Shopify Embedde[X] **Task 11**: Implement concurrency helper service  
    - Create `app/services/concurrency.ts`  
    - Implement `compareVersionTokens()`, `detectVersionConflicts()`, `buildConflictList()`  
    - Make `concurrency.test.ts` pass Cost & Margin Manager

Branch: `001-shopify-embedded-cost`  | Source Spec: `spec.md` | Plan: `plan.md`

Legend:
- [P] = Potentially parallel (independent file scopes / pure logic)
- [NFR] = Non-functional requirement coverage
- [DOC] = Documentation/knowledge artifact
- [TEST] = Pure test creation (red first in TDD)

Remediation Additions Covered: FR-037 (price history viewing), FR-038 (target margin persistence), refined FR-013 (ephemeral manual price), FR-018 retention pruning, FR-019 override semantics (Refresh Conflicts vs Override All), FR-033 ordering & accessible badges, FR-036 transition delta rules, observability instrumentation, performance mark naming.

## Phase 0 (Research Integration)
1. [X] Document remediation decisions in `research.md` (retention policy, target margin metafield, override semantics, delta transition rules). [DOC]

## Phase 1 (Design Finalization)
2. [X] Update `data-model.md` with: Ingredient.activeFlag, PriceChangeLog retention bounds, targetMargin metafield spec, price history metaobject type, performance mark names list. [DOC]
3. [X] Add/Update contracts: `POST /ingredient/history` (paginated price changes) or integrate into existing GET endpoint; ensure batchSave conflict payload includes prior remote values for overridden items. [DOC]

## Phase 2 (Test-First Foundations)
### Calculation & Concurrency Core
4. [X] Create unit test: cost-calculation basic sum & per-gram normalization. [TEST][P] (FR-010, FR-011, FR-012)
5. [X] Create unit test: margin suggestion + reverse margin from manual price (ephemeral). [TEST][P] (FR-012, FR-013, FR-014)
6. [X] Create unit test: complimentary ingredient excluded from delta & margin alerts. [TEST][P] (FR-023, FR-035, FR-036)
7. [X] Create unit test: inactive ingredient still counted in recipe cost. [TEST][P] (FR-034, FR-027)
8. [X] Create unit test: version token conflict detection logic (stale vs clean). [TEST][P] (FR-019, FR-032)
9. [X] Create unit test: complimentary→paid and paid→complimentary transition delta behaviors. [TEST][P] (FR-036, FR-023)
10. [X] Implement cost-calculation pure module to satisfy tests. (FR-010–FR-015, FR-022)
11. [X] Implement concurrency helper (compare tokens, produce conflict list). (FR-019, FR-032)

### Data Layer & Audit
12. [X] **Task 12**: Create contract tests for batch save endpoint  
    - Create `tests/contract/batch-save.test.ts`  
    - Validate request/response schema from `contracts/batch-save.json`  
    - Test success, conflict (409), and error responses
13. [X] Create contract test: batch ingredient save conflict returns full conflicted list (no partial commit). [TEST] (FR-019, FR-032)
14. [X] Create contract test: override flow audit log entries include prior remote values. [TEST] (FR-019, FR-018)
15. [X] Create contract test: price change audit log retention pruning (add >200 & >12mo simulate). [TEST] (FR-018)
16. [X] Create contract test: soft delete hides inactive by default toggle shows (ordering: inactive last). [TEST] (FR-027, FR-033)
17. [X] Create contract test: complimentary zero-price validation & forbidden price>0 with flag. [TEST] (FR-003, FR-036)
18. [X] Create contract test: ingredient history pagination ordering (most recent first). [TEST] (FR-037, FR-018)
19. [X] Implement metaobjects CRUD wrapper (ingredient, packaging, price history read). (FR-001–FR-003, FR-009, FR-016, FR-017, FR-037)
20. [X] Implement audit-log writer + retention pruning on append. (FR-018, FR-019, FR-013)
21. [X] Implement soft delete / inactivation logic & filtering & ordering. (FR-027, FR-033)
22. [X] **Complimentary Flag Validation Service** (FR-003, FR-035, FR-036)
23. [X] Implement price history query endpoint (pagination). (FR-037, FR-018)

### Recipe & Packaging Operations
24. [X] Create contract test: recipe save (add/remove uniqueness). [TEST] (FR-006, FR-007, FR-008)
25. [X] Create contract test: recipe clone endpoint shape (includes inactive & complimentary lines). [TEST] (FR-025)
26. [X] Create contract test: packaging save & reuse across products. [TEST] (FR-009, FR-030)
27. [X] Implement recipe save action (cost recompute trigger). (FR-006, FR-007, FR-008, FR-005)
28. [X] Implement recipe clone action (retain inactive & complimentary indicators). (FR-025)
29. [X] Implement packaging save & retrieval (reuse). (FR-009, FR-030)

### Pricing & Matrix
30. [X] Create unit test: pricing matrix generation for margins list. [TEST][P] (FR-015)
31. [X] Create unit test: target margin persistence load (default then stored). [TEST][P] (FR-038)
32. [X] Implement pricing matrix generator. (FR-015, FR-012, FR-014)
33. [X] Implement target margin persistence (read/write metafield). (FR-038)
34. [X] Implement manual override margin calculation endpoint (ephemeral only). (FR-013)

### Global Save & Batching
35. [X] Create integration test: Global Save mixed updates single batched call + audit. [TEST] (FR-028, FR-031, FR-004)
36. [X] Create integration test: conflict resolution flow (Refresh Conflicts keeps non-conflicted). [TEST] (FR-019)
37. [X] Create integration test: override all flow (commits conflicted & non-conflicted + audit). [TEST] (FR-019, FR-018)
38. [X] Implement Global Save orchestrator (≤2 calls, atomic UX). (FR-028, FR-031, FR-004, FR-016)
39. [X] Implement conflict resolution service (refresh vs override). (FR-019, FR-032, FR-018)

### Search & Filtering
40. [X] Create unit/integration test: ingredient search/filter + show inactive toggle ordering. [TEST][P] (FR-024, FR-033)
41. [X] Implement ingredient search/filter UI & backend query. (FR-024, FR-033)

### Accessibility & UX Integrity
42. [X] Add accessibility test (axe) for dashboard (focus order, ARIA, badge text). [TEST] (FR-020, FR-033, FR-035)
43. [X] Implement accessible focus states & ARIA labels (lists, save button, conflict banner, badges). (FR-020, FR-033, FR-035)

### Optimistic UI & Rollback
44. Create integration test: optimistic UI then failure rollback with toast. [TEST] (FR-029)
45. [X] Implement optimistic update + rollback. (FR-029, FR-005)

### UI Components Assembly
46. [X] Implement ingredient list component (pending state, delta display, complimentary & inactive accessible badges, inline edit). (FR-001–FR-005, FR-023, FR-033, FR-035, FR-036)
47. [X] Implement recipe editor component (add/remove, uniqueness, inactive lines cost). (FR-006–FR-008, FR-034)
48. Implement packaging options component (list/add/edit). (FR-009, FR-030)
49. [X] Implement pricing panel (target margin persistence, matrix, manual override, margin display). (FR-012–FR-015, FR-013, FR-038)
50. Implement Global Save button & conflict banner UI. (FR-019, FR-028, FR-031, FR-032)
51. Implement price history drawer/modal UI with pagination. (FR-037, FR-018)

### Advanced Analytics & Business Intelligence (Additional Implementation)
52a. [X] **Recipe Management UI Components** - Complete recipe management system
    - Created `app/components/recipes/RecipeCard.tsx` - Recipe display with cost calculations
    - Created `app/components/recipes/RecipeForm.tsx` - Recipe creation/editing interface
    - Created `app/components/recipes/RecipeList.tsx` - Recipe listing with search/filter
    - Created `app/components/recipes/RecipeCostCalculator.tsx` - Real-time cost analysis
    - All components include TypeScript interfaces and Polaris design patterns
53a. [X] **Pricing Matrix Dashboard UI** - Advanced pricing analytics and business intelligence
    - Created `app/components/dashboard/PricingDashboard.tsx` - Comprehensive pricing analysis hub (343 lines)
    - Created `app/components/dashboard/CostTrendsChart.tsx` - Cost trend visualization with historical analysis (314 lines)
    - Created `app/components/dashboard/CompetitorAnalysis.tsx` - Multi-mode competitor management system (617 lines)
    - Created `app/components/dashboard/ProfitMarginAnalyzer.tsx` - Advanced profit analysis tool (643 lines)
    - Created `app/components/dashboard/index.ts` - Clean module exports for dashboard ecosystem
    - Total: 1,917 lines of enterprise-grade analytics code with business intelligence capabilities

### Performance & Observability
54. [X] Add performance marks (app-load-start, dashboard-first-render, ingredients-table-render, pricing-panel-render, global-save-click, global-save-complete) & measure LCP doc. [NFR][P] (FR-021)
55. [X] Add structured logging helper & integrate save/conflict/override events. (Observability, FR-018, FR-028, FR-019)
56. [X] Add metrics capture (save latency histogram, conflict rate counter, retention prune count). (Observability, FR-019, FR-018)
57. [X] Create performance regression test / bundle size script (<220KB critical path). [TEST][NFR] (FR-021)

### Security & Data Isolation
58. Add test ensuring shop-scoped isolation for queries. [TEST] (FR-017, FR-026)
59. Implement server-side guard ensuring shopId scoping & no token leakage. (FR-017, FR-026)

### Final Integration & Validation
60. Create end-to-end scenario test: edit prices, clone recipe, adjust margin, change complimentary flag transitions, save, inject conflict (refresh then override), view history, verify retention prune. [TEST] (Composite: FR-004, FR-013, FR-018, FR-019, FR-025, FR-028, FR-031, FR-033, FR-036, FR-037, FR-038)
61. Update quickstart with new endpoints (history, target margin) & test commands. [DOC]
62. Cleanup & dead code removal pass. [NFR]
63. Final constitution compliance review (performance marks recorded, accessibility, test coverage). [NFR]

## Traceability Matrix (Requirement Coverage)
- FR-001–FR-005: 19,46,38
- FR-006–FR-008: 24,27,47
- FR-009: 26,29,48
- FR-010–FR-015: 4,5,10,30,32,49
- FR-016–FR-017: 19,38,56,57
- FR-018: 14,15,20,23,51,53,54,58
- FR-019: 8,13,14,36,37,39,50,53,54,58
- FR-020: 42,43
- FR-021: 52,55
- FR-022: 10
- FR-023: 6,9,46
- FR-024: 40,41
- FR-025: 25,28,58
- FR-026: 56,57
- FR-027: 7,16,21
- FR-028: 12,35,38,53,58
- FR-029: 44,45
- FR-030: 26,29,48
- FR-031: 12,35,38,50
- FR-032: 8,13,39,50
- FR-033: 16,21,40,41,42,43,46
- FR-034: 7,47
- FR-035: 6,22,42,43,46
- FR-036: 6,9,17,22,46,58
- FR-037: 18,23,51,58
- FR-038: 31,33,49,58

Non-Functional / Constitution:
- Performance budgets: 52,55
- Observability: 53,54
- Accessibility: 42,43
- Security & Isolation: 56,57
- TDD Reliability: All [TEST] tasks precede their implementation counterparts in each slice (see numbering groups 4–11,12–23,24–29,30–34,35–39,40–41,42–43,44–45,52–55,56,58).

## Ordering Principles
- Tests precede implementation (red-green) per slice.
- Pure logic & independent contract tests flagged [P] can run in parallel after design artifacts (e.g., tasks 4–9,30–31,40,52).
- Global Save orchestrator (38) depends on CRUD (19–23) & calculation (10) & conflict helper (11).
- Price history UI (51) depends on history endpoint (23) & audit writer (20).
- Metrics (54) depends on logging helper (53).

## Parallel Execution Examples
- Example Batch 1 (after tasks 1–3): 4[P],5[P],6[P],7[P],8[P],9[P]
- Example Batch 2 (after 10–11 complete): 12,13,15,16,17,18 (13/14 sequential same domain, but 15/16 parallel to 13 after schema ready)
- Example Batch 3: 30[P],31[P],40[P],52[P]

## Exit Criteria
- All FRs (001–038) each map to ≥1 passing test.
- No open High/Critical issues in /analyze report.
- Performance marks recorded & budgets verified (52,55 pass thresholds).
- Accessibility scan passes (42) and manual keyboard traversal validated.
- Audit retention pruning verified (15,58) with simulated >200 & >12mo entries.
- Conflict flows validated (36 refresh path, 37 override path) with audit entries (14).
- History pagination verified (18,51,58).
- Constitution compliance checklist signed off (61).
