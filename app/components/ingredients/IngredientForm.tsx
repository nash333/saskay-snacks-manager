import React, { useState, useCallback } from 'react';
import {
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Banner,
  Tag,
  Box
} from '@shopify/polaris';
import {
  SaveIcon,
  ResetIcon,
  PlusIcon
} from '@shopify/polaris-icons';
import type { Ingredient } from './IngredientCard';

export interface IngredientFormData {
  name: string;
  category: string;
  supplier: string;
  cost_per_unit: string;
  unit_type: string;
  allergens: string[];
  is_active: boolean;
  notes: string;
}

interface IngredientFormProps {
  initialData?: Partial<IngredientFormData>;
  categories?: string[];
  suppliers?: string[];
  unitTypes?: string[];
  availableAllergens?: string[];
  onSubmit: (data: IngredientFormData) => Promise<void> | void;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
  errors?: Partial<Record<keyof IngredientFormData, string>>;
}

const DEFAULT_CATEGORIES = [
  'Baking', 'Dairy', 'Meat', 'Seafood', 'Produce', 'Spices', 'Extracts', 
  'Oils', 'Grains', 'Nuts', 'Chocolate', 'Sweeteners'
];

const DEFAULT_UNIT_TYPES = [
  // Weight - Imperial
  'pound', 'ounce',
  // Weight - Metric
  'gram', 'kilogram', 'milligram',
  // Volume - Imperial
  'gallon', 'quart', 'pint', 'cup', 'fluid ounce', 'tablespoon', 'teaspoon',
  // Volume - Metric
  'liter', 'milliliter', 'centiliter', 'deciliter',
  // Count
  'piece', 'each', 'dozen', 'package', 'box', 'can', 'bottle'
];

const DEFAULT_ALLERGENS = [
  'Milk', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 
  'Wheat', 'Soy', 'Sesame', 'Gluten'
];

