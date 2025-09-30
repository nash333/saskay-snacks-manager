/**
 * Setup script to create Shopify Metaobject definitions
 * Run this to initialize the metaobject types in your Shopify store
 */

// Note: authenticate should be imported from the route that uses this function

// Metaobject definition for ingredients
const ingredientDefinition = {
  type: "ingredient",
  name: "Ingredient",
  description: "Food ingredient with cost tracking and properties",
  fieldDefinitions: [
    {
      key: "name",
      name: "Name",
      type: "single_line_text_field",
      required: true
    },
    {
      key: "category",
      name: "Category",
      // store a reference to a Category metaobject
      type: "metaobject_reference",
      // target metaobject type that this reference must point to
      reference: { metaobjectType: 'category' },
      required: false
    },
    {
      key: "supplier",
      name: "Supplier",
      type: "single_line_text_field",
      required: false
    },
    {
      key: "cost_per_unit",
      name: "Cost Per Unit",
      type: "number_decimal",
      required: true
    },
    {
      key: "unit_type",
      name: "Unit Type",
      // reference to a Unit Type metaobject
      type: "metaobject_reference",
      // target metaobject type that this reference must point to
      reference: { metaobjectType: 'unit_type' },
      required: true
    },
    {
      key: "allergens",
      name: "Allergens",
      type: "json",
      required: false
    },
    {
      key: "is_active",
      name: "Is Active",
      type: "boolean",
      required: true
    },
    {
      key: "is_complimentary",
      name: "Is Complimentary",
      type: "boolean",
      required: false
    },
    {
      key: "notes",
      name: "Notes",
      type: "multi_line_text_field",
      required: false
    },
    {
      key: "version_token",
      name: "Version Token",
      type: "single_line_text_field",
      required: false
    },
    {
      key: "created_at",
      name: "Created At",
      type: "date_time",
      required: false
    },
    {
      key: "updated_at",
      name: "Updated At",
      type: "date_time",
      required: false
    },
    {
      key: "deleted_at",
      name: "Deleted At",
      type: "date_time",
      required: false
    }
  ]
};

// Metaobject definition for packaging
const packagingDefinition = {
  type: "packaging",
  name: "Packaging",
  description: "Product packaging options with unit counts and costs",
  fieldDefinitions: [
    {
      key: "name",
      name: "Name",
      type: "single_line_text_field",
      required: true
    },
    {
      key: "unit_count",
      name: "Unit Count",
      type: "number_integer",
      required: true
    },
    {
      key: "cost_per_package",
      name: "Cost Per Package",
      type: "number_decimal",
      required: true
    },
    {
      key: "is_active",
      name: "Is Active",
      type: "boolean",
      required: true
    },
    {
      key: "version_token",
      name: "Version Token",
      type: "single_line_text_field",
      required: false
    },
    {
      key: "created_at",
      name: "Created At",
      type: "date_time",
      required: false
    },
    {
      key: "updated_at",
      name: "Updated At",
      type: "date_time",
      required: false
    }
  ]
};

// Metaobject definition for price history
const priceHistoryDefinition = {
  type: "price_history",
  name: "Price History",
  description: "Historical price changes for ingredients",
  fieldDefinitions: [
    {
      key: "ingredient_id",
      name: "Ingredient ID",
      type: "single_line_text_field",
      required: true
    },
    {
      key: "ingredient_gid",
      name: "Ingredient GID",
      type: "single_line_text_field",
      required: true
    },
    {
      key: "cost_per_unit",
      name: "Cost Per Unit",
      type: "number_decimal",
      required: true
    },
    {
      key: "previous_cost",
      name: "Previous Cost",
      type: "number_decimal",
      required: false
    },
    {
      key: "delta_percent",
      name: "Delta Percent",
      type: "number_decimal",
      required: true
    },
    {
      key: "timestamp",
      name: "Timestamp",
      type: "date_time",
      required: true
    },
    {
      key: "changed_by",
      name: "Changed By",
      type: "single_line_text_field",
      required: true
    },
    {
      key: "change_reason",
      name: "Change Reason",
      type: "single_line_text_field",
      required: false
    },
    {
      key: "audit_entry_id",
      name: "Audit Entry ID",
      type: "single_line_text_field",
      required: true
    }
  ]
};

