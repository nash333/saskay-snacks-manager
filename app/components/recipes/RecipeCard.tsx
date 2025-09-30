import React from 'react';
import {
  Card,
  Text,
  InlineStack,
  Badge,
  Button,
  BlockStack,
  Box,
  Tooltip,
  ProgressBar
} from '@shopify/polaris';
import {
  EditIcon,
  DeleteIcon,
  ViewIcon,
  DuplicateIcon
} from '@shopify/polaris-icons';

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  allergens?: string[];
}

export interface Recipe {
  id: string;
  handle: string;
  fields: {
    name: string;
    description?: string;
    category: string;
    yield_quantity: number;
    yield_unit: string;
    prep_time_minutes?: number;
    cook_time_minutes?: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    is_active: boolean;
    created_at: string;
    last_updated: string;
    notes?: string;
  };
  ingredients: RecipeIngredient[];
  total_cost: number;
  cost_per_unit: number;
  allergens: string[];
}

interface RecipeCardProps {
  recipe: Recipe;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  onView?: (recipe: Recipe) => void;
  onDuplicate?: (recipe: Recipe) => void;
  compact?: boolean;
  showCostBreakdown?: boolean;
}

export function RecipeCard({
  recipe,
  onEdit,
  onDelete,
  onView,
  onDuplicate,
  compact = false,
  showCostBreakdown = true
}: RecipeCardProps) {
  const { fields, ingredients, total_cost, cost_per_unit, allergens } = recipe;
  const isExpensive = cost_per_unit > 20;
  const isInactive = !fields.is_active;
  const totalTime = (fields.prep_time_minutes || 0) + (fields.cook_time_minutes || 0);
  const ingredientCount = ingredients.length;

  const difficultyColor = {
    'Easy': 'success',
    'Medium': 'attention', 
    'Hard': 'critical'
  } as const;

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header with name and status */}
        <InlineStack align="space-between" blockAlign="start">
          <BlockStack gap="200">
            <Text variant="headingMd" as="h3">
              {fields.name}
            </Text>
            <InlineStack gap="200">
              <Badge tone={isInactive ? 'critical' : 'success'}>
                {isInactive ? 'Inactive' : 'Active'}
              </Badge>
              <Badge tone={difficultyColor[fields.difficulty]}>
                {fields.difficulty}
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
              <Tooltip content="View recipe">
                <Button
                  icon={ViewIcon}
                  variant="tertiary"
                  onClick={() => onView(recipe)}
                />
              </Tooltip>
            )}
            {onDuplicate && (
              <Tooltip content="Duplicate recipe">
                <Button
                  icon={DuplicateIcon}
                  variant="tertiary"
                  onClick={() => onDuplicate(recipe)}
                />
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip content="Edit recipe">
                <Button
                  icon={EditIcon}
                  variant="tertiary"
                  onClick={() => onEdit(recipe)}
                />
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip content="Delete recipe">
                <Button
                  icon={DeleteIcon}
                  variant="tertiary"
                  tone="critical"
                  onClick={() => onDelete(recipe)}
                />
              </Tooltip>
            )}
          </InlineStack>
        </InlineStack>

        {/* Main content */}
        {!compact && (
          <BlockStack gap="300">
            {/* Description */}
            {fields.description && (
              <Box>
                <Text variant="bodyMd" as="p">{fields.description}</Text>
              </Box>
            )}

            {/* Recipe info */}
            <InlineStack gap="400" wrap>
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Category</Text>
                <Text variant="bodyMd" as="p">{fields.category}</Text>
              </Box>
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Yield</Text>
                <Text variant="bodyMd" as="p">{fields.yield_quantity} {fields.yield_unit}</Text>
              </Box>
              {totalTime > 0 && (
                <Box>
                  <Text variant="bodyMd" as="p" tone="subdued">Total Time</Text>
                  <Text variant="bodyMd" as="p">{formatTime(totalTime)}</Text>
                </Box>
              )}
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Ingredients</Text>
                <Text variant="bodyMd" as="p">{ingredientCount} items</Text>
              </Box>
            </InlineStack>

            {/* Cost breakdown */}
            {showCostBreakdown && (
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" tone="subdued">Cost Analysis</Text>
                <InlineStack gap="400" wrap>
                  <Box>
                    <Text variant="bodyMd" as="p" tone="subdued">Total Cost</Text>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      {formatCurrency(total_cost)}
                    </Text>
                  </Box>
                  <Box>
                    <Text variant="bodyMd" as="p" tone="subdued">Cost per {fields.yield_unit}</Text>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      {formatCurrency(cost_per_unit)}
                    </Text>
                  </Box>
                </InlineStack>
                
                {/* Top 3 expensive ingredients */}
                {ingredients.length > 0 && (
                  <Box>
                    <Text variant="bodyMd" as="p" tone="subdued">Top Cost Contributors</Text>
                    <BlockStack gap="100">
                      {ingredients
                        .sort((a, b) => (b.quantity * b.cost_per_unit) - (a.quantity * a.cost_per_unit))
                        .slice(0, 3)
                        .map((ingredient, index) => {
                          const ingredientCost = ingredient.quantity * ingredient.cost_per_unit;
                          const percentage = (ingredientCost / total_cost) * 100;
                          return (
                            <Box key={ingredient.id}>
                              <InlineStack align="space-between">
                                <Text variant="bodySm" as="p">{ingredient.name}</Text>
                                <Text variant="bodySm" as="p">{formatCurrency(ingredientCost)} ({percentage.toFixed(1)}%)</Text>
                              </InlineStack>
                              <ProgressBar progress={percentage} size="small" />
                            </Box>
                          );
                        })}
                    </BlockStack>
                  </Box>
                )}
              </BlockStack>
            )}

            {/* Allergens */}
            {allergens && allergens.length > 0 && (
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Allergens</Text>
                <InlineStack gap="200">
                  {allergens.map((allergen) => (
                    <Badge key={allergen} tone="warning">
                      {allergen}
                    </Badge>
                  ))}
                </InlineStack>
              </Box>
            )}

            {/* Notes */}
            {fields.notes && (
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Notes</Text>
                <Text variant="bodyMd" as="p">{fields.notes}</Text>
              </Box>
            )}

            {/* Last updated */}
            <Box>
              <Text variant="bodySm" as="p" tone="subdued">
                Last updated: {new Date(fields.last_updated).toLocaleDateString()}
              </Text>
            </Box>
          </BlockStack>
        )}

        {/* Compact view */}
        {compact && (
          <InlineStack gap="400" align="space-between">
            <BlockStack gap="100">
              <Text variant="bodyMd" as="p">{fields.category} • {ingredientCount} ingredients</Text>
              <Text variant="bodyMd" as="p" fontWeight="semibold">
                {formatCurrency(cost_per_unit)} per {fields.yield_unit}
              </Text>
              {totalTime > 0 && (
                <Text variant="bodySm" as="p" tone="subdued">{formatTime(totalTime)}</Text>
              )}
            </BlockStack>
            {allergens && allergens.length > 0 && (
              <InlineStack gap="100">
                {allergens.slice(0, 2).map((allergen) => (
                  <Badge key={allergen} tone="warning" size="small">
                    {allergen}
                  </Badge>
                ))}
                {allergens.length > 2 && (
                  <Badge tone="warning" size="small">
                    {`+${allergens.length - 2}`}
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