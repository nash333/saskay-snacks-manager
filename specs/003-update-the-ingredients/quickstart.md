# Quickstart: Ingredients Management System

**Feature**: 003-update-the-ingredients
**Date**: 2025-09-30
**Purpose**: Step-by-step validation guide for testing the ingredients management implementation

## Prerequisites

- [ ] Shopify development store set up
- [ ] App installed in development store
- [ ] Shopify Admin access with metaobjects permissions
- [ ] Development environment running (`npm run dev`)
- [ ] All metaobject definitions created (ingredient, category, unit_type, recipe)

## Setup: Initialize Metaobject Definitions (One-Time)

### Step 1: Access Configuration Page
```
1. Navigate to: http://localhost:3000/app/config
2. Verify page loads without errors
3. Look for "Metaobject Setup" section
```

### Step 2: Create Metaobject Definitions
```
1. Click "Setup Metaobjects" button
2. Wait for confirmation: "Metaobject definitions created successfully"
3. Verify 4 definitions created:
   - ingredient_category
   - ingredient_unit_type
   - ingredient
   - recipe
```

**Verification**:
- In Shopify Admin, go to Settings → Custom Data → Metaobject definitions
- Confirm all 4 definitions exist with correct fields

## Test Scenario 1: Create Ingredient Categories

### Step 1.1: Create "Grains & Flour" Category
```
1. On configuration page, find "Categories" section
2. Click "Add Category"
3. Fill form:
   - Name: "Grains & Flour"
   - Description: "Flour, grains, and grain-based products"
   - Display Order: 10
4. Click "Save"
5. Verify success message: "Category created successfully"
```

**Expected Result**: Category appears in categories list

### Step 1.2: Create "Dairy Products" Category
```
1. Click "Add Category" again
2. Fill form:
   - Name: "Dairy Products"
   - Description: "Milk, butter, cheese, and dairy items"
   - Display Order: 20
3. Click "Save"
```

**Expected Result**: 2 categories visible in list, sorted by display order

### Step 1.3: Test Duplicate Category Name (Negative Test)
```
1. Click "Add Category"
2. Enter name: "Grains & Flour" (duplicate)
3. Click "Save"
```

**Expected Result**: Error message: "Category name already exists"

## Test Scenario 2: Create Unit Types

### Step 2.1: Create Weight Unit (grams)
```
1. On configuration page, find "Unit Types" section
2. Click "Add Unit Type"
3. Fill form:
   - Name: "grams"
   - Abbreviation: "g"
   - Type Category: "weight"
4. Click "Save"
```

**Expected Result**: Unit type appears in list

### Step 2.2: Create Volume Unit (milliliters)
```
1. Click "Add Unit Type"
2. Fill form:
   - Name: "milliliters"
   - Abbreviation: "mL"
   - Type Category: "volume"
3. Click "Save"
```

### Step 2.3: Create Count Unit (pieces)
```
1. Click "Add Unit Type"
2. Fill form:
   - Name: "pieces"
   - Abbreviation: "pcs"
   - Type Category: "each"
3. Click "Save"
```

**Expected Result**: 3 unit types visible (grams, milliliters, pieces)

## Test Scenario 3: Create Ingredients (CRUD - Create)

### Step 3.1: Navigate to Ingredients Page
```
1. Navigate to: http://localhost:3000/app/ingredients
2. Verify page loads with empty state or existing ingredients
3. Confirm "Add Ingredient" button is visible
```

### Step 3.2: Create First Ingredient - "All-Purpose Flour"
```
1. Click "Add Ingredient"
2. Fill form:
   - Name: "All-Purpose Flour"
   - Category: Select "Grains & Flour"
   - Unit Type: Select "grams"
   - Quantity on Hand: 5000
   - Cost per Unit: 0.005
   - SKU: "FLR-001"
   - Supplier Name: "ABC Grain Suppliers"
   - Description: "Standard all-purpose baking flour"
   - Notes: "Reorder when below 1000g"
3. Click "Save"
```

**Expected Result**:
- Success toast: "Ingredient created successfully"
- Modal closes
- Ingredient appears in list with all details
- Active status shown

### Step 3.3: Create Second Ingredient - "Unsalted Butter"
```
1. Click "Add Ingredient"
2. Fill form:
   - Name: "Unsalted Butter"
   - Category: Select "Dairy Products"
   - Unit Type: Select "grams"
   - Quantity on Hand: 2000
   - Cost per Unit: 0.015
   - SKU: "BTR-001"
   - Supplier Name: "XYZ Dairy"
   - Description: "Premium unsalted butter"
3. Click "Save"
```