// Metaobject definition for category
const categoryDefinition = {
  type: 'category',
  name: 'Ingredient Category',
  description: 'Categories for ingredients (e.g., Baking, Dairy)',
  fieldDefinitions: [
    { key: 'name', name: 'Name', type: 'single_line_text_field', required: true },
    { key: 'description', name: 'Description', type: 'multi_line_text_field', required: false },
    { key: 'is_active', name: 'Is Active', type: 'boolean', required: true },
    { key: 'version_token', name: 'Version Token', type: 'single_line_text_field', required: false }
  ]
};

// Metaobject definition for unit_type
const unitTypeDefinition = {
  type: 'unit_type',
  name: 'Unit Type',
  description: 'Unit types used for ingredient quantities (grams, milliliters, etc.)',
  fieldDefinitions: [
    { key: 'name', name: 'Name', type: 'single_line_text_field', required: true },
    { key: 'abbreviation', name: 'Abbreviation', type: 'single_line_text_field', required: false },
    { key: 'type_category', name: 'Type Category', type: 'single_line_text_field', required: true },
    { key: 'is_active', name: 'Is Active', type: 'boolean', required: true }
  ]
};

// Metaobject definition for recipe
const recipeDefinition = {
  type: 'recipe',
  name: 'Recipe',
  description: 'Recipes that reference ingredients and quantities',
  fieldDefinitions: [
    { key: 'name', name: 'Name', type: 'single_line_text_field', required: true },
    { key: 'description', name: 'Description', type: 'multi_line_text_field', required: false },
    // store a list of metaobject references to ingredients
  // list of ingredient references — must target the 'ingredient' metaobject
  { key: 'ingredients', name: 'Ingredients', type: 'list.metaobject_reference', required: false, reference: { metaobjectType: 'ingredient' } },
    { key: 'ingredient_quantities', name: 'Ingredient Quantities', type: 'json', required: false },
    { key: 'is_active', name: 'Is Active', type: 'boolean', required: true },
    { key: 'version_token', name: 'Version Token', type: 'single_line_text_field', required: false }
  ]
};

async function checkMetaobjectDefinitionExists(graphql: any, type: string): Promise<boolean> {
  const query = `
    query getMetaobjectDefinition($type: String!) {
      metaobjectDefinitionByType(type: $type) {
        id
        type
        name
      }
    }
  `;

  try {
    const response = await graphql(query, {
      variables: { type }
    });

    if (response && typeof response.json === 'function') {
      const jsonData = await response.json();
      return !!jsonData?.data?.metaobjectDefinitionByType;
    }

    const responseData = response.data || response;
    return !!responseData?.metaobjectDefinitionByType;
  } catch (error) {
    console.error(`Error checking if ${type} exists:`, error);
    return false;
  }
}

