import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { createMetaobjectDefinition } from '../../scripts/setup-metaobjects';

describe('Metaobject outgoing variables', () => {
  let calls: any[];
  let mockGraphQL: any;

  beforeEach(() => {
    calls = [];

    // Use a plain async function (not jest.fn) so the implementation under test
    // does not detect a Jest mock and will attempt to resolve reference.metaobjectType
    mockGraphQL = async (query: string, opts?: any) => {
      calls.push({ query, opts });

      // First call: lookup metaobjectDefinitionByType => return a fake definition GID
      if (calls.length === 1) {
        return { data: { metaobjectDefinitionByType: null } };
      }

      // For the reference resolution lookup (if invoked), respond with a found def
      if (query && query.includes('getMetaobjectDefinition')) {
        return { data: { metaobjectDefinitionByType: { id: 'gid://shopify/MetaobjectDefinition/ingredient', type: 'ingredient' } } };
      }

      // The create mutation; respond with a success payload
      return {
        data: {
          metaobjectDefinitionCreate: {
            metaobjectDefinition: {
              id: 'gid://shopify/MetaobjectDefinition/recipe',
              type: 'recipe',
              fieldDefinitions: [
                { key: 'name', type: { name: 'single_line_text' } },
                { key: 'ingredients', type: { name: 'list.metaobject_reference' } }
              ]
            },
            userErrors: []
          }
        }
      };
    };
  });

  test('sends metaobject_definition_id for list.metaobject_reference', async () => {
    // Prepare a recipe definition that includes a list reference to 'ingredient'
    const def = {
      type: 'recipe',
      name: 'Recipe',
      fieldDefinitions: [
        { key: 'name', type: 'single_line_text' },
        { key: 'ingredients', type: 'list.metaobject_reference', reference: { metaobjectType: 'ingredient' } }
      ]
    };

    // Temporarily unset JEST_WORKER_ID so the implementation performs the
    // reference lookup and injects validations.
    const oldJest = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID;
    try {
      const result = await createMetaobjectDefinition(mockGraphQL as any, def as any);
      expect(result).toBeDefined();

      // Find the create mutation call by locating the call that included variables.definition
      const createCall = calls.find(c => c.opts && c.opts.variables && c.opts.variables.definition) || calls.find(c => c.variables && c.variables.definition);
      expect(createCall).toBeDefined();
    const variables = createCall.opts && createCall.opts.variables ? createCall.opts.variables : (createCall.variables || null);
    expect(variables).not.toBeNull();
    const sentDefinition = variables.definition;
    expect(sentDefinition).toBeDefined();
    const ingredientsField = (sentDefinition.fieldDefinitions || []).find((f: any) => f.key === 'ingredients');
    expect(ingredientsField).toBeDefined();

    // validations should exist and include metaobject_definition_id (string) for list.metaobject_reference
  const v = ingredientsField.validations || [];
    const names = v.map((x: any) => x.name);
    expect(names).toContain('metaobject_definition_id');
    // value should be present (either a gid string or JSON array depending on implementation)
    const val = v.find((x: any) => x.name === 'metaobject_definition_id');
    expect(val).toBeDefined();
    expect(val.value).toBeTruthy();
    } finally {
      if (oldJest !== undefined) process.env.JEST_WORKER_ID = oldJest;
      else delete process.env.JEST_WORKER_ID;
    }
  });
});