**Expected Result**: 2 ingredients now visible in list

### Step 3.4: Test Required Field Validation (Negative Test)
```
1. Click "Add Ingredient"
2. Leave "Name" field empty
3. Try to save
```

**Expected Result**: Error message: "Name is required"

### Step 3.5: Test Invalid Cost (Negative Test)
```
1. Fill form with name: "Test Ingredient"
2. Enter cost per unit: -5
3. Try to save
```

**Expected Result**: Error message: "Cost per unit must be greater than or equal to 0"

## Test Scenario 4: Read & Search Ingredients

### Step 4.1: Test Search by Name
```
1. In search bar, type: "flour"
2. Press Enter or click Search
```

**Expected Result**: Only "All-Purpose Flour" shown in results

### Step 4.2: Test Filter by Category
```
1. Clear search bar
2. Select category filter: "Dairy Products"
3. Apply filter
```

**Expected Result**: Only "Unsalted Butter" shown in results

### Step 4.3: Test Combined Filters
```
1. Clear all filters
2. Enter search: "butter"
3. Select category: "Dairy Products"
```

**Expected Result**: "Unsalted Butter" shown (matches both filters)

### Step 4.4: Test Cost Range Filter
```
1. Clear all filters
2. Set cost range: Min = 0.01, Max = 0.02
3. Apply filter
```

**Expected Result**: Only "Unsalted Butter" shown (cost = 0.015)

### Step 4.5: Test Sorting
```
1. Clear all filters
2. Click "Sort by Name (A-Z)"
```

**Expected Result**: "All-Purpose Flour" before "Unsalted Butter"

```
3. Click "Sort by Name (Z-A)"
```

**Expected Result**: "Unsalted Butter" before "All-Purpose Flour"

## Test Scenario 5: Update Ingredients (CRUD - Update)

### Step 5.1: Edit "All-Purpose Flour"
```
1. Find "All-Purpose Flour" in list
2. Click "Edit" button (pencil icon)
3. Modify fields:
   - Quantity on Hand: 3500 (was 5000)
   - Cost per Unit: 0.006 (was 0.005)
4. Click "Save"
```

**Expected Result**:
- Success toast: "Ingredient updated successfully"
- Modal closes
- Updated values visible in list
- Updated timestamp reflects change

### Step 5.2: Test Validation on Update (Negative Test)
```
1. Edit "Unsalted Butter"
2. Clear the "Name" field (make it empty)
3. Try to save
```

**Expected Result**: Error message: "Name is required"

### Step 5.3: Verify Optimistic Locking (Concurrency Test)
```
1. Open ingredient "All-Purpose Flour" for editing (Tab 1)
2. Open same ingredient in another browser tab (Tab 2)
3. In Tab 2, change cost to 0.007 and save
4. In Tab 1, change quantity to 2000 and try to save
```

**Expected Result**: Error or warning about concurrent modification (if implemented)

## Test Scenario 6: Create Recipe with Ingredients

### Step 6.1: Navigate to Recipes Page
```
1. Navigate to: http://localhost:3000/app/recipes
2. Verify page loads
3. Click "Add Recipe"
```

### Step 6.2: Create "Basic White Bread" Recipe
```
1. Fill form:
   - Name: "Basic White Bread"
   - Description: "Simple white bread recipe"
2. Add ingredients:
   - Ingredient 1: "All-Purpose Flour", Quantity: 500, Unit: "grams"
   - Ingredient 2: (Add water if created, otherwise just flour)
3. Click "Save"
```

**Expected Result**:
- Recipe created successfully
- Recipe-ingredient relationships established
- Ingredient "All-Purpose Flour" now shows "Used in: Basic White Bread"

### Step 6.3: Verify Bidirectional Relationship
```
1. Navigate back to Ingredients page
2. Click on "All-Purpose Flour" to view details
3. Check "Used in Recipes" section
```

**Expected Result**: "Basic White Bread" listed as using this ingredient

## Test Scenario 7: Delete with Referential Integrity (CRUD - Delete)

### Step 7.1: Test Delete Ingredient Used in Recipe (Negative Test - MOST CRITICAL)
```
1. On Ingredients page, select "All-Purpose Flour"
2. Click "Delete" button
3. Confirm deletion
```

**Expected Result**:
- Error message: "Cannot delete ingredient: Used in 1 recipe(s)"
- List shows affected recipes: "Basic White Bread"
- Ingredient NOT deleted (still visible in list)
- Ingredient remains active

### Step 7.2: Delete Ingredient Not Used in Recipes (Success Case)
```
1. Select "Unsalted Butter" (assuming not in any recipe)
2. Click "Delete"
3. Confirm deletion
```

