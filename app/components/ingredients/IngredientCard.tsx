import React from 'react';
import {
  Card,
  Text,
  InlineStack,
  Badge,
  Button,
  BlockStack,
  Box,
  Tooltip
} from '@shopify/polaris';
import {
  EditIcon,
  DeleteIcon,
  ViewIcon
} from '@shopify/polaris-icons';

export interface Ingredient {
  id: string | null;
  gid?: string;
  name: string;
  // Legacy fields (Feature 002)
  category?: string;
  supplier?: string;
  unitType?: 'weight' | 'volume' | 'each';
  allergens?: string[];
  isComplimentary?: boolean;
  // Feature 003 fields (GID references)
  categoryGid?: string;
  categoryName?: string;
  unitTypeGid?: string;
  unitTypeName?: string;
  unitTypeAbbreviation?: string;
  quantityOnHand?: number;
  sku?: string;
  supplierName?: string;
  description?: string;
  usedInRecipes?: Array<{ gid: string; name: string }>;
  // Common fields
  costPerUnit: number;
  isActive: boolean;
  versionToken: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

interface IngredientCardProps {
  ingredient: Ingredient;
  onEdit?: (ingredient: Ingredient) => void;
  onDelete?: (ingredient: Ingredient) => void;
  onView?: (ingredient: Ingredient) => void;
  compact?: boolean;
}

export function IngredientCard({
  ingredient,
  onEdit,
  onDelete,
  onView,
  compact = false
}: IngredientCardProps) {
  const cost = ingredient.costPerUnit;
  const isExpensive = cost > 10;
  const isInactive = !ingredient.isActive;

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header with name and status */}
        <InlineStack align="space-between" blockAlign="start">
          <BlockStack gap="200">
            <Text variant="headingMd" as="h3">
              {ingredient.name}
            </Text>
            <InlineStack gap="200">
              <Badge tone={isInactive ? 'critical' : 'success'}>
                {isInactive ? 'Inactive' : 'Active'}
              </Badge>
              {isExpensive && (
                <Badge tone="attention">
                  High Cost
                </Badge>
              )}
            </InlineStack>
          </BlockStack>

          {/* Action buttons */}
          <InlineStack gap="200">
            {onView && (
              <Tooltip content="View details">
                <Button
                  icon={ViewIcon}
                  variant="tertiary"
                  onClick={() => onView(ingredient)}
                />
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip content="Edit ingredient">
                <Button
                  icon={EditIcon}
                  variant="tertiary"
                  onClick={() => onEdit(ingredient)}
                />
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip content="Delete ingredient">
                <Button
                  icon={DeleteIcon}
                  variant="tertiary"
                  tone="critical"
                  onClick={() => onDelete(ingredient)}
                />
              </Tooltip>
            )}
          </InlineStack>
        </InlineStack>

        {/* Main content */}
        {!compact && (
          <BlockStack gap="300">
            {/* Basic info */}
            <InlineStack gap="400" wrap>
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Category</Text>
                <Text variant="bodyMd" as="p">{ingredient.category || '-'}</Text>
              </Box>
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Supplier</Text>
                <Text variant="bodyMd" as="p">{ingredient.supplier || '-'}</Text>
              </Box>
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Cost</Text>
                <Text variant="bodyMd" as="p" fontWeight="semibold">
                  ${cost.toFixed(2)} / {ingredient.unitType}
                </Text>
              </Box>
            </InlineStack>

            {/* Allergens */}
            {ingredient.allergens && ingredient.allergens.length > 0 && (
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Allergens</Text>
                <InlineStack gap="200">
                  {ingredient.allergens.map((allergen) => (
                    <Badge key={allergen} tone="warning">
                      {allergen}
                    </Badge>
                  ))}
                </InlineStack>
              </Box>
            )}

            {/* Notes */}
            {ingredient.notes && (
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Notes</Text>
                <Text variant="bodyMd" as="p">{ingredient.notes}</Text>
              </Box>
            )}

            {/* Last updated */}
            <Box>
              <Text variant="bodySm" as="p" tone="subdued">
                Last cost update: {new Date(ingredient.updatedAt || ingredient.createdAt || new Date()).toLocaleDateString()}
              </Text>
            </Box>
          </BlockStack>
        )}

        {/* Compact view */}
        {compact && (
          <InlineStack gap="400" align="space-between">
            <BlockStack gap="100">
              <Text variant="bodyMd" as="p">{ingredient.category || '-'} • {ingredient.supplier || '-'}</Text>
              <Text variant="bodyMd" as="p" fontWeight="semibold">
                ${cost.toFixed(2)} / {ingredient.unitType}
              </Text>
            </BlockStack>
            {ingredient.allergens && ingredient.allergens.length > 0 && (
              <InlineStack gap="100">
                {ingredient.allergens.slice(0, 2).map((allergen) => (
                  <Badge key={allergen} tone="warning" size="small">
                    {allergen}
                  </Badge>
                ))}
                {ingredient.allergens.length > 2 && (
                  <Badge tone="warning" size="small">
                    {`+${ingredient.allergens.length - 2}`}
                  </Badge>
                )}
              </InlineStack>
            )}
          </InlineStack>
        )}
      </BlockStack>
    </Card>
  );
}