export function IngredientForm({
  initialData = {},
  categories = DEFAULT_CATEGORIES,
  suppliers = [],
  unitTypes = DEFAULT_UNIT_TYPES,
  availableAllergens = DEFAULT_ALLERGENS,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
  errors = {}
}: IngredientFormProps) {
  const [formData, setFormData] = useState<IngredientFormData>({
    name: initialData.name || '',
    category: initialData.category || '',
    supplier: initialData.supplier || '',
    cost_per_unit: initialData.cost_per_unit || '',
    unit_type: initialData.unit_type || 'pound',
    allergens: initialData.allergens || [],
    is_active: initialData.is_active ?? true,
    notes: initialData.notes || ''
  });

  const [customCategory, setCustomCategory] = useState('');
  const [customSupplier, setCustomSupplier] = useState('');
  const [customAllergen, setCustomAllergen] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [showCustomSupplier, setShowCustomSupplier] = useState(false);
  const [showCustomAllergen, setShowCustomAllergen] = useState(false);

  const categoryOptions = [
    { label: 'Select category...', value: '' },
    ...categories.map(cat => ({ label: cat, value: cat })),
    { label: 'Add custom category...', value: '__custom__' }
  ];

  const supplierOptions = [
    { label: 'Select supplier...', value: '' },
    ...suppliers.map(sup => ({ label: sup, value: sup })),
    { label: 'Add custom supplier...', value: '__custom__' }
  ];

  const unitTypeOptions = unitTypes.map(unit => ({ label: unit, value: unit }));

  const handleFieldChange = useCallback((field: keyof IngredientFormData) => {
    return (value: string | boolean) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    };
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    if (value === '__custom__') {
      setShowCustomCategory(true);
    } else {
      setFormData(prev => ({ ...prev, category: value }));
      setShowCustomCategory(false);
    }
  }, []);

  const handleSupplierChange = useCallback((value: string) => {
    if (value === '__custom__') {
      setShowCustomSupplier(true);
    } else {
      setFormData(prev => ({ ...prev, supplier: value }));
      setShowCustomSupplier(false);
    }
  }, []);

  const handleCustomCategoryAdd = useCallback(() => {
    if (customCategory.trim()) {
      setFormData(prev => ({ ...prev, category: customCategory.trim() }));
      setCustomCategory('');
      setShowCustomCategory(false);
    }
  }, [customCategory]);

  const handleCustomSupplierAdd = useCallback(() => {
    if (customSupplier.trim()) {
      setFormData(prev => ({ ...prev, supplier: customSupplier.trim() }));
      setCustomSupplier('');
      setShowCustomSupplier(false);
    }
  }, [customSupplier]);

  const handleAllergenToggle = useCallback((allergen: string) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  }, []);

  const handleCustomAllergenAdd = useCallback(() => {
    if (customAllergen.trim() && !formData.allergens.includes(customAllergen.trim())) {
      setFormData(prev => ({
        ...prev,
        allergens: [...prev.allergens, customAllergen.trim()]
      }));
      setCustomAllergen('');
      setShowCustomAllergen(false);
    }
  }, [customAllergen, formData.allergens]);

  const handleRemoveAllergen = useCallback((allergen: string) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.filter(a => a !== allergen)
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }, [formData, onSubmit]);

  const handleReset = useCallback(() => {
    setFormData({
      name: initialData.name || '',
      category: initialData.category || '',
      supplier: initialData.supplier || '',
      cost_per_unit: initialData.cost_per_unit || '',
      unit_type: initialData.unit_type || 'pound',
      allergens: initialData.allergens || [],
      is_active: initialData.is_active ?? true,
      notes: initialData.notes || ''
    });
    setCustomCategory('');
    setCustomSupplier('');
    setCustomAllergen('');
    setShowCustomCategory(false);
    setShowCustomSupplier(false);
    setShowCustomAllergen(false);
  }, [initialData]);

  const isValid = formData.name.trim() && 
                  formData.category.trim() && 
                  formData.supplier.trim() &&
                  formData.cost_per_unit.trim() &&
                  !isNaN(parseFloat(formData.cost_per_unit));

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingLg" as="h2">
          {mode === 'create' ? 'Add New Ingredient' : 'Edit Ingredient'}
        </Text>

        {Object.keys(errors).length > 0 && (
          <Banner tone="critical">
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">Please fix the following errors:</Text>
              {Object.entries(errors).map(([field, error]) => (
                <Text key={field} as="p" variant="bodyMd">• {error}</Text>
              ))}
            </BlockStack>
          </Banner>
        )}

        <FormLayout>
          {/* Basic Information */}
          <FormLayout.Group>
            <TextField
              label="Ingredient Name"
              value={formData.name}
              onChange={handleFieldChange('name')}
              error={errors.name}
              placeholder="e.g. All-Purpose Flour"
              autoComplete="off"
              requiredIndicator
            />
            
            <TextField
              label="Cost per Unit"
              value={formData.cost_per_unit}
              onChange={handleFieldChange('cost_per_unit')}
              error={errors.cost_per_unit}
              placeholder="0.00"
              prefix="$"
              type="number"
              step={0.01}
              min={0}
              autoComplete="off"
              requiredIndicator
            />
          </FormLayout.Group>

          {/* Category */}
          <FormLayout.Group>
            {!showCustomCategory ? (
              <Select
                label="Category"
                options={categoryOptions}
                value={formData.category}
                onChange={handleCategoryChange}
                error={errors.category}
                requiredIndicator
              />
            ) : (
              <InlineStack gap="200" align="end">
                <Box width="100%">
                  <TextField
                    label="Custom Category"
                    value={customCategory}
                    onChange={setCustomCategory}
                    placeholder="Enter category name"
                    autoComplete="off"
                  />
                </Box>
                <Button onClick={handleCustomCategoryAdd} icon={PlusIcon}>
                  Add
                </Button>
                <Button 
                  onClick={() => setShowCustomCategory(false)}
                  variant="tertiary"
                >
                  Cancel
                </Button>
              </InlineStack>
            )}

            <Select
              label="Unit Type"
              options={unitTypeOptions}
              value={formData.unit_type}
              onChange={handleFieldChange('unit_type')}
              error={errors.unit_type}
            />
          </FormLayout.Group>

          {/* Supplier */}
          {!showCustomSupplier ? (
            <Select
              label="Supplier"
              options={supplierOptions}
              value={formData.supplier}
              onChange={handleSupplierChange}
              error={errors.supplier}
              requiredIndicator
            />
          ) : (
            <InlineStack gap="200" align="end">
              <Box width="100%">
                <TextField
                  label="Custom Supplier"
                  value={customSupplier}
                  onChange={setCustomSupplier}
                  placeholder="Enter supplier name"
                  autoComplete="off"
                />
              </Box>
              <Button onClick={handleCustomSupplierAdd} icon={PlusIcon}>
                Add
              </Button>
              <Button 
                onClick={() => setShowCustomSupplier(false)}
                variant="tertiary"
              >
                Cancel
              </Button>
            </InlineStack>
          )}

          {/* Status */}
          <Checkbox
            label="Active ingredient"
            checked={formData.is_active}
            onChange={handleFieldChange('is_active')}
            helpText="Inactive ingredients won't appear in recipe suggestions"
          />

          {/* Allergens */}
          <BlockStack gap="300">
            <Text variant="headingSm" as="h3">Allergens</Text>
            
            {/* Selected allergens */}
            {formData.allergens.length > 0 && (
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Selected allergens:</Text>
                <InlineStack gap="200" wrap>
                  {formData.allergens.map(allergen => (
                    <Tag key={allergen} onRemove={() => handleRemoveAllergen(allergen)}>
                      {allergen}
                    </Tag>
                  ))}
                </InlineStack>
              </Box>
            )}

            {/* Available allergens */}
            <Box>
              <Text variant="bodyMd" as="p" tone="subdued">Click to add allergens:</Text>
              <InlineStack gap="200" wrap>
                {availableAllergens
                  .filter(allergen => !formData.allergens.includes(allergen))
                  .map(allergen => (
                    <Button
                      key={allergen}
                      variant="tertiary"
                      size="slim"
                      onClick={() => handleAllergenToggle(allergen)}
                    >
                      + {allergen}
                    </Button>
                  ))}
                
                {!showCustomAllergen ? (
                  <Button
                    variant="tertiary"
                    size="slim"
                    onClick={() => setShowCustomAllergen(true)}
                  >
                    + Custom allergen
                  </Button>
                ) : (
                  <InlineStack gap="100">
                    <TextField
                      label=""
                      value={customAllergen}
                      onChange={setCustomAllergen}
                      placeholder="Custom allergen"
                      autoComplete="off"
                    />
                    <Button onClick={handleCustomAllergenAdd} icon={PlusIcon}>
                      Add
                    </Button>
                    <Button 
                      onClick={() => setShowCustomAllergen(false)}
                      variant="tertiary"
                    >
                      Cancel
                    </Button>
                  </InlineStack>
                )}
              </InlineStack>
            </Box>
          </BlockStack>

          {/* Notes */}
          <TextField
            label="Notes"
            value={formData.notes}
            onChange={handleFieldChange('notes')}
            error={errors.notes}
            multiline={3}
            placeholder="Any additional notes about this ingredient..."
            autoComplete="off"
          />

          {/* Actions */}
          <InlineStack gap="300">
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isLoading}
              disabled={!isValid}
              icon={SaveIcon}
            >
              {mode === 'create' ? 'Add Ingredient' : 'Save Changes'}
            </Button>
            
            <Button
              onClick={handleReset}
              disabled={isLoading}
              icon={ResetIcon}
            >
              Reset
            </Button>
            
            {onCancel && (
              <Button
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </InlineStack>
        </FormLayout>
      </BlockStack>
    </Card>
  );
}