**Expected Result**:
- Success toast: "Ingredient deleted successfully"
- Ingredient disappears from active list (soft deleted)
- Ingredient `is_active` set to `false`
- Ingredient `deleted_at` timestamp set

### Step 7.3: Test Delete Category with Ingredients (Negative Test)
```
1. Navigate to Configuration page
2. Find "Grains & Flour" category
3. Click "Delete" button
```

**Expected Result**:
- Error message: "Cannot delete category: Used by 1 ingredient(s)"
- Lists affected ingredients: "All-Purpose Flour"
- Category NOT deleted

### Step 7.4: Delete Category with No Ingredients
```
1. Create a new category: "Beverages"
2. Immediately try to delete it (before adding ingredients)
3. Confirm deletion
```

**Expected Result**: Category deleted successfully (no dependencies)

### Step 7.5: Test Delete Unit Type with Ingredients (Negative Test)
```
1. Navigate to Configuration page
2. Find "grams" unit type
3. Click "Delete" button
```

**Expected Result**:
- Error message: "Cannot delete unit type: Used by 2 ingredient(s)"
- Lists affected ingredients
- Unit type NOT deleted

## Test Scenario 8: View Deleted Ingredients (Admin Function)

### Step 8.1: Access Deleted Ingredients View (if implemented)
```
1. On Ingredients page, toggle "Show Deleted" checkbox
```

**Expected Result**:
- Previously deleted "Unsalted Butter" now visible
- Marked with "Deleted" badge
- Shows deletion timestamp

### Step 8.2: Restore Deleted Ingredient (Future Feature)
```
1. Select deleted ingredient "Unsalted Butter"
2. Click "Restore" button (if implemented)
```

**Expected Result**: Ingredient restored (`is_active = true`, `deleted_at = null`)

## Test Scenario 9: Pagination (Scale Test)

### Step 9.1: Test Pagination with > 20 Ingredients
```
1. Create 25 ingredients (use bulk import or manual creation)
2. Navigate to Ingredients page
3. Verify only 20 ingredients shown on first page
4. Click "Next Page" button
```

**Expected Result**:
- Page 1 shows 20 ingredients
- Page 2 shows 5 ingredients
- Pagination controls work correctly

### Step 9.2: Test Search with Pagination
```
1. With 25+ ingredients, search for common term (e.g., "flour")
2. Verify results span multiple pages (if > 20 matches)
```

**Expected Result**: Pagination works within search results

## Test Scenario 10: Error Handling & Edge Cases

### Step 10.1: Test Shopify API Timeout
```
1. Disconnect internet or simulate network failure
2. Try to create/update ingredient
```

**Expected Result**: User-friendly error message: "Network error, please try again"

### Step 10.2: Test Invalid Metaobject Reference
```
1. Manually craft request with invalid category GID (use browser DevTools)
2. Submit form
```

**Expected Result**: Error message: "Invalid category reference"

### Step 10.3: Test Character Limits
```
1. Create ingredient with name > 255 characters
```

**Expected Result**: Error message: "Name must be 255 characters or less"

## Success Criteria Summary

✅ **Phase 1 Complete** when all scenarios pass:
- [ ] Metaobject definitions created successfully
- [ ] Categories created and validated (uniqueness enforced)
- [ ] Unit types created with proper type categories
- [ ] Ingredients CRUD operations work correctly
- [ ] Search and filtering work as expected
- [ ] Recipes created with ingredient relationships
- [ ] Bidirectional relationships maintained
- [ ] **CRITICAL**: Deletion blocked when dependencies exist
- [ ] **CRITICAL**: Referential integrity enforced for categories, unit types, recipes
- [ ] Soft delete works correctly
- [ ] Pagination handles > 20 ingredients
- [ ] Error messages are clear and actionable

## Next Steps After Validation

1. Run automated integration tests (`npm test`)
2. Check test coverage (`npm run test:coverage`)
3. Review performance with 500+ ingredients
4. Verify Shopify API rate limit handling
5. Test in production-like environment (staging store)

## Rollback Plan (If Issues Found)

1. **Critical Bugs**: Revert to previous branch
2. **Data Corruption**: Use Shopify Admin to manually delete metaobjects
3. **API Errors**: Check Shopify API status and rate limits
4. **Performance Issues**: Implement caching and query optimization

## Notes

- All tests should be performed in a development store
- Document any deviations from expected results
- Take screenshots of error states for debugging
- Monitor browser console for GraphQL errors
- Check Shopify Admin → Settings → Apps → App logs for server-side errors