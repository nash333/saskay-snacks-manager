# Research Log: Shopify Embedded Cost & Margin Manager

(Companion to `data-model.md` – references entity and retention structures.)

Date: 2025-09-29
Status: Draft (post-remediation)

## Topic: Metaobjects & Metafields Constraints
Decision: Use metaobjects for Ingredient, PackagingOption, PriceChangeLog; metafields for recipe_lines container & target_margin_percent.
Rationale: Aligns with no external DB constraint; provides structured querying.
Alternatives: Single JSON blob for ingredients (rejected – poor query/filter), external DB (rejected v1 scope).

## Topic: Version Token Strategy
Decision: Use updatedAt timestamp for metaobjects; version integer inside recipe_lines container.
Rationale: Avoid extra round trip; timestamps already updated by Shopify.
Alternatives: Separate revision metafield (added complexity), ETag-like hash (not natively supported).

## Topic: Global Save (Batched Commit)
Decision: Aggregate all staged changes into ≤2 API calls (primary mutation + optional audit writes).
Rationale: Meets performance budget (≤2 round trips) and atomic UX expectation.
Alternatives: Per-entity saves (chattier, slower), implicit autosave (rejected – user trust risk).

## Topic: Conflict Resolution UX
Decision: Present stale banner listing conflicted items; user selects Refresh Conflicts or Override All; no partial silent commit.
Rationale: Transparency + control; aligns with optimistic concurrency best practice.
Alternatives: Automatic merge (risk of hidden overwrites), full hard block (slows workflow).

## Topic: Complimentary Ingredient Handling
Decision: complimentaryFlag gates zero price; transitions enforce rules; delta suppression when becoming complimentary; baseline zero when leaving complimentary.
Rationale: Clear semantics & avoids misleading deltas.
Alternatives: Allow arbitrary zero price w/out flag (ambiguous meaning).

## Topic: Audit Log Retention (FR-018)
Decision: Keep last 200 entries OR ≤12 months (whichever larger); prune on append.
Rationale: Bounded growth without losing recent operational context.
Alternatives: Time-only retention (might prune high-change ingredients prematurely), count-only (may keep very old irrelevant data).

## Topic: Price History Viewing (FR-037)
Decision: Provide paginated endpoint (newest-first) hitting PriceChangeLog metaobjects; page size default 20.
Rationale: Supports investigation & transparency; limited payload size.
Alternatives: Infinite scroll (overhead), embed in ingredient object (bloat).

## Topic: Target Margin Persistence (FR-038)
Decision: Store per product metafield `pricing.target_margin_percent` on user modification.
Rationale: Restores preferred context; avoids re-entry fatigue.
Alternatives: Session-only (lost on revisit), global setting (not product-specific).

## Topic: Performance Instrumentation
Decision: Use performance marks: app-load-start, dashboard-first-render, ingredients-table-render, pricing-panel-render, global-save-click, global-save-complete.
Rationale: Granular visibility for budgets (TTFB, LCP surrogate) and save latency.
Alternatives: Single coarse timing (insufficient diagnostic value).

## Topic: Observability Metrics
Decision: save_conflict_total, save_override_total, audit_prune_total (counters); save_latency_ms (histogram); optional in_memory_pending_changes_count gauge.
Rationale: Tracks reliability & contention hotspots.
Alternatives: Log-only (harder to aggregate thresholds).

## Topic: Rounding & Precision
Decision: Use minor currency units internally; display formatted currency with standard rounding (half away from zero) consistent with Shopify formatting.
Rationale: Avoid floating error; user familiarity.
Alternatives: Banker's rounding (less intuitive for merchants), float operations (precision risk).

## Topic: Packaging Option Edit Cascade
Decision: Immediate cascade (no version snapshot) to all referencing products.
Rationale: Simplicity; consistent pricing.
Alternatives: Versioned packaging (complex; not needed v1).

## Future Research Backlog
- Reactivation flow semantics & audit
- Multi-currency expansion impacts rounding & metaobject storage
- Cost anomaly detection heuristics
