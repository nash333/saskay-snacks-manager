const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

function inspect(schemaFile, sample) {
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  const schemaPath = path.join(__dirname, '../specs/003-update-the-ingredients/contracts', schemaFile);
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const validate = ajv.compile(schema);
  const valid = validate(sample);
  console.log('Valid?', valid);
  console.log('Errors:', validate.errors);
  if (validate.errors) {
    for (const e of validate.errors) {
      console.log('---');
      console.log('keyword:', e.keyword);
      console.log('message:', e.message);
      console.log('schemaPath:', e.schemaPath);
      console.log('params:', JSON.stringify(e.params));
    }
  }
}

const invalidRecipeEmptyIngredients = {
  type: 'recipe',
  fields: {
    name: 'Test Recipe',
    ingredients: [],
    ingredient_quantities: [],
    is_active: true
  }
};

const invalidRecipeZeroQuantity = {
  type: 'recipe',
  fields: {
    name: 'Test Recipe',
    ingredients: [ { gid: 'gid://shopify/Metaobject/12345', type: 'ingredient' } ],
    ingredient_quantities: [ { ingredient_gid: 'gid://shopify/Metaobject/12345', quantity_needed: 0, unit_type_gid: 'gid://shopify/Metaobject/67890' } ],
    is_active: true
  }
};

console.log('--- Empty Ingredients Test ---');
inspect('recipe-metaobject.schema.json', invalidRecipeEmptyIngredients);
console.log('\n--- Zero Quantity Test ---');
inspect('recipe-metaobject.schema.json', invalidRecipeZeroQuantity);
