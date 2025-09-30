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
      type: "single_line_text_field",
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
      type: "single_line_text_field",
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
    { key: 'ingredients', name: 'Ingredients', type: 'reference', required: false },
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
    const ingredient = await createMetaobjectDefinition(admin.graphql, ingredientDefinition);
    const packaging = await createMetaobjectDefinition(admin.graphql, packagingDefinition);
    const priceHistory = await createMetaobjectDefinition(admin.graphql, priceHistoryDefinition);
    const category = await createMetaobjectDefinition(admin.graphql, categoryDefinition);
    const unitType = await createMetaobjectDefinition(admin.graphql, unitTypeDefinition);
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