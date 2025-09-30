Title: feat(metaobjects): finalize metaobject setup tests and validation handling

Description:
This PR merges the feature branch `feat/metaobjects-tests-fix-create-ingredient` into `main`.

Summary of changes:
- Add sanitization and validation injection when creating metaobject definitions in `scripts/setup-metaobjects.ts`.
- Use `metaobject_definition_id` for `metaobject_reference` and `list.metaobject_reference` fields. Reserve `metaobject_definition_ids` for `mixed_reference` types.
- Export and test `recipeDefinition` fields to ensure `ingredients` exists and is `list.metaobject_reference`.
- Add integration test `tests/integration/metaobject-variables.test.ts` to assert outgoing GraphQL variables include the proper validation keys (prevents regressions).
- Add dev-only route `app/routes/_dev/setup-metaobjects.tsx` to run the setup against a live store during development.

Why:
Shopify Admin GraphQL is strict about the shape of `MetaobjectFieldDefinitionCreateInput` and the validations options. These changes make the setup script safe to run against a live store and add tests to prevent regressions.

How to test locally:
1. Run unit and integration tests: `npm test` or the project's test script.
2. Run the setup route in development and visit `/app/_dev/setup-metaobjects` while authenticated (dev only).

Notes / next steps:
- Consider adding CI coverage for the new integration test file so these regressions are caught earlier.
- Review `scripts/setup-metaobjects.ts` for any shop-specific validation edge cases before running in production stores.

Signed-off-by: nash333
