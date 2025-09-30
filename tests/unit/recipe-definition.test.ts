import { recipeDefinition } from '../../scripts/setup-metaobjects';

describe('recipeDefinition shape', () => {
  test('recipeDefinition has ingredients list.metaobject_reference field', () => {
    expect(recipeDefinition).toBeDefined();
    expect(Array.isArray(recipeDefinition.fieldDefinitions)).toBe(true);
    const ingredientsField = recipeDefinition.fieldDefinitions.find((f: any) => f.key === 'ingredients');
    expect(ingredientsField).toBeDefined();
    // ingredientsField is now known to be defined
    expect((ingredientsField as any).type).toBe('list.metaobject_reference');
  });
});
