import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  InlineStack,
  BlockStack,
  Text,
  Divider,
  Checkbox,
  ChoiceList,
  Box,
  Badge,
  ButtonGroup,
  DataTable,
  Modal,
  Autocomplete,
  Icon,
  Tooltip,
  Banner
} from '@shopify/polaris';
import {
  DeleteIcon,
  PlusIcon,
  SearchIcon
} from '@shopify/polaris-icons';

export interface RecipeFormData {
  name: string;
  description: string;
  category: string;
  yield_quantity: number;
  yield_unit: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  is_active: boolean;
  notes: string;
  ingredients: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  allergens?: string[];
}

export interface AvailableIngredient {
  id: string;
  handle: string;
  fields: {
    name: string;
    brand?: string;
    category: string;
    unit_type: string;
    cost_per_unit: number;
    supplier: string;
    allergens?: string[];
    is_active: boolean;
  };
}

interface RecipeFormProps {
  initialData?: Partial<RecipeFormData>;
  availableIngredients: AvailableIngredient[];
  onSubmit: (data: RecipeFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  categories?: string[];
  yieldUnits?: string[];
}

const DIFFICULTY_OPTIONS = [
  { label: 'Easy', value: 'Easy' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Hard', value: 'Hard' }
];

const DEFAULT_YIELD_UNITS = [
  'servings', 'portions', 'pieces', 'items', 'kg', 'g', 'liters', 'ml', 'dozen'
];

const DEFAULT_CATEGORIES = [
  'Appetizers', 'Main Dishes', 'Desserts', 'Beverages', 'Snacks', 'Sides', 'Sauces', 'Baked Goods'
];

export function RecipeForm({
  initialData,
  availableIngredients,
  onSubmit,
  onCancel,
  isLoading = false,
  categories = DEFAULT_CATEGORIES,
  yieldUnits = DEFAULT_YIELD_UNITS
}: RecipeFormProps) {
  const [formData, setFormData] = useState<RecipeFormData>({
    name: '',
    description: '',
    category: '',
    yield_quantity: 1,
    yield_unit: 'servings',
    prep_time_minutes: 0,
    cook_time_minutes: 0,
    difficulty: 'Easy',
    is_active: true,
    notes: '',
    ingredients: [],
    ...initialData
  });

  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<AvailableIngredient | null>(null);
  const [ingredientQuantity, setIngredientQuantity] = useState(1);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customYieldUnit, setCustomYieldUnit] = useState('');
  const [showCustomYieldUnit, setShowCustomYieldUnit] = useState(false);

  // Calculate total cost and allergens
  const totalCost = formData.ingredients.reduce(
    (sum, ingredient) => sum + (ingredient.quantity * ingredient.cost_per_unit), 
    0
  );
  const costPerUnit = formData.yield_quantity > 0 ? totalCost / formData.yield_quantity : 0;
  const allAllergens = new Set<string>();
  formData.ingredients.forEach(ingredient => {
    ingredient.allergens?.forEach(allergen => allAllergens.add(allergen));
  });

  // Filter ingredients for autocomplete
  const filteredIngredients = availableIngredients.filter(ingredient =>
    ingredient.fields.is_active &&
    ingredient.fields.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  const ingredientOptions = filteredIngredients.map(ingredient => ({
    value: ingredient.id,
    label: `${ingredient.fields.name} (${ingredient.fields.brand || 'Generic'}) - $${ingredient.fields.cost_per_unit}/${ingredient.fields.unit_type}`
  }));

  const handleFieldChange = useCallback((field: keyof RecipeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAddIngredient = useCallback(() => {
    if (!selectedIngredient || ingredientQuantity <= 0) return;

    const newIngredient: RecipeIngredient = {
      id: selectedIngredient.id,
      name: selectedIngredient.fields.name,
      quantity: ingredientQuantity,
      unit: selectedIngredient.fields.unit_type,
      cost_per_unit: selectedIngredient.fields.cost_per_unit,
      allergens: selectedIngredient.fields.allergens
    };

    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, newIngredient]
    }));

    // Reset modal form
    setSelectedIngredient(null);
    setIngredientQuantity(1);
    setIngredientSearch('');
    setShowIngredientModal(false);
  }, [selectedIngredient, ingredientQuantity]);

