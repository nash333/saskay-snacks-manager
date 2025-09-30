/**
 * IngredientFormV3 - Feature 003 Enhanced Ingredient Form
 *
 * Enhancements:
 * - Category/Unit Type selection via GID references (not strings)
 * - All 9 ingredient fields (name, category, unit_type, quantity_on_hand, cost_per_unit, sku, supplier_name, description, notes)
 * - Real-time validation using IngredientValidationService
 * - Support for quantity_on_hand and sku fields
 * - Polaris 12.0 components
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  FormLayout,
  TextField,
  Select,
  Button,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Banner
} from '@shopify/polaris';

export interface IngredientFormDataV3 {
  name: string;
  categoryGid: string;
  unitTypeGid: string;
  quantityOnHand: string;
  costPerUnit: string;
  sku: string;
  supplierName: string;
  description: string;
  notes: string;
  isActive: boolean;
}

export interface CategoryOption {
  gid: string;
  name: string;
  isActive: boolean;
}

export interface UnitTypeOption {
  gid: string;
  name: string;
  abbreviation?: string;
  typeCategory: 'weight' | 'volume' | 'each';
  isActive: boolean;
}

interface IngredientFormV3Props {
  initialData?: Partial<IngredientFormDataV3>;
  categories: CategoryOption[];
  unitTypes: UnitTypeOption[];
  onSubmit: (data: IngredientFormDataV3) => Promise<void> | void;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
  validationErrors?: Partial<Record<keyof IngredientFormDataV3, string>>;
}

export function IngredientFormV3({
  initialData = {},
  categories,
  unitTypes,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
  validationErrors = {}
}: IngredientFormV3Props) {
  const [formData, setFormData] = useState<IngredientFormDataV3>({
    name: initialData.name || '',
    categoryGid: initialData.categoryGid || '',
    unitTypeGid: initialData.unitTypeGid || '',
    quantityOnHand: initialData.quantityOnHand || '0',
    costPerUnit: initialData.costPerUnit || '0',
    sku: initialData.sku || '',
    supplierName: initialData.supplierName || '',
    description: initialData.description || '',
    notes: initialData.notes || '',
    isActive: initialData.isActive ?? true
  });

  const [touched, setTouched] = useState<Partial<Record<keyof IngredientFormDataV3, boolean>>>({});

  // Prepare category options for Select
  const categoryOptions = [
    { label: 'Select a category...', value: '' },
    ...categories
      .filter(cat => cat.isActive)
      .map(cat => ({
        label: cat.name,
        value: cat.gid
      }))
  ];

  // Prepare unit type options grouped by category
  const unitTypesByCategory = {
    weight: unitTypes.filter(ut => ut.typeCategory === 'weight' && ut.isActive),
    volume: unitTypes.filter(ut => ut.typeCategory === 'volume' && ut.isActive),
    each: unitTypes.filter(ut => ut.typeCategory === 'each' && ut.isActive)
  };

  const unitTypeOptions = [
    { label: 'Select a unit type...', value: '' },
    { label: 'Weight', value: '', disabled: true },
    ...unitTypesByCategory.weight.map(ut => ({
      label: `  ${ut.name}${ut.abbreviation ? ` (${ut.abbreviation})` : ''}`,
      value: ut.gid
    })),
    { label: 'Volume', value: '', disabled: true },
    ...unitTypesByCategory.volume.map(ut => ({
      label: `  ${ut.name}${ut.abbreviation ? ` (${ut.abbreviation})` : ''}`,
      value: ut.gid
    })),
    { label: 'Count', value: '', disabled: true },
    ...unitTypesByCategory.each.map(ut => ({
      label: `  ${ut.name}${ut.abbreviation ? ` (${ut.abbreviation})` : ''}`,
      value: ut.gid
    }))
  ];

  const handleFieldChange = useCallback(
    (field: keyof IngredientFormDataV3) => (value: string | boolean) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      setTouched(prev => ({ ...prev, [field]: true }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    // Mark all fields as touched for validation display
    setTouched({
      name: true,
      categoryGid: true,
      unitTypeGid: true,
      quantityOnHand: true,
      costPerUnit: true,
      sku: true,
      supplierName: true,
      description: true,
      notes: true,
      isActive: true
    });

    await onSubmit(formData);
  }, [formData, onSubmit]);

  const handleReset = useCallback(() => {
    setFormData({
      name: initialData.name || '',
      categoryGid: initialData.categoryGid || '',
      unitTypeGid: initialData.unitTypeGid || '',
      quantityOnHand: initialData.quantityOnHand || '0',
      costPerUnit: initialData.costPerUnit || '0',
      sku: initialData.sku || '',
      supplierName: initialData.supplierName || '',
      description: initialData.description || '',
      notes: initialData.notes || '',
      isActive: initialData.isActive ?? true
    });
    setTouched({});
  }, [initialData]);

  const getFieldError = (field: keyof IngredientFormDataV3) => {
    return touched[field] ? validationErrors[field] : undefined;
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          {mode === 'create' ? 'Create New Ingredient' : 'Edit Ingredient'}
        </Text>

        {Object.keys(validationErrors).length > 0 && (
          <Banner tone="critical">
            <Text as="p">Please fix the validation errors below.</Text>
          </Banner>
        )}

        <FormLayout>
          {/* Name - Required */}
          <TextField
            label="Ingredient Name"
            value={formData.name}
            onChange={handleFieldChange('name')}
            error={getFieldError('name')}
            autoComplete="off"
            requiredIndicator
            helpText="Unique name for the ingredient (e.g., 'All-Purpose Flour')"
          />

          {/* Category - Required (GID reference) */}
          <Select
            label="Category"
            options={categoryOptions}
            value={formData.categoryGid}
            onChange={handleFieldChange('categoryGid')}
            error={getFieldError('categoryGid')}
            requiredIndicator
            helpText="Select the ingredient category"
          />

          {/* Unit Type - Required (GID reference) */}
          <Select
            label="Unit Type"
            options={unitTypeOptions}
            value={formData.unitTypeGid}
            onChange={handleFieldChange('unitTypeGid')}
            error={getFieldError('unitTypeGid')}
            requiredIndicator
            helpText="How this ingredient is measured"
          />

          <FormLayout.Group>
            {/* Cost Per Unit - Required */}
            <TextField
              label="Cost Per Unit"
              type="number"
              value={formData.costPerUnit}
              onChange={handleFieldChange('costPerUnit')}
              error={getFieldError('costPerUnit')}
              prefix="$"
              min="0"
              step={0.01}
              autoComplete="off"
              requiredIndicator
              helpText="Cost per single unit"
            />

            {/* Quantity On Hand */}
            <TextField
              label="Quantity On Hand"
              type="number"
              value={formData.quantityOnHand}
              onChange={handleFieldChange('quantityOnHand')}
              error={getFieldError('quantityOnHand')}
              min="0"
              step={0.01}
              autoComplete="off"
              helpText="Current inventory quantity"
            />
          </FormLayout.Group>

          <FormLayout.Group>
            {/* SKU */}
            <TextField
              label="SKU"
              value={formData.sku}
              onChange={handleFieldChange('sku')}
              error={getFieldError('sku')}
              autoComplete="off"
              helpText="Stock Keeping Unit (alphanumeric + hyphens)"
              maxLength={50}
            />

            {/* Supplier Name */}
            <TextField
              label="Supplier Name"
              value={formData.supplierName}
              onChange={handleFieldChange('supplierName')}
              error={getFieldError('supplierName')}
              autoComplete="off"
              helpText="Vendor or supplier name"
              maxLength={255}
            />
          </FormLayout.Group>

          {/* Description */}
          <TextField
            label="Description"
            value={formData.description}
            onChange={handleFieldChange('description')}
            error={getFieldError('description')}
            multiline={3}
            autoComplete="off"
            helpText="Detailed ingredient description (max 1000 characters)"
            maxLength={1000}
            showCharacterCount
          />

          {/* Notes */}
          <TextField
            label="Internal Notes"
            value={formData.notes}
            onChange={handleFieldChange('notes')}
            error={getFieldError('notes')}
            multiline={4}
            autoComplete="off"
            helpText="Internal notes and comments (max 2000 characters)"
            maxLength={2000}
            showCharacterCount
          />

          {/* Action Buttons */}
          <InlineStack gap="300" align="end">
            {onCancel && (
              <Button onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button onClick={handleReset} disabled={isLoading}>
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isLoading}
            >
              {mode === 'create' ? 'Create Ingredient' : 'Save Changes'}
            </Button>
          </InlineStack>
        </FormLayout>
      </BlockStack>
    </Card>
  );
}