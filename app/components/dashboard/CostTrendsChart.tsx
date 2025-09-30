import React, { useState, useMemo } from 'react';
import {
  Card,
  Text,
  InlineStack,
  BlockStack,
  Select,
  Button,
  Badge,
  Box,
  DataTable,
  ProgressBar,
  Tooltip,
  Icon
} from '@shopify/polaris';
import {
  InfoIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CalendarIcon
} from '@shopify/polaris-icons';

export interface CostTrendData {
  recipe_id: string;
  recipe_name: string;
  category: string;
  dates: string[];
  costs: number[];
  ingredients_changed: string[];
  cost_drivers: {
    ingredient_name: string;
    cost_change: number;
    percentage_impact: number;
  }[];
}

export interface TrendSummary {
  total_recipes: number;
  cost_increases: number;
  cost_decreases: number;
  avg_cost_change: number;
  biggest_increase: {
    recipe_name: string;
    amount: number;
    percentage: number;
  };
  biggest_decrease: {
    recipe_name: string;
    amount: number;
    percentage: number;
  };
}

interface CostTrendsChartProps {
  trendData: CostTrendData[];
  summary: TrendSummary;
  timeFrame: '7d' | '30d' | '90d' | '1y';
  onTimeFrameChange?: (timeFrame: '7d' | '30d' | '90d' | '1y') => void;
  onExport?: () => void;
  loading?: boolean;
}

type SortBy = 'name' | 'change' | 'percentage' | 'category';
type FilterBy = 'all' | 'increased' | 'decreased' | 'stable';