  const handleRemoveIngredient = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  }, []);

  const handleUpdateIngredientQuantity = useCallback((index: number, quantity: number) => {
    if (quantity <= 0) return;
    
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => 
        i === index ? { ...ingredient, quantity } : ingredient
      )
    }));
  }, []);

  const handleAddCustomCategory = useCallback(() => {
    if (customCategory.trim()) {
      handleFieldChange('category', customCategory.trim());
      setCustomCategory('');
      setShowCustomCategory(false);
    }
  }, [customCategory, handleFieldChange]);

  const handleAddCustomYieldUnit = useCallback(() => {
    if (customYieldUnit.trim()) {
      handleFieldChange('yield_unit', customYieldUnit.trim());
      setCustomYieldUnit('');
      setShowCustomYieldUnit(false);
    }
  }, [customYieldUnit, handleFieldChange]);

  const handleSubmit = useCallback(() => {
    onSubmit(formData);
  }, [formData, onSubmit]);

  const isFormValid = formData.name.trim() && formData.category && formData.ingredients.length > 0;

  // Data table for ingredients
  const ingredientRows = formData.ingredients.map((ingredient, index) => {
    const totalCost = ingredient.quantity * ingredient.cost_per_unit;
    return [
      ingredient.name,
      <TextField
        key={`quantity-${index}`}
        label=""
        value={ingredient.quantity.toString()}
        type="number"
        min={0.01}
        step={0.01}
        onChange={(value) => handleUpdateIngredientQuantity(index, parseFloat(value) || 0)}
        autoComplete="off"
      />,
      ingredient.unit,
      `$${ingredient.cost_per_unit.toFixed(2)}`,
      `$${totalCost.toFixed(2)}`,
      <Button
        key={`delete-${index}`}
        icon={DeleteIcon}
        variant="tertiary"
        tone="critical"
        onClick={() => handleRemoveIngredient(index)}
      />
    ];
  });

  return (
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <Text variant="headingLg" as="h2">
            {initialData ? 'Edit Recipe' : 'Create New Recipe'}
          </Text>

          <FormLayout>
            {/* Basic Information */}
            <FormLayout.Group>
              <TextField
                label="Recipe Name"
                value={formData.name}
                onChange={(value) => handleFieldChange('name', value)}
                error={!formData.name.trim() ? 'Recipe name is required' : undefined}
                autoComplete="off"
              />
              
              <BlockStack gap="200">
                <Select
                  label="Category"
                  options={[
                    { label: 'Select category', value: '' },
                    ...categories.map(category => ({ label: category, value: category })),
                    { label: 'Add custom category...', value: 'custom' }
                  ]}
                  value={formData.category}
                  onChange={(value) => {
                    if (value === 'custom') {
                      setShowCustomCategory(true);
                    } else {
                      handleFieldChange('category', value);
                    }
                  }}
                  error={!formData.category ? 'Category is required' : undefined}
                />
                
                {showCustomCategory && (
                  <InlineStack gap="200">
                    <TextField
                      label="Custom Category"
                      placeholder="Enter custom category"
                      value={customCategory}
                      onChange={setCustomCategory}
                      autoComplete="off"
                    />
                    <Button onClick={handleAddCustomCategory}>Add</Button>
                    <Button variant="tertiary" onClick={() => setShowCustomCategory(false)}>
                      Cancel
                    </Button>
                  </InlineStack>
                )}
              </BlockStack>
            </FormLayout.Group>

            <TextField
              label="Description"
              value={formData.description}
              onChange={(value) => handleFieldChange('description', value)}
              multiline={3}
              autoComplete="off"
              helpText="Optional description of the recipe"
            />

            {/* Yield Information */}
            <FormLayout.Group>
              <TextField
                label="Yield Quantity"
                type="number"
                value={formData.yield_quantity.toString()}
                onChange={(value) => handleFieldChange('yield_quantity', parseInt(value) || 1)}
                min={1}
                error={formData.yield_quantity <= 0 ? 'Yield quantity must be greater than 0' : undefined}
                autoComplete="off"
              />
              
              <BlockStack gap="200">
                <Select
                  label="Yield Unit"
                  options={[
                    ...yieldUnits.map(unit => ({ label: unit, value: unit })),
                    { label: 'Add custom unit...', value: 'custom' }
                  ]}
                  value={formData.yield_unit}
                  onChange={(value) => {
                    if (value === 'custom') {
                      setShowCustomYieldUnit(true);
                    } else {
                      handleFieldChange('yield_unit', value);
                    }
                  }}
                />
                
                {showCustomYieldUnit && (
                  <InlineStack gap="200">
                    <TextField
                      label="Custom Unit"
                      placeholder="Enter custom unit"
                      value={customYieldUnit}
                      onChange={setCustomYieldUnit}
                      autoComplete="off"
                    />
                    <Button onClick={handleAddCustomYieldUnit}>Add</Button>
                    <Button variant="tertiary" onClick={() => setShowCustomYieldUnit(false)}>
                      Cancel
                    </Button>
                  </InlineStack>
                )}
              </BlockStack>
            </FormLayout.Group>

            {/* Time and Difficulty */}
            <FormLayout.Group>
              <TextField
                label="Prep Time (minutes)"
                type="number"
                value={formData.prep_time_minutes.toString()}
                onChange={(value) => handleFieldChange('prep_time_minutes', parseInt(value) || 0)}
                min={0}
                helpText="Optional preparation time"
                autoComplete="off"
              />
              
              <TextField
                label="Cook Time (minutes)"
                type="number"
                value={formData.cook_time_minutes.toString()}
                onChange={(value) => handleFieldChange('cook_time_minutes', parseInt(value) || 0)}
                min={0}
                helpText="Optional cooking time"
                autoComplete="off"
              />
              
              <Select
                label="Difficulty"
                options={DIFFICULTY_OPTIONS}
                value={formData.difficulty}
                onChange={(value) => handleFieldChange('difficulty', value as 'Easy' | 'Medium' | 'Hard')}
              />
            </FormLayout.Group>

            {/* Status */}
            <Checkbox
              label="Recipe is active"
              checked={formData.is_active}
              onChange={(checked) => handleFieldChange('is_active', checked)}
              helpText="Inactive recipes are hidden from normal listings"
            />

            {/* Notes */}
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(value) => handleFieldChange('notes', value)}
              multiline={2}
              autoComplete="off"
              helpText="Optional notes or special instructions"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      {/* Ingredients Section */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text variant="headingMd" as="h3">Ingredients</Text>
            <Button
              icon={PlusIcon}
              onClick={() => setShowIngredientModal(true)}
            >
              Add Ingredient
            </Button>
          </InlineStack>

          {formData.ingredients.length === 0 ? (
            <Box padding="400">
              <Text variant="bodyMd" as="p" alignment="center" tone="subdued">
                No ingredients added yet. Click "Add Ingredient" to get started.
              </Text>
            </Box>
          ) : (
            <BlockStack gap="300">
              <DataTable
                columnContentTypes={['text', 'numeric', 'text', 'numeric', 'numeric', 'text']}
                headings={['Ingredient', 'Quantity', 'Unit', 'Cost/Unit', 'Total Cost', 'Action']}
                rows={ingredientRows}
              />
              
              {/* Cost Summary */}
              <Box padding="300" background="bg-surface-secondary">
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Total Recipe Cost: ${totalCost.toFixed(2)}
                  </Text>
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Cost per {formData.yield_unit}: ${costPerUnit.toFixed(2)}
                  </Text>
                </InlineStack>
                
                {allAllergens.size > 0 && (
                  <Box paddingBlockStart="200">
                    <Text variant="bodyMd" as="p" tone="subdued">Allergens:</Text>
                    <InlineStack gap="200">
                      {Array.from(allAllergens).map(allergen => (
                        <Badge key={allergen} tone="warning">{allergen}</Badge>
                      ))}
                    </InlineStack>
                  </Box>
                )}
              </Box>
            </BlockStack>
          )}
        </BlockStack>
      </Card>

      {/* Form Actions */}
      <InlineStack align="end" gap="200">
        {onCancel && (
          <Button variant="tertiary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={isLoading}
          disabled={!isFormValid}
        >
          {initialData ? 'Update Recipe' : 'Create Recipe'}
        </Button>
      </InlineStack>

      {/* Add Ingredient Modal */}
      <Modal
        open={showIngredientModal}
        onClose={() => setShowIngredientModal(false)}
        title="Add Ingredient"
        primaryAction={{
          content: 'Add Ingredient',
          onAction: handleAddIngredient,
          disabled: !selectedIngredient || ingredientQuantity <= 0
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowIngredientModal(false)
          }
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <Autocomplete
              options={ingredientOptions}
              selected={selectedIngredient ? [selectedIngredient.id] : []}
              onSelect={(selected) => {
                const ingredient = availableIngredients.find(ing => ing.id === selected[0]);
                setSelectedIngredient(ingredient || null);
              }}
              textField={
                <TextField
                  prefix={<Icon source={SearchIcon} />}
                  label="Search Ingredients"
                  value={ingredientSearch}
                  onChange={setIngredientSearch}
                  placeholder="Type to search ingredients..."
                  autoComplete="off"
                />
              }
            />

            {selectedIngredient && (
              <BlockStack gap="300">
                <Box padding="300" background="bg-surface-secondary">
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h4">{selectedIngredient.fields.name}</Text>
                    <Text variant="bodyMd" as="p">
                      Brand: {selectedIngredient.fields.brand || 'Generic'}
                    </Text>
                    <Text variant="bodyMd" as="p">
                      Cost: ${selectedIngredient.fields.cost_per_unit}/{selectedIngredient.fields.unit_type}
                    </Text>
                    {selectedIngredient.fields.allergens && selectedIngredient.fields.allergens.length > 0 && (
                      <InlineStack gap="200">
                        <Text variant="bodySm" as="p" tone="subdued">Allergens:</Text>
                        {selectedIngredient.fields.allergens.map(allergen => (
                          <Badge key={allergen} tone="warning" size="small">{allergen}</Badge>
                        ))}
                      </InlineStack>
                    )}
                  </BlockStack>
                </Box>

                <TextField
                  label={`Quantity (${selectedIngredient.fields.unit_type})`}
                  type="number"
                  value={ingredientQuantity.toString()}
                  onChange={(value) => setIngredientQuantity(parseFloat(value) || 0)}
                  min={0.01}
                  step={0.01}
                  error={ingredientQuantity <= 0 ? 'Quantity must be greater than 0' : undefined}
                  autoComplete="off"
                />

                <Box padding="200" background="bg-surface-secondary">
                  <Text variant="bodyMd" as="p">
                    Total Cost: ${(ingredientQuantity * selectedIngredient.fields.cost_per_unit).toFixed(2)}
                  </Text>
                </Box>
              </BlockStack>
            )}
          </FormLayout>
        </Modal.Section>
      </Modal>

      {/* Validation Errors */}
      {!isFormValid && (
        <Banner tone="critical">
          <Text variant="bodyMd" as="p">
            Please fill in all required fields:
            {!formData.name.trim() && ' Recipe name,'}
            {!formData.category && ' Category,'}
            {formData.ingredients.length === 0 && ' At least one ingredient'}
          </Text>
        </Banner>
      )}
    </BlockStack>
  );
}