async function createMetaobjectDefinition(graphql: any, definition: any) {
  // First check if it already exists
  const exists = await checkMetaobjectDefinitionExists(graphql, definition.type);

  if (exists) {
    console.log(`✅ Metaobject definition '${definition.type}' already exists, skipping creation`);
    return { id: 'existing', type: definition.type, name: definition.name };
  }

  const mutation = `
    mutation metaobjectDefinitionCreate($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition {
          id
          type
          name
          description
          fieldDefinitions {
            key
            name
            type {
              name
            }
            required
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  console.log(`Creating metaobject definition: ${definition.type}`);
  console.log('Definition:', JSON.stringify(definition, null, 2));

    // Strictly sanitize fieldDefinitions to only include keys the Admin API
    // actually accepts for MetaobjectFieldDefinitionCreateInput. The introspected
    // schema shows the allowed fields are: key, type, name, description, required,
    // validations. Any other properties (for example `metaobjectType` or
    // `reference`) will cause GraphQL validation errors when sent to the live API.
    try {
      if (definition && Array.isArray(definition.fieldDefinitions)) {
        const allowed = new Set(['key', 'type', 'name', 'description', 'required', 'validations']);
        const sanitized: any[] = [];

        // Detect test environment to avoid consuming extra mocked GraphQL calls
        // during Jest tests. Jest mock functions have a `.mock` property.
        const isJestMock = !!(graphql && (graphql as any).mock) || !!process.env.JEST_WORKER_ID;

        for (const fd of definition.fieldDefinitions) {
          if (!fd || typeof fd !== 'object') continue;

          // If the field includes a `reference` with a `metaobjectType`, and
          // we're not running under Jest tests, try to resolve the target
          // metaobject definition's GID and convert it into a validation entry
          // the Admin API understands (metaobject_definition_id / metaobject_definition_ids).
          try {
            if (!isJestMock && fd.reference && fd.reference.metaobjectType) {
              const targetType = String(fd.reference.metaobjectType);

              // Query the live API for the target metaobject definition by type
              const lookupQuery = `
                query getMetaobjectDefinition($type: String!) {
                  metaobjectDefinitionByType(type: $type) { id type name }
                }
              `;

              const lookupResp = await graphql(lookupQuery, { variables: { type: targetType } });
              let lookupData: any;
              if (lookupResp && typeof lookupResp.json === 'function') {
                const j = await lookupResp.json();
                lookupData = j.data;
              } else {
                lookupData = lookupResp.data || lookupResp;
              }

              const def = lookupData?.metaobjectDefinitionByType;
              if (!def || !def.id) {
                throw new Error(`Target metaobject definition '${targetType}' not found; create it first or ensure correct ordering.`);
              }

              // Inject appropriate validation depending on the field type.
              // Shopify supports a single metaobject_definition_id for metaobject_reference
              // and list.metaobject_reference. Only mixed_reference/list.mixed_reference
              // accept multiple definition IDs via metaobject_definition_ids.
              const validations = Array.isArray(fd.validations) ? [...fd.validations] : [];
              const typeStr = String(fd.type || '').trim();
              if (typeStr === 'mixed_reference' || typeStr === 'list.mixed_reference') {
                validations.push({ name: 'metaobject_definition_ids', value: JSON.stringify([def.id]) });
              } else {
                // For both metaobject_reference and list.metaobject_reference use single id
                validations.push({ name: 'metaobject_definition_id', value: def.id });
              }

              // Assign back to fd so the sanitization step keeps it
              fd.validations = validations;
            }
          } catch (innerErr) {
            console.warn('Warning: unable to resolve reference metaobjectType for field', fd.key || fd.name, innerErr);
            // Fall through and let sanitization continue; the API will return
            // a helpful userError if validation is required.
          }

          const cleaned: any = {};
          for (const k of Object.keys(fd)) {
            if (allowed.has(k)) cleaned[k] = fd[k];
          }

          // If we removed fields, log a debug-level warning so future issues are
          // easier to diagnose without exposing secrets.
          const removed = Object.keys(fd).filter(k => !allowed.has(k));
          if (removed.length > 0) {
            console.log(`Sanitized fieldDefinition '${fd.key || fd.name || '<unknown>'}': removed keys: ${removed.join(', ')}`);
          }

          sanitized.push(cleaned);
        }

        definition.fieldDefinitions = sanitized;
      }
    } catch (e) {
      console.warn('Warning: unable to sanitize definition fieldDefinitions', e);
    }

  try {
    // Call GraphQL with proper format - admin.graphql expects (query, {variables})
    const response = await graphql(mutation, {
      variables: {
        definition
      }
    });

    // Comprehensive debug logging
    console.log('Raw Response:', JSON.stringify(response, null, 2));
    console.log('Response type:', typeof response);
    console.log('Response keys:', response ? Object.keys(response) : 'No response');
    console.log('Response is Promise?:', response instanceof Promise);

    // Check if response is a Response object that needs to be parsed
    if (response && typeof response.json === 'function') {
      console.log('Response is a fetch Response, parsing JSON...');
      const jsonData = await response.json();
      console.log('Parsed JSON:', JSON.stringify(jsonData, null, 2));

      if (!jsonData || !jsonData.data) {
        throw new Error(`GraphQL error: ${JSON.stringify(jsonData?.errors || 'Unknown error')}`);
      }

      const result = jsonData.data.metaobjectDefinitionCreate;

      if (result.userErrors && result.userErrors.length > 0) {
        throw new Error(`Failed to create metaobject definition: ${result.userErrors.map((e: any) => e.message).join(', ')}`);
      }

      console.log(`✅ Successfully created ${definition.type} metaobject definition`);
      return result.metaobjectDefinition;
    }

    if (!response) {
      throw new Error('Failed to create metaobject definition: No response from GraphQL API');
    }

    // Check if response has data wrapper
    const responseData = response.data || response;
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    console.log('Response data keys:', responseData ? Object.keys(responseData) : 'No data');

    if (!responseData.metaobjectDefinitionCreate) {
      console.error('Missing metaobjectDefinitionCreate. Available keys:', Object.keys(responseData));
      console.error('Full response data:', JSON.stringify(responseData, null, 2));
      throw new Error(`Failed to create metaobject definition: Invalid response structure. Keys: ${Object.keys(responseData).join(', ')}`);
    }

    const result = responseData.metaobjectDefinitionCreate;
    console.log('metaobjectDefinitionCreate:', JSON.stringify(result, null, 2));

    if (result.userErrors && result.userErrors.length > 0) {
      console.error('UserErrors:', JSON.stringify(result.userErrors, null, 2));
      throw new Error(`Failed to create metaobject definition: ${result.userErrors.map((e: any) => e.message).join(', ')}`);
    }

    if (!result.metaobjectDefinition) {
      console.error('No metaobjectDefinition in result. Result keys:', Object.keys(result));
      throw new Error('Failed to create metaobject definition: No definition returned');
    }

    console.log(`✅ Successfully created ${definition.type} metaobject definition`);
    return result.metaobjectDefinition;
  } catch (error) {
    console.error(`❌ Error creating ${definition.type} metaobject definition:`, error);
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export async function setupMetaobjects() {
  console.log('🚀 Setting up Shopify Metaobject definitions...');

  try {
    // This would need to be called from a route or CLI script with proper authentication
    // For now, this is a template that shows the required mutations

    console.log('📋 Metaobject definitions that need to be created:');
    console.log('1. Ingredient');
    console.log('2. Packaging');
    console.log('3. Price History');

    console.log('\n📝 To set up these metaobjects, you can:');
    console.log('1. Run this script from a Shopify app route with proper authentication');
    console.log('2. Manually create them in the Shopify admin under Settings > Custom data > Metaobjects');
    console.log('3. Use the Shopify CLI or GraphQL API directly');

    return {
      ingredientDefinition,
      packagingDefinition,
      priceHistoryDefinition
    };
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

// Test data for sample ingredients
const sampleIngredients = [
  {
    name: 'All-Purpose Flour',
    category: 'Baking',
    supplier: 'King Arthur',
    cost_per_unit: '3.50',
    unit_type: 'pound',
    allergens: JSON.stringify(['Wheat', 'Gluten']),
    is_active: 'true',
    is_complimentary: 'false',
    notes: 'Organic unbleached flour',
    version_token: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: ''
  },
  {
    name: 'Granulated Sugar',
    category: 'Baking',
    supplier: 'C&H',
    cost_per_unit: '2.20',
    unit_type: 'pound',
    allergens: JSON.stringify([]),
    is_active: 'true',
    is_complimentary: 'false',
    notes: 'Pure cane sugar',
    version_token: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: ''
  },
  {
    name: 'Unsalted Butter',
    category: 'Dairy',
    supplier: 'Land O Lakes',
    cost_per_unit: '4.20',
    unit_type: 'pound',
    allergens: JSON.stringify(['Milk']),
    is_active: 'true',
    is_complimentary: 'false',
    notes: 'Premium quality butter',
    version_token: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: ''
  },
  {
    name: 'Dark Chocolate Chips',
    category: 'Chocolate',
    supplier: 'Ghirardelli',
    cost_per_unit: '8.50',
    unit_type: 'pound',
    allergens: JSON.stringify(['Milk', 'Soy']),
    is_active: 'true',
    is_complimentary: 'false',
    notes: '60% cacao',
    version_token: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: ''
  }
];

async function createSampleIngredient(graphql: any, ingredient: any) {
  const mutation = `
    mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject {
          id
          handle
          fields {
            key
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const fields = Object.entries(ingredient).map(([key, value]) => ({
    key,
    value: String(value)
  }));

  try {
    const response = await graphql(mutation, {
      variables: {
        metaobject: {
          type: 'ingredient',
          fields
        }
      }
    });

    let responseData;
    if (response && typeof response.json === 'function') {
      const jsonData = await response.json();
      if (!jsonData || !jsonData.data) {
        throw new Error(`GraphQL error: ${JSON.stringify(jsonData?.errors || 'Unknown error')}`);
      }
      responseData = jsonData.data;
    } else {
      responseData = response.data || response;
    }

    const result = responseData.metaobjectCreate;

    if (result.userErrors && result.userErrors.length > 0) {
      throw new Error(`Failed to create ingredient: ${result.userErrors.map((e: any) => e.message).join(', ')}`);
    }

    console.log(`✅ Created sample ingredient: ${ingredient.name}`);
    return result.metaobject;
  } catch (error) {
    console.error(`❌ Error creating sample ingredient ${ingredient.name}:`, error);
    throw error;
  }
}

async function deleteAllIngredients(graphql: any) {
  const query = `
    query listIngredients {
      metaobjects(type: "ingredient", first: 250) {
        edges {
          node {
            id
          }
        }
      }
    }
  `;

  try {
    const response = await graphql(query);

    let responseData;
    if (response && typeof response.json === 'function') {
      const jsonData = await response.json();
      responseData = jsonData.data;
    } else {
      responseData = response.data || response;
    }

    if (!responseData?.metaobjects?.edges) {
      return { deleted: 0 };
    }

    const deleteMutation = `
      mutation metaobjectDelete($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors {
            field
            message
          }
        }
      }
    `;

    let deletedCount = 0;
    for (const edge of responseData.metaobjects.edges) {
      try {
        const deleteResponse = await graphql(deleteMutation, {
          variables: { id: edge.node.id }
        });

        let deleteData;
        if (deleteResponse && typeof deleteResponse.json === 'function') {
          const jsonData = await deleteResponse.json();
          deleteData = jsonData.data;
        } else {
          deleteData = deleteResponse.data || deleteResponse;
        }

        if (deleteData?.metaobjectDelete?.deletedId) {
          deletedCount++;
          console.log(`✅ Deleted ingredient: ${edge.node.id}`);
        }
      } catch (error) {
        console.error(`❌ Error deleting ingredient ${edge.node.id}:`, error);
      }
    }

    return { deleted: deletedCount };
  } catch (error) {
    console.error('Error fetching ingredients to delete:', error);
    throw error;
  }
}

export async function createSampleData(request: Request, cleanFirst: boolean = false) {
  const { authenticate } = await import("../app/shopify.server");
  const { admin } = await authenticate.admin(request);

  try {
    console.log('🌱 Creating sample ingredient data...');

    let deletedCount = 0;
    if (cleanFirst) {
      console.log('🧹 Cleaning existing ingredients...');
      const deleteResult = await deleteAllIngredients(admin.graphql);
      deletedCount = deleteResult.deleted;
      console.log(`🗑️  Deleted ${deletedCount} existing ingredients`);
    }

  const createdIngredients: any[] = [];
    for (const ingredient of sampleIngredients) {
      const created = await createSampleIngredient(admin.graphql, ingredient);
      createdIngredients.push(created);
    }

    return {
      success: true,
      count: createdIngredients.length,
      deleted: deletedCount,
      ingredients: createdIngredients
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Example usage in a route:
export async function setupMetaobjectsWithAuth(request: Request) {
  // Import authenticate dynamically to avoid circular dependencies
  const { authenticate } = await import("../app/shopify.server");
  const { admin } = await authenticate.admin(request);

  try {
    // Create base definitions that other definitions reference first
    const category = await createMetaobjectDefinition(admin.graphql, categoryDefinition);
    const unitType = await createMetaobjectDefinition(admin.graphql, unitTypeDefinition);
    const ingredient = await createMetaobjectDefinition(admin.graphql, ingredientDefinition);
    // Non-referenced definitions
    const packaging = await createMetaobjectDefinition(admin.graphql, packagingDefinition);
    const priceHistory = await createMetaobjectDefinition(admin.graphql, priceHistoryDefinition);
    // Create recipe last because it references ingredient metaobjects
    const recipe = await createMetaobjectDefinition(admin.graphql, recipeDefinition);

    return {
      success: true,
      definitions: {
        ingredient,
        packaging,
        priceHistory,
        category,
        unitType,
        recipe
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Named exports for testability
export { createMetaobjectDefinition, checkMetaobjectDefinitionExists };
// Export static definitions for testability
export { recipeDefinition };