/**
 * Packaging Cost Calculator Component
 * Task 48: Implement packaging options component (FR-009, FR-030)
 * Integrates packaging selection with cost calculations
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Badge,
  Banner,
  Divider
} from '@shopify/polaris';
import { PackagingSelector, calculatePackagingCost } from './PackagingSelector';
import type { PackagingOption } from './PackagingOptions';

export interface PackagingCostCalculatorProps {
  productId?: string;
  recipeCost?: number;
  onCostUpdate?: (totalCost: number, breakdown: CostBreakdown) => void;
  showBreakdown?: boolean;
  allowQuantityAdjustment?: boolean;
}

export interface CostBreakdown {
  recipeCost: number;
  packagingCost: number;
  totalCost: number;
  costPerUnit: number;
  packaging: PackagingOption | null;
  quantity: number;
}

/**
 * Component for calculating costs with packaging selection
 */
export function PackagingCostCalculator({
  productId,
  recipeCost = 0,
  onCostUpdate,
  showBreakdown = true,
  allowQuantityAdjustment = true
}: PackagingCostCalculatorProps) {
  const [selectedPackagingId, setSelectedPackagingId] = useState<string>('');
  const [selectedPackaging, setSelectedPackaging] = useState<PackagingOption | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [error, setError] = useState<Error | boolean | null>(null);

  // Calculate costs whenever packaging or quantity changes
  useEffect(() => {
    if (selectedPackaging && onCostUpdate) {
      const qty = parseInt(quantity) || 1;
      const packagingCost = calculatePackagingCost(selectedPackaging, qty);
      const totalCost = recipeCost + packagingCost;
      const costPerUnit = qty > 0 ? totalCost / qty : 0;

      const breakdown: CostBreakdown = {
        recipeCost,
        packagingCost,
        totalCost,
        costPerUnit,
        packaging: selectedPackaging,
        quantity: qty
      };

      onCostUpdate(totalCost, breakdown);
    }
  }, [selectedPackaging, quantity, recipeCost, onCostUpdate]);

  // Handle packaging change
  const handlePackagingChange = (packagingId: string, packaging: PackagingOption | null) => {
    setSelectedPackagingId(packagingId);
    setSelectedPackaging(packaging);
    setError(null);
  };

  // Handle quantity change
  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    
    const qty = parseInt(value);
    if (isNaN(qty) || qty < 1) {
      setError(new Error('Quantity must be a positive number'));
    } else {
      setError(null);
    }
  };

  // Calculate current costs
  const qty = parseInt(quantity) || 1;
  const packagingCost = calculatePackagingCost(selectedPackaging, qty);
  const totalCost = recipeCost + packagingCost;
  const costPerUnit = qty > 0 ? totalCost / qty : 0;

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingLg" as="h3">
          Packaging & Cost Calculator
        </Text>

        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            <Text variant="bodyMd" as="p">
              {error}
            </Text>
          </Banner>
        )}

        {/* Packaging Selection */}
        <PackagingSelector
          value={selectedPackagingId}
          onChange={handlePackagingChange}
          showCostInfo={true}
          showDimensions={true}
          placeholder="Choose packaging option..."
          helpText="Select packaging to include in cost calculations"
        />

        {/* Quantity Input */}
        {allowQuantityAdjustment && (
            <TextField
            label="Quantity"
            type="number"
            value={quantity}
            onChange={handleQuantityChange}
              min={1}
              step={1}
            autoComplete="off"
            helpText="Number of units to produce"
              error={typeof error === 'string' ? new Error(error) : error}
          />
        )}

        {/* Cost Breakdown */}
        {showBreakdown && selectedPackaging && (
          <>
            <Divider />
            
            <BlockStack gap="300">
              <Text variant="headingMd" as="h4">
                Cost Breakdown
              </Text>

              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px',
                border: '1px solid #e1e3e5'
              }}>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="span">
                      Recipe Cost (base)
                    </Text>
                    <Text variant="bodyMd" as="span">
                      ${recipeCost.toFixed(4)}
                    </Text>
                  </InlineStack>

                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="span">
                      Packaging Cost ({qty} × ${selectedPackaging.costPerUnit.toFixed(3)})
                    </Text>
                    <Text variant="bodyMd" as="span">
                      ${packagingCost.toFixed(4)}
                    </Text>
                  </InlineStack>

                  <Divider />

                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="span">
                      Total Cost ({qty} units)
                    </Text>
                    <Text variant="headingMd" as="span">
                      ${totalCost.toFixed(4)}
                    </Text>
                  </InlineStack>

                  <InlineStack align="space-between">
                    <Text variant="bodyLg" as="span">
                      Cost per Unit
                    </Text>
                    <Badge tone="info">
                      {`$${costPerUnit.toFixed(4)}`}
                    </Badge>
                  </InlineStack>
                </BlockStack>
              </div>

              {/* Additional Info */}
              <BlockStack gap="100">
                <Text variant="bodyMd" tone="subdued" as="p">
                  <strong>Packaging:</strong> {selectedPackaging.name}
                </Text>
                {selectedPackaging.dimensions && (
                  <Text variant="bodyMd" tone="subdued" as="p">
                    <strong>Dimensions:</strong> {selectedPackaging.dimensions.length}" × {selectedPackaging.dimensions.width}" × {selectedPackaging.dimensions.height}"
                  </Text>
                )}
                {selectedPackaging.supplierInfo && (
                  <Text variant="bodyMd" tone="subdued" as="p">
                    <strong>Supplier:</strong> {selectedPackaging.supplierInfo.supplierName}
                  </Text>
                )}
              </BlockStack>
            </BlockStack>
          </>
        )}

        {/* No packaging selected state */}
        {!selectedPackaging && (
          <div style={{ 
            textAlign: 'center', 
            padding: '32px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px dashed #c7cdd1'
          }}>
            <Text variant="bodyLg" tone="subdued" as="p">
              Select a packaging option to see cost calculations
            </Text>
            <Text variant="bodyMd" tone="subdued" as="p">
              Current recipe cost: ${recipeCost.toFixed(4)}
            </Text>
          </div>
        )}
      </BlockStack>
    </Card>
  );
}

