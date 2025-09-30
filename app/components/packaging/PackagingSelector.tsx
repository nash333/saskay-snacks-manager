/**
 * Packaging Selector Component
 * Task 48: Implement packaging options component (FR-009, FR-030)
 * Simple component for selecting packaging in forms and calculations
 */

import React, { useState, useEffect } from 'react';
import {
  Select,
  Card,
  InlineStack,
  BlockStack,
  Text,
  Button,
  Badge,
  Tooltip
} from '@shopify/polaris';
import { InfoIcon } from '@shopify/polaris-icons';
import type { PackagingOption } from './PackagingOptions';

export interface PackagingSelectorProps {
  value?: string;
  onChange: (packagingId: string, packaging: PackagingOption | null) => void;
  disabled?: boolean;
  placeholder?: string;
  showCostInfo?: boolean;
  showDimensions?: boolean;
  activeOnly?: boolean;
  error?: string;
  helpText?: string;
}

/**
 * Simple packaging selector for use in forms
 */
export function PackagingSelector({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select packaging...',
  showCostInfo = true,
  showDimensions = false,
  activeOnly = true,
  error,
  helpText
}: PackagingSelectorProps) {
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Load packaging options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoading(true);
        
        // Mock data - would be replaced with actual API call
        const mockData: PackagingOption[] = [
          {
            id: '1',
            name: 'Small Pouch',
            costPerUnit: 0.15,
            unitType: 'each',
            unitCount: 1,
            dimensions: { length: 4, width: 6, height: 0.5, unit: 'inches' },
            isActive: true
          },
          {
            id: '2',
            name: 'Medium Box',
            costPerUnit: 0.45,
            unitType: 'each',
            unitCount: 1,
            dimensions: { length: 8, width: 6, height: 4, unit: 'inches' },
            isActive: true
          },
          {
            id: '3',
            name: 'Foil Pack',
            costPerUnit: 0.25,
            unitType: 'each',
            unitCount: 1,
            dimensions: { length: 5, width: 7, height: 0.2, unit: 'inches' },
            isActive: false
          }
        ];

        const filteredData = activeOnly 
          ? mockData.filter(option => option.isActive)
          : mockData;

        setPackagingOptions(filteredData);
      } catch (err) {
        console.error('Failed to load packaging options:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, [activeOnly]);

  // Get selected packaging details
  const selectedPackaging = packagingOptions.find(option => option.id === value);

  // Handle selection change
  const handleChange = (selectedValue: string) => {
    if (selectedValue === '') {
      onChange('', null);
    } else {
      const packaging = packagingOptions.find(option => option.id === selectedValue);
      onChange(selectedValue, packaging || null);
    }
  };

  // Prepare select options
  const selectOptions = [
    { label: placeholder, value: '' },
    ...packagingOptions.map(option => ({
      label: `${option.name} - $${option.costPerUnit.toFixed(3)}`,
      value: option.id!
    }))
  ];

  return (
    <BlockStack gap="200">
      <Select
        label="Packaging"
        options={selectOptions}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled || loading}
        error={error}
        helpText={helpText}
      />

      {/* Show selected packaging details */}
      {selectedPackaging && (showCostInfo || showDimensions) && (
        <Card background="bg-surface-secondary">
          <BlockStack gap="200">
            <Text variant="headingMd" tone="subdued" as="h4">
              Packaging Details
            </Text>
            
            <InlineStack gap="400" wrap>
              {showCostInfo && (
                <div>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    Cost per Unit
                  </Text>
                  <Text variant="bodyLg" as="p">
                    ${selectedPackaging.costPerUnit.toFixed(3)}
                  </Text>
                </div>
              )}

              {showDimensions && selectedPackaging.dimensions && (
                <div>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    Dimensions
                  </Text>
                  <Text variant="bodyLg" as="p">
                    {selectedPackaging.dimensions.length}" × {selectedPackaging.dimensions.width}" × {selectedPackaging.dimensions.height}"
                  </Text>
                </div>
              )}

              {selectedPackaging.weight && (
                <div>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    Weight
                  </Text>
                  <Text variant="bodyLg" as="p">
                    {selectedPackaging.weight.value} {selectedPackaging.weight.unit}
                  </Text>
                </div>
              )}

              {selectedPackaging.capacity && (
                <div>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    Capacity
                  </Text>
                  <Text variant="bodyLg" as="p">
                    {selectedPackaging.capacity.value} {selectedPackaging.capacity.unit}
                  </Text>
                </div>
              )}
            </InlineStack>

            {selectedPackaging.description && (
              <Text variant="bodyMd" tone="subdued" as="p">
                {selectedPackaging.description}
              </Text>
            )}

            {selectedPackaging.supplierInfo && (
              <InlineStack gap="200">
                <Text variant="bodyMd" tone="subdued" as="span">
                  Supplier: {selectedPackaging.supplierInfo.supplierName}
                </Text>
                {selectedPackaging.supplierInfo.sku && (
                  <Badge>
                    {`SKU: ${selectedPackaging.supplierInfo.sku}`}
                  </Badge>
                )}
              </InlineStack>
            )}
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}

/**
 * Inline packaging selector with cost preview
 */
export interface InlinePackagingSelectorProps extends PackagingSelectorProps {
  showQuickAdd?: boolean;
  onQuickAdd?: () => void;
}

export function InlinePackagingSelector({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select packaging...',
  showQuickAdd = false,
  onQuickAdd,
  error
}: InlinePackagingSelectorProps) {
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);

  // Load packaging options (simplified version)
  useEffect(() => {
    const mockData: PackagingOption[] = [
      { id: '1', name: 'Small Pouch', costPerUnit: 0.15, unitType: 'each', isActive: true },
      { id: '2', name: 'Medium Box', costPerUnit: 0.45, unitType: 'each', isActive: true },
      { id: '3', name: 'Foil Pack', costPerUnit: 0.25, unitType: 'each', isActive: false }
    ];
    setPackagingOptions(mockData.filter(option => option.isActive));
  }, []);

  const selectedPackaging = packagingOptions.find(option => option.id === value);

  const selectOptions = [
    { label: placeholder, value: '' },
    ...packagingOptions.map(option => ({
      label: `${option.name} ($${option.costPerUnit.toFixed(3)})`,
      value: option.id!
    }))
  ];

  const handleChange = (selectedValue: string) => {
    if (selectedValue === '') {
      onChange('', null);
    } else {
      const packaging = packagingOptions.find(option => option.id === selectedValue);
      onChange(selectedValue, packaging || null);
    }
  };

  return (
    <InlineStack gap="200" align="center">
      <div style={{ flex: 1 }}>
        <Select
          label="Packaging"
          options={selectOptions}
          value={value || ''}
          onChange={handleChange}
          disabled={disabled}
          error={error}
        />
      </div>

      {selectedPackaging && (
        <Tooltip content={`Cost: $${selectedPackaging.costPerUnit.toFixed(3)} per unit`}>
          <div style={{ padding: '4px' }}>
            <Badge tone="info">
              {`$${selectedPackaging.costPerUnit.toFixed(3)}`}
            </Badge>
          </div>
        </Tooltip>
      )}

      {showQuickAdd && onQuickAdd && (
        <Button size="micro" onClick={onQuickAdd} variant="plain">
          + Add New
        </Button>
      )}
    </InlineStack>
  );
}

/**
 * Packaging cost calculator helper
 */
export function calculatePackagingCost(
  packaging: PackagingOption | null,
  quantity: number = 1
): number {
  if (!packaging) return 0;
  return packaging.costPerUnit * quantity;
}

/**
 * Get packaging display text
 */
export function getPackagingDisplayText(packaging: PackagingOption | null): string {
  if (!packaging) return 'No packaging selected';
  
  const parts = [packaging.name];
  
  if (packaging.dimensions) {
    parts.push(`${packaging.dimensions.length}" × ${packaging.dimensions.width}" × ${packaging.dimensions.height}"`);
  }
  
  parts.push(`$${packaging.costPerUnit.toFixed(3)}`);
  
  return parts.join(' • ');
}