export function CostTrendsChart({
  trendData,
  summary,
  timeFrame,
  onTimeFrameChange,
  onExport,
  loading = false
}: CostTrendsChartProps) {
  const [sortBy, setSortBy] = useState<SortBy>('change');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(trendData.map(item => item.category))];
    return ['all', ...uniqueCategories.sort()];
  }, [trendData]);

  // Calculate cost changes for each recipe
  const enrichedData = useMemo(() => {
    return trendData.map(item => {
      if (item.dates.length < 2 || item.costs.length < 2) {
        return {
          ...item,
          cost_change: 0,
          percentage_change: 0,
          trend: 'stable' as const,
          latest_cost: item.costs[item.costs.length - 1] || 0,
          previous_cost: item.costs[0] || 0
        };
      }

      const latestCost = item.costs[item.costs.length - 1];
      const previousCost = item.costs[0];
      const cost_change = latestCost - previousCost;
      const percentage_change = previousCost > 0 ? (cost_change / previousCost) * 100 : 0;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(percentage_change) > 2) {
        trend = percentage_change > 0 ? 'up' : 'down';
      }

      return {
        ...item,
        cost_change,
        percentage_change,
        trend,
        latest_cost: latestCost,
        previous_cost: previousCost
      };
    });
  }, [trendData]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = enrichedData;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by trend
    switch (filterBy) {
      case 'increased':
        filtered = filtered.filter(item => item.trend === 'up');
        break;
      case 'decreased':
        filtered = filtered.filter(item => item.trend === 'down');
        break;
      case 'stable':
        filtered = filtered.filter(item => item.trend === 'stable');
        break;
    }

    // Sort data
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.recipe_name.localeCompare(b.recipe_name);
        case 'change':
          return Math.abs(b.cost_change) - Math.abs(a.cost_change);
        case 'percentage':
          return Math.abs(b.percentage_change) - Math.abs(a.percentage_change);
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });
  }, [enrichedData, filterBy, sortBy, selectedCategory]);

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return ChevronUpIcon;
      case 'down': return ChevronDownIcon;
      default: return null;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'critical';
      case 'down': return 'success';
      default: return 'subdued';
    }
  };

  // Build data table rows
  const tableRows = filteredData.map((item) => {
    const trendIcon = getTrendIcon(item.trend);
    const changeColor = item.cost_change > 0 ? 'critical' : item.cost_change < 0 ? 'success' : 'subdued';

    return [
      <BlockStack key={`name-${item.recipe_id}`} gap="100">
        <Text variant="bodyMd" as="p" fontWeight="semibold">{item.recipe_name}</Text>
        <Text variant="bodySm" as="p" tone="subdued">{item.category}</Text>
      </BlockStack>,

      <InlineStack key={`costs-${item.recipe_id}`} gap="200">
        <BlockStack gap="100">
          <Text variant="bodySm" as="p" tone="subdued">Previous</Text>
          <Text variant="bodyMd" as="p">
            {formatCurrency(item.previous_cost)}
          </Text>
        </BlockStack>
        <BlockStack gap="100">
          <Text variant="bodySm" as="p" tone="subdued">Current</Text>
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            {formatCurrency(item.latest_cost)}
          </Text>
        </BlockStack>
      </InlineStack>,

      <InlineStack key={`change-${item.recipe_id}`} gap="200">
        <InlineStack gap="100">
          {trendIcon && <Icon source={trendIcon} tone={getTrendColor(item.trend)} />}
          <BlockStack gap="050">
            <Text variant="bodyMd" as="p" tone={changeColor as any} fontWeight="semibold">
              {item.cost_change !== 0 ? formatCurrency(Math.abs(item.cost_change)) : '-'}
            </Text>
            <Text variant="bodySm" as="p" tone={changeColor as any}>
              {item.percentage_change !== 0 ? formatPercentage(item.percentage_change) : 'No change'}
            </Text>
          </BlockStack>
        </InlineStack>
      </InlineStack>,

      <BlockStack key={`drivers-${item.recipe_id}`} gap="100">
        {item.cost_drivers.slice(0, 2).map((driver, index) => (
          <InlineStack key={index} gap="100" align="space-between">
            <Text variant="bodySm" as="p">{driver.ingredient_name}</Text>
            <Text variant="bodySm" as="p" tone={driver.cost_change > 0 ? "critical" : "success"}>
              {formatCurrency(Math.abs(driver.cost_change))}
            </Text>
          </InlineStack>
        ))}
        {item.cost_drivers.length > 2 && (
          <Text variant="bodySm" as="p" tone="subdued">
            +{item.cost_drivers.length - 2} more
          </Text>
        )}
      </BlockStack>,

      <Box key={`impact-${item.recipe_id}`}>
        <ProgressBar 
          progress={Math.min(100, Math.abs(item.percentage_change))} 
          size="small" 
          tone={item.percentage_change > 0 ? "critical" : "success"}
        />
        <Text variant="bodySm" as="p" alignment="center">
          {Math.abs(item.percentage_change).toFixed(1)}% impact
        </Text>
      </Box>
    ];
  });

  const timeFrameOptions = [
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 90 days', value: '90d' },
    { label: 'Last year', value: '1y' }
  ];

  return (
    <BlockStack gap="400">
      {/* Summary Cards */}
      <InlineStack gap="400" wrap>
        <Card>
          <BlockStack gap="200">
            <InlineStack gap="200">
              <Icon source={CalendarIcon} />
              <Text variant="bodyMd" as="p" tone="subdued">Time Period</Text>
            </InlineStack>
            <Text variant="headingMd" as="h3">
              {timeFrameOptions.find(opt => opt.value === timeFrame)?.label}
            </Text>
            <Text variant="bodySm" as="p" tone="subdued">
              {summary.total_recipes} recipes tracked
            </Text>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <InlineStack gap="200">
              <Icon source={ChevronUpIcon} tone="critical" />
              <Text variant="bodyMd" as="p" tone="subdued">Cost Increases</Text>
            </InlineStack>
            <Text variant="headingMd" as="h3" tone="critical">
              {summary.cost_increases}
            </Text>
            <Text variant="bodySm" as="p" tone="subdued">
              recipes with higher costs
            </Text>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <InlineStack gap="200">
              <Icon source={ChevronDownIcon} tone="success" />
              <Text variant="bodyMd" as="p" tone="subdued">Cost Decreases</Text>
            </InlineStack>
            <Text variant="headingMd" as="h3" tone="success">
              {summary.cost_decreases}
            </Text>
            <Text variant="bodySm" as="p" tone="subdued">
              recipes with lower costs
            </Text>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text variant="bodyMd" as="p" tone="subdued">Average Change</Text>
            <Text 
              variant="headingMd" 
              as="h3" 
              tone={summary.avg_cost_change > 0 ? "critical" : "success"}
            >
              {formatPercentage(summary.avg_cost_change)}
            </Text>
            <Text variant="bodySm" as="p" tone="subdued">
              across all recipes
            </Text>
          </BlockStack>
        </Card>
      </InlineStack>

      {/* Biggest Changes Highlight */}
      {(summary.biggest_increase.amount !== 0 || summary.biggest_decrease.amount !== 0) && (
        <InlineStack gap="400" wrap>
          {summary.biggest_increase.amount > 0 && (
            <Card>
              <BlockStack gap="200">
                <InlineStack gap="200">
                  <Icon source={ChevronUpIcon} tone="critical" />
                  <Text variant="bodyMd" as="p" tone="subdued">Biggest Increase</Text>
                </InlineStack>
                <Text variant="headingSm" as="h4">{summary.biggest_increase.recipe_name}</Text>
                <Text variant="bodyLg" as="p" tone="critical" fontWeight="semibold">
                  +{formatCurrency(summary.biggest_increase.amount)}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  {formatPercentage(summary.biggest_increase.percentage)} increase
                </Text>
              </BlockStack>
            </Card>
          )}

          {summary.biggest_decrease.amount < 0 && (
            <Card>
              <BlockStack gap="200">
                <InlineStack gap="200">
                  <Icon source={ChevronDownIcon} tone="success" />
                  <Text variant="bodyMd" as="p" tone="subdued">Biggest Decrease</Text>
                </InlineStack>
                <Text variant="headingSm" as="h4">{summary.biggest_decrease.recipe_name}</Text>
                <Text variant="bodyLg" as="p" tone="success" fontWeight="semibold">
                  {formatCurrency(summary.biggest_decrease.amount)}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  {formatPercentage(summary.biggest_decrease.percentage)} decrease
                </Text>
              </BlockStack>
            </Card>
          )}
        </InlineStack>
      )}

      {/* Filters and Controls */}
      <Card>
        <InlineStack gap="300" wrap>
          <Select
            label="Time Frame"
            options={timeFrameOptions}
            value={timeFrame}
            onChange={(value) => onTimeFrameChange?.(value as '7d' | '30d' | '90d' | '1y')}
          />

          <Select
            label="Category"
            options={categories.map(cat => ({
              label: cat === 'all' ? 'All Categories' : cat,
              value: cat
            }))}
            value={selectedCategory}
            onChange={setSelectedCategory}
          />

          <Select
            label="Filter by"
            options={[
              { label: 'All Changes', value: 'all' },
              { label: 'Cost Increased', value: 'increased' },
              { label: 'Cost Decreased', value: 'decreased' },
              { label: 'Stable Costs', value: 'stable' }
            ]}
            value={filterBy}
            onChange={(value) => setFilterBy(value as FilterBy)}
          />

          <Select
            label="Sort by"
            options={[
              { label: 'Biggest Change', value: 'change' },
              { label: 'Recipe Name', value: 'name' },
              { label: 'Percentage Change', value: 'percentage' },
              { label: 'Category', value: 'category' }
            ]}
            value={sortBy}
            onChange={(value) => setSortBy(value as SortBy)}
          />
        </InlineStack>
      </Card>

      {/* Cost Trends Table */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text variant="headingMd" as="h3">
              Cost Trends ({filteredData.length} recipes)
            </Text>
            {onExport && (
              <Button onClick={onExport}>
                Export Trends
              </Button>
            )}
          </InlineStack>

          {filteredData.length > 0 ? (
            <DataTable
              columnContentTypes={[
                'text', 'text', 'text', 'text', 'text'
              ]}
              headings={[
                'Recipe',
                'Cost Comparison',
                'Change',
                'Cost Drivers',
                'Impact'
              ]}
              rows={tableRows}
            />
          ) : (
            <Box padding="400">
              <Text variant="bodyMd" as="p" alignment="center" tone="subdued">
                No cost trend data available for the selected filters.
              </Text>
            </Box>
          )}

          {/* Insights */}
          {filteredData.length > 0 && (
            <Box padding="300" background="bg-surface-secondary">
              <BlockStack gap="200">
                <Text variant="headingSm" as="h4">Key Insights</Text>
                <InlineStack gap="400" wrap>
                  <Box>
                    <Text variant="bodySm" as="p" tone="subdued">Recipes with cost increases</Text>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      {filteredData.filter(item => item.trend === 'up').length}
                    </Text>
                  </Box>
                  <Box>
                    <Text variant="bodySm" as="p" tone="subdued">Average cost change</Text>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      {formatPercentage(
                        filteredData.reduce((sum, item) => sum + item.percentage_change, 0) / filteredData.length
                      )}
                    </Text>
                  </Box>
                  <Box>
                    <Text variant="bodySm" as="p" tone="subdued">Most affected category</Text>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      {categories.find(cat => cat !== 'all') || 'N/A'}
                    </Text>
                  </Box>
                </InlineStack>
              </BlockStack>
            </Box>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}