/**
 * Mini packaging cost display for use in other components
 */
export interface PackagingCostDisplayProps {
  packaging: PackagingOption | null;
  quantity?: number;
  showDetails?: boolean;
  compact?: boolean;
}

export function PackagingCostDisplay({
  packaging,
  quantity = 1,
  showDetails = false,
  compact = false
}: PackagingCostDisplayProps) {
  if (!packaging) {
    return (
      <Text variant="bodyMd" tone="subdued" as="span">
        No packaging selected
      </Text>
    );
  }

  const totalCost = calculatePackagingCost(packaging, quantity);

  if (compact) {
    return (
      <Badge tone="info">
        {`${packaging.name}: $${totalCost.toFixed(3)}`}
      </Badge>
    );
  }

  return (
    <BlockStack gap="100">
      <InlineStack align="space-between">
        <Text variant="bodyMd" as="span">
          {packaging.name}
        </Text>
        <Text variant="bodyMd" as="span">
          ${totalCost.toFixed(4)}
        </Text>
      </InlineStack>
      
      {showDetails && (
        <Text variant="bodyMd" tone="subdued" as="p">
          {quantity} × ${packaging.costPerUnit.toFixed(3)} per unit
        </Text>
      )}
    </BlockStack>
  );
}

/**
 * Hook for packaging cost calculations
 */
export function usePackagingCost(
  packaging: PackagingOption | null,
  quantity: number = 1
) {
  const [cost, setCost] = useState(0);

  useEffect(() => {
    const newCost = calculatePackagingCost(packaging, quantity);
    setCost(newCost);
  }, [packaging, quantity]);

  return {
    cost,
    costPerUnit: packaging?.costPerUnit || 0,
    packaging,
    quantity,
    isValid: packaging !== null && quantity > 0
  };
}