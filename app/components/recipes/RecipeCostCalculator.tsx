import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  DataTable,
  Divider,
  Badge,
  Box,
  ProgressBar,
  Select,
  Tooltip,
  Icon,
  Banner
} from '@shopify/polaris';
import {
  InfoIcon,
  AlertTriangleIcon
} from '@shopify/polaris-icons';

export interface CostIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  waste_percentage?: number;
  allergens?: string[];
}

export interface CostCalculation {
  ingredient_cost: number;
  labor_cost: number;
  overhead_cost: number;
  packaging_cost: number;
  total_cost: number;
  cost_per_unit: number;
  profit_margin_percentage: number;
  suggested_price: number;
  break_even_price: number;
}

interface RecipeCostCalculatorProps {
  ingredients: CostIngredient[];
  yieldQuantity: number;
  yieldUnit: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  onCalculationChange?: (calculation: CostCalculation) => void;
  laborRatePerHour?: number;
  overheadPercentage?: number;
  targetProfitMargin?: number;
  packagingCostPerUnit?: number;
}

const DEFAULT_LABOR_RATE = 15.00;
const DEFAULT_OVERHEAD_PERCENTAGE = 25;
const DEFAULT_TARGET_PROFIT_MARGIN = 40;
const DEFAULT_PACKAGING_COST = 0.50;

export function RecipeCostCalculator({
  ingredients,
  yieldQuantity,
  yieldUnit,
  prepTimeMinutes = 0,
  cookTimeMinutes = 0,
  onCalculationChange,
  laborRatePerHour = DEFAULT_LABOR_RATE,
  overheadPercentage = DEFAULT_OVERHEAD_PERCENTAGE,
  targetProfitMargin = DEFAULT_TARGET_PROFIT_MARGIN,
  packagingCostPerUnit = DEFAULT_PACKAGING_COST
}: RecipeCostCalculatorProps) {
  const [settings, setSettings] = useState({
    laborRate: laborRatePerHour,
    overheadPercentage,
    targetProfitMargin,
    packagingCost: packagingCostPerUnit,
    wastageIncluded: true
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate ingredient costs with optional wastage
  const ingredientCosts = useMemo(() => {
    return ingredients.map(ingredient => {
      const baseCost = ingredient.quantity * ingredient.cost_per_unit;
      const wasteMultiplier = settings.wastageIncluded && ingredient.waste_percentage 
        ? 1 + (ingredient.waste_percentage / 100)
        : 1;
      const totalCost = baseCost * wasteMultiplier;
      const percentage = 0; // Will be calculated after total is known
      
      return {
        ...ingredient,
        base_cost: baseCost,
        waste_cost: totalCost - baseCost,
        total_cost: totalCost,
        percentage
      };
    });
  }, [ingredients, settings.wastageIncluded]);

  // Calculate total costs
  const calculation = useMemo(() => {
    const ingredient_cost = ingredientCosts.reduce((sum, item) => sum + item.total_cost, 0);
    
    // Labor cost calculation
    const totalTimeHours = (prepTimeMinutes + cookTimeMinutes) / 60;
    const labor_cost = totalTimeHours * settings.laborRate;
    
    // Overhead cost calculation (percentage of ingredient + labor cost)
    const base_cost = ingredient_cost + labor_cost;
    const overhead_cost = base_cost * (settings.overheadPercentage / 100);
    
    // Packaging cost
    const packaging_cost = settings.packagingCost * yieldQuantity;
    
    // Total cost
    const total_cost = ingredient_cost + labor_cost + overhead_cost + packaging_cost;
    
    // Cost per unit
    const cost_per_unit = yieldQuantity > 0 ? total_cost / yieldQuantity : 0;
    
    // Profit margin calculation
    const profit_margin_percentage = settings.targetProfitMargin;
    const markup_multiplier = 1 + (profit_margin_percentage / 100);
    const suggested_price = cost_per_unit * markup_multiplier;
    
    // Break-even price (cost + minimal profit)
    const break_even_price = cost_per_unit * 1.1; // 10% minimum margin
    
    return {
      ingredient_cost,
      labor_cost,
      overhead_cost,
      packaging_cost,
      total_cost,
      cost_per_unit,
      profit_margin_percentage,
      suggested_price,
      break_even_price
    } as CostCalculation;
  }, [ingredientCosts, prepTimeMinutes, cookTimeMinutes, settings, yieldQuantity]);

  // Update ingredient cost percentages
  const enrichedIngredientCosts = useMemo(() => {
    return ingredientCosts.map(item => ({
      ...item,
      percentage: calculation.ingredient_cost > 0 
        ? (item.total_cost / calculation.ingredient_cost) * 100 
        : 0
    }));
  }, [ingredientCosts, calculation.ingredient_cost]);

  // Notify parent of calculation changes
  React.useEffect(() => {
    onCalculationChange?.(calculation);
  }, [calculation, onCalculationChange]);

  const handleSettingChange = useCallback((field: keyof typeof settings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  }, []);

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  // Cost breakdown for display
  const costBreakdown = [
    {
      category: 'Ingredients',
      amount: calculation.ingredient_cost,
      percentage: (calculation.ingredient_cost / calculation.total_cost) * 100,
      color: 'bg-primary'
    },
    {
      category: 'Labor',
      amount: calculation.labor_cost,
      percentage: (calculation.labor_cost / calculation.total_cost) * 100,
      color: 'bg-success'
    },
    {
      category: 'Overhead',
      amount: calculation.overhead_cost,
      percentage: (calculation.overhead_cost / calculation.total_cost) * 100,
      color: 'bg-warning'
    },
    {
      category: 'Packaging',
      amount: calculation.packaging_cost,
      percentage: (calculation.packaging_cost / calculation.total_cost) * 100,
      color: 'bg-info'
    }
  ];

  // Ingredient detail rows for DataTable
  const ingredientRows = enrichedIngredientCosts
    .sort((a, b) => b.total_cost - a.total_cost)
    .map((item) => [
      item.name,
      `${item.quantity} ${item.unit}`,
      formatCurrency(item.cost_per_unit),
      formatCurrency(item.base_cost),
      item.waste_percentage && settings.wastageIncluded 
        ? `${item.waste_percentage}% (${formatCurrency(item.waste_cost)})`
        : '-',
      formatCurrency(item.total_cost),
      <div key={`progress-${item.id}`} style={{ minWidth: '60px' }}>
        <ProgressBar progress={item.percentage} size="small" />
        <Text variant="bodySm" as="p" alignment="center">
          {formatPercentage(item.percentage)}
        </Text>
      </div>
    ]);

  const isProfitable = calculation.suggested_price > calculation.cost_per_unit;
  const isHighCost = calculation.cost_per_unit > 20;

  return (
    <BlockStack gap="400">
      {/* Cost Summary Card */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text variant="headingMd" as="h3">Cost Calculator</Text>
            <Button
              variant="tertiary"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Hide' : 'Show'} Settings
            </Button>
          </InlineStack>

          {/* Settings Panel */}
          {showAdvanced && (
            <Box padding="300" background="bg-surface-secondary">
              <BlockStack gap="300">
                <Text variant="headingSm" as="h4">Calculation Settings</Text>
                
                <InlineStack gap="300" wrap>
                  <TextField
                    label="Labor Rate ($/hour)"
                    type="number"
                    value={settings.laborRate.toString()}
                    onChange={(value) => handleSettingChange('laborRate', parseFloat(value) || 0)}
                    step={0.25}
                    min={0}
                    prefix="$"
                    autoComplete="off"
                  />
                  
                  <TextField
                    label="Overhead (%)"
                    type="number"
                    value={settings.overheadPercentage.toString()}
                    onChange={(value) => handleSettingChange('overheadPercentage', parseFloat(value) || 0)}
                    min={0}
                    max={100}
                    suffix="%"
                    autoComplete="off"
                  />
                  
                  <TextField
                    label="Target Profit Margin (%)"
                    type="number"
                    value={settings.targetProfitMargin.toString()}
                    onChange={(value) => handleSettingChange('targetProfitMargin', parseFloat(value) || 0)}
                    min={0}
                    max={200}
                    suffix="%"
                    autoComplete="off"
                  />
                  
                  <TextField
                    label={`Packaging Cost (per ${yieldUnit})`}
                    type="number"
                    value={settings.packagingCost.toString()}
                    onChange={(value) => handleSettingChange('packagingCost', parseFloat(value) || 0)}
                    step={0.01}
                    min={0}
                    prefix="$"
                    autoComplete="off"
                  />
                </InlineStack>
              </BlockStack>
            </Box>
          )}

          {/* Cost Breakdown Visualization */}
          <BlockStack gap="300">
            <Text variant="headingSm" as="h4">Cost Breakdown</Text>
            
            <BlockStack gap="200">
              {costBreakdown.map((item, index) => (
                <InlineStack key={index} align="space-between">
                  <InlineStack gap="200">
                    <div 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        backgroundColor: `var(--p-color-${item.color})`,
                        borderRadius: '2px'
                      }} 
                    />
                    <Text variant="bodyMd" as="p">{item.category}</Text>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      {formatCurrency(item.amount)}
                    </Text>
                    <Text variant="bodyMd" as="p" tone="subdued">
                      ({formatPercentage(item.percentage)})
                    </Text>
                  </InlineStack>
                </InlineStack>
              ))}
            </BlockStack>

            <Divider />

            {/* Total Cost Summary */}
            <InlineStack align="space-between">
              <Text variant="bodyLg" as="p" fontWeight="semibold">
                Total Recipe Cost
              </Text>
              <Text variant="bodyLg" as="p" fontWeight="semibold">
                {formatCurrency(calculation.total_cost)}
              </Text>
            </InlineStack>

            <InlineStack align="space-between">
              <Text variant="bodyLg" as="p" fontWeight="semibold">
                Cost per {yieldUnit}
              </Text>
              <Text variant="bodyLg" as="p" fontWeight="semibold">
                {formatCurrency(calculation.cost_per_unit)}
              </Text>
            </InlineStack>
          </BlockStack>
        </BlockStack>
      </Card>

      {/* Pricing Recommendations */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">Pricing Analysis</Text>
          
          <InlineStack gap="400" wrap>
            <Box>
              <Text variant="bodyMd" as="p" tone="subdued">Break-even Price</Text>
              <Text variant="headingMd" as="h4">
                {formatCurrency(calculation.break_even_price)}
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                Minimum viable price
              </Text>
            </Box>
            
            <Box>
              <Text variant="bodyMd" as="p" tone="subdued">Suggested Price</Text>
              <Text variant="headingMd" as="h4" tone={isProfitable ? "success" : "critical"}>
                {formatCurrency(calculation.suggested_price)}
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                {formatPercentage(calculation.profit_margin_percentage)} profit margin
              </Text>
            </Box>
            
            <Box>
              <Text variant="bodyMd" as="p" tone="subdued">Profit per {yieldUnit}</Text>
              <Text variant="headingMd" as="h4">
                {formatCurrency(calculation.suggested_price - calculation.cost_per_unit)}
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                At suggested price
              </Text>
            </Box>
          </InlineStack>

          {/* Alerts and Warnings */}
          {(isHighCost || !isProfitable) && (
            <BlockStack gap="200">
              {isHighCost && (
                <Banner tone="warning">
                  <InlineStack gap="200">
                    <Icon source={AlertTriangleIcon} />
                    <Text variant="bodyMd" as="p">
                      High cost per unit detected. Consider reviewing ingredient quantities or sourcing.
                    </Text>
                  </InlineStack>
                </Banner>
              )}
              
              {!isProfitable && (
                <Banner tone="critical">
                  <InlineStack gap="200">
                    <Icon source={AlertTriangleIcon} />
                    <Text variant="bodyMd" as="p">
                      Current pricing may not be profitable. Consider adjusting costs or pricing strategy.
                    </Text>
                  </InlineStack>
                </Banner>
              )}
            </BlockStack>
          )}
        </BlockStack>
      </Card>

      {/* Ingredient Cost Detail */}
      {ingredients.length > 0 && (
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h3">Ingredient Cost Breakdown</Text>
              <Tooltip content="Ingredients sorted by cost impact">
                <Icon source={InfoIcon} />
              </Tooltip>
            </InlineStack>
            
            <DataTable
              columnContentTypes={['text', 'text', 'numeric', 'numeric', 'text', 'numeric', 'text']}
              headings={[
                'Ingredient',
                'Quantity',
                'Unit Cost',
                'Base Cost',
                'Wastage',
                'Total Cost',
                'Impact'
              ]}
              rows={ingredientRows}
            />
            
            <Box padding="200" background="bg-surface-secondary">
              <Text variant="bodySm" as="p" tone="subdued">
                Total ingredient cost: {formatCurrency(calculation.ingredient_cost)} 
                ({formatPercentage((calculation.ingredient_cost / calculation.total_cost) * 100)} of total recipe cost)
              </Text>
            </Box>
          </BlockStack>
        </Card>
      )}

      {/* Time Analysis */}
      {(prepTimeMinutes > 0 || cookTimeMinutes > 0) && (
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h3">Time & Labor Analysis</Text>
            
            <InlineStack gap="400" wrap>
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Prep Time</Text>
                <Text variant="bodyMd" as="p">{prepTimeMinutes} minutes</Text>
              </Box>
              
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Cook Time</Text>
                <Text variant="bodyMd" as="p">{cookTimeMinutes} minutes</Text>
              </Box>
              
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Total Time</Text>
                <Text variant="bodyMd" as="p" fontWeight="semibold">
                  {prepTimeMinutes + cookTimeMinutes} minutes ({((prepTimeMinutes + cookTimeMinutes) / 60).toFixed(1)} hours)
                </Text>
              </Box>
              
              <Box>
                <Text variant="bodyMd" as="p" tone="subdued">Labor Cost</Text>
                <Text variant="bodyMd" as="p" fontWeight="semibold">
                  {formatCurrency(calculation.labor_cost)}
                </Text>
              </Box>
            </InlineStack>
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}