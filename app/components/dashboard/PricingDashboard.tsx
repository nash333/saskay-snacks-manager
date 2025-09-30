import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  InlineStack,
  BlockStack,
  Select,
  Button,
  Badge,
  Box,
  Divider,
  DataTable,
  Banner,
  Tooltip,
  Icon,
  ProgressBar,
  ButtonGroup
} from '@shopify/polaris';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  InfoIcon,
  ExportIcon,
  RefreshIcon,
  AlertTriangleIcon
} from '@shopify/polaris-icons';
import { markPerformance, usePerformanceMarking } from '../../lib/performance';

export interface PricingData {
  recipe_id: string;
  recipe_name: string;
  category: string;
  current_cost: number;
  suggested_price: number;
  current_price?: number;
  profit_margin: number;
  competitor_price?: number;
  market_position: 'Below' | 'Competitive' | 'Premium';
  demand_trend: 'Up' | 'Stable' | 'Down';
  last_updated: string;
}

export interface PricingMetrics {
  total_recipes: number;
  avg_profit_margin: number;
  profitable_recipes: number;
  underpriced_recipes: number;
  overpriced_recipes: number;
  total_potential_revenue: number;
  revenue_opportunity: number;
}

interface PricingDashboardProps {
  pricingData: PricingData[];
  metrics: PricingMetrics;
  onRefresh?: () => void;
  onExport?: () => void;
  onUpdatePricing?: (recipeId: string, newPrice: number) => void;
  loading?: boolean;
}

type FilterBy = 'all' | 'underpriced' | 'overpriced' | 'competitive' | 'no-price';
type SortBy = 'name' | 'margin' | 'opportunity' | 'category' | 'trend';
type TimeFrame = '7d' | '30d' | '90d' | '1y';

export function PricingDashboard({
  pricingData,
  metrics,
  onRefresh,
  onExport,
  onUpdatePricing,
  loading = false
}: PricingDashboardProps) {
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [sortBy, setSortBy] = useState<SortBy>('opportunity');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('30d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Performance tracking
  const performanceMarking = usePerformanceMarking();
  
  useEffect(() => {
    // Mark dashboard first render
    markPerformance('dashboard-first-render');
    
    // Mark pricing panel render completion
    const timer = setTimeout(() => {
      markPerformance('pricing-panel-render');
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(pricingData.map(item => item.category))];
    return ['all', ...uniqueCategories.sort()];
  }, [pricingData]);

  // Filter and sort pricing data
  const filteredData = useMemo(() => {
    let filtered = pricingData;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by pricing status
    switch (filterBy) {
      case 'underpriced':
        filtered = filtered.filter(item => 
          !item.current_price || item.current_price < item.suggested_price * 0.9
        );
        break;
      case 'overpriced':
        filtered = filtered.filter(item => 
          item.current_price && item.current_price > item.suggested_price * 1.2
        );
        break;
      case 'competitive':
        filtered = filtered.filter(item => item.market_position === 'Competitive');
        break;
      case 'no-price':
        filtered = filtered.filter(item => !item.current_price);
        break;
    }

    // Sort data
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.recipe_name.localeCompare(b.recipe_name);
        case 'margin':
          return b.profit_margin - a.profit_margin;
        case 'opportunity':
          const aOpportunity = a.current_price 
            ? (a.suggested_price - a.current_price) 
            : a.suggested_price - a.current_cost;
          const bOpportunity = b.current_price 
            ? (b.suggested_price - b.current_price) 
            : b.suggested_price - b.current_cost;
          return bOpportunity - aOpportunity;
        case 'category':
          return a.category.localeCompare(b.category);
        case 'trend':
          const trendOrder = { 'Up': 3, 'Stable': 2, 'Down': 1 };
          return trendOrder[b.demand_trend] - trendOrder[a.demand_trend];
        default:
          return 0;
      }
    });
  }, [pricingData, filterBy, sortBy, selectedCategory]);

  // Calculate insights
  const insights = useMemo(() => {
    const totalOpportunity = filteredData.reduce((sum, item) => {
      const opportunity = item.current_price 
        ? Math.max(0, item.suggested_price - item.current_price)
        : item.suggested_price - item.current_cost;
      return sum + opportunity;
    }, 0);

    const highMarginRecipes = filteredData.filter(item => item.profit_margin > 40).length;
    const lowMarginRecipes = filteredData.filter(item => item.profit_margin < 20).length;
    const trendingUp = filteredData.filter(item => item.demand_trend === 'Up').length;

    return {
      totalOpportunity,
      highMarginRecipes,
      lowMarginRecipes,
      trendingUp,
      avgMargin: filteredData.length > 0 
        ? filteredData.reduce((sum, item) => sum + item.profit_margin, 0) / filteredData.length
        : 0
    };
  }, [filteredData]);

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'Up': return ChevronUpIcon;
      case 'Down': return ChevronDownIcon;
      default: return null;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'Up': return 'success';
      case 'Down': return 'critical';
      default: return 'subdued';
    }
  };

  const getMarketPositionColor = (position: string) => {
    switch (position) {
      case 'Below': return 'critical';
      case 'Competitive': return 'success';
      case 'Premium': return 'warning';
      default: return 'subdued';
    }
  };

  // Build data table rows
  const tableRows = filteredData.map((item) => {
    const opportunity = item.current_price 
      ? Math.max(0, item.suggested_price - item.current_price)
      : item.suggested_price - item.current_cost;
    
    const marginColor = item.profit_margin > 40 ? 'success' : 
                       item.profit_margin > 20 ? 'warning' : 'critical';

    const trendIcon = getTrendIcon(item.demand_trend);

    return [
      <BlockStack key={`name-${item.recipe_id}`} gap="100">
        <Text variant="bodyMd" as="p" fontWeight="semibold">{item.recipe_name}</Text>
        <Text variant="bodySm" as="p" tone="subdued">{item.category}</Text>
      </BlockStack>,
      
      <InlineStack key={`pricing-${item.recipe_id}`} gap="200">
        <BlockStack gap="100">
          <Text variant="bodySm" as="p" tone="subdued">Current</Text>
          <Text variant="bodyMd" as="p">
            {item.current_price ? formatCurrency(item.current_price) : 'Not set'}
          </Text>
        </BlockStack>
        <BlockStack gap="100">
          <Text variant="bodySm" as="p" tone="subdued">Suggested</Text>
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            {formatCurrency(item.suggested_price)}
          </Text>
        </BlockStack>
      </InlineStack>,

      <Badge key={`margin-${item.recipe_id}`} tone={marginColor}>
        {formatPercentage(item.profit_margin)}
      </Badge>,

      <InlineStack key={`trend-${item.recipe_id}`} gap="100">
        {trendIcon && <Icon source={trendIcon} tone={getTrendColor(item.demand_trend)} />}
        <Text 
          variant="bodyMd" 
          as="p" 
          tone={getTrendColor(item.demand_trend) as any}
        >
          {item.demand_trend}
        </Text>
      </InlineStack>,

      <Badge key={`position-${item.recipe_id}`} tone={getMarketPositionColor(item.market_position) as any}>
        {item.market_position}
      </Badge>,

      <Text key={`opportunity-${item.recipe_id}`} variant="bodyMd" as="p" fontWeight="semibold">
        {opportunity > 0 ? `+${formatCurrency(opportunity)}` : '-'}
      </Text>,

      <ButtonGroup key={`actions-${item.recipe_id}`} variant="segmented">
        <Tooltip content="Update pricing">
          <Button
            size="slim"
            onClick={() => {
              if (onUpdatePricing) {
                onUpdatePricing(item.recipe_id, item.suggested_price);
              }
            }}
          >
            Apply
          </Button>
        </Tooltip>
      </ButtonGroup>
    ];
  });

  return (
    <Page
      title="Pricing Dashboard"
      subtitle="Analyze pricing strategies and optimize profit margins"
      primaryAction={onRefresh ? {
        content: 'Refresh Data',
        icon: RefreshIcon,
        onAction: onRefresh,
        loading
      } : undefined}
      secondaryActions={onExport ? [
        {
          content: 'Export Report',
          icon: ExportIcon,
          onAction: onExport
        }
      ] : undefined}
    >
      <Layout>
        {/* Key Metrics Row */}
        <Layout.Section>
          <InlineStack gap="400" wrap>
            <Card>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" tone="subdued">Total Recipes</Text>
                <Text variant="headingLg" as="h3">{metrics.total_recipes}</Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  {metrics.profitable_recipes} profitable
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" tone="subdued">Avg Profit Margin</Text>
                <Text variant="headingLg" as="h3" tone={metrics.avg_profit_margin > 30 ? "success" : "critical"}>
                  {formatPercentage(metrics.avg_profit_margin)}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  Target: 35%+
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" tone="subdued">Revenue Opportunity</Text>
                <Text variant="headingLg" as="h3" tone="success">
                  {formatCurrency(metrics.revenue_opportunity)}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  Potential increase
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" tone="subdued">Pricing Issues</Text>
                <Text variant="headingLg" as="h3" tone="critical">
                  {metrics.underpriced_recipes + metrics.overpriced_recipes}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  Need attention
                </Text>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        {/* Insights and Alerts */}
        <Layout.Section>
          <BlockStack gap="300">
            {insights.totalOpportunity > 100 && (
              <Banner tone="info">
                <InlineStack gap="200">
                  <Icon source={InfoIcon} />
                  <Text variant="bodyMd" as="p">
                    Revenue opportunity of {formatCurrency(insights.totalOpportunity)} identified across {filteredData.length} recipes.
                  </Text>
                </InlineStack>
              </Banner>
            )}

            {insights.lowMarginRecipes > 0 && (
              <Banner tone="warning">
                <InlineStack gap="200">
                  <Icon source={AlertTriangleIcon} />
                  <Text variant="bodyMd" as="p">
                    {insights.lowMarginRecipes} recipes have profit margins below 20%. Consider cost optimization or price increases.
                  </Text>
                </InlineStack>
              </Banner>
            )}

            {insights.trendingUp > 0 && (
              <Banner tone="success">
                <InlineStack gap="200">
                  <Icon source={ChevronUpIcon} />
                  <Text variant="bodyMd" as="p">
                    {insights.trendingUp} recipes are trending up in demand. Consider premium pricing strategies.
                  </Text>
                </InlineStack>
              </Banner>
            )}
          </BlockStack>
        </Layout.Section>

        {/* Filters and Controls */}
        <Layout.Section>
          <Card>
            <InlineStack gap="300" wrap>
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
                  { label: 'All Recipes', value: 'all' },
                  { label: 'Underpriced', value: 'underpriced' },
                  { label: 'Overpriced', value: 'overpriced' },
                  { label: 'Competitive', value: 'competitive' },
                  { label: 'No Price Set', value: 'no-price' }
                ]}
                value={filterBy}
                onChange={(value) => setFilterBy(value as FilterBy)}
              />

              <Select
                label="Sort by"
                options={[
                  { label: 'Revenue Opportunity', value: 'opportunity' },
                  { label: 'Recipe Name', value: 'name' },
                  { label: 'Profit Margin', value: 'margin' },
                  { label: 'Category', value: 'category' },
                  { label: 'Demand Trend', value: 'trend' }
                ]}
                value={sortBy}
                onChange={(value) => setSortBy(value as SortBy)}
              />

              <Select
                label="Time Frame"
                options={[
                  { label: 'Last 7 days', value: '7d' },
                  { label: 'Last 30 days', value: '30d' },
                  { label: 'Last 90 days', value: '90d' },
                  { label: 'Last year', value: '1y' }
                ]}
                value={timeFrame}
                onChange={(value) => setTimeFrame(value as TimeFrame)}
              />
            </InlineStack>
          </Card>
        </Layout.Section>

        {/* Pricing Analysis Table */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h3">
                  Pricing Analysis ({filteredData.length} recipes)
                </Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  Showing {filteredData.length} of {pricingData.length} recipes
                </Text>
              </InlineStack>

              {filteredData.length > 0 ? (
                <DataTable
                  columnContentTypes={[
                    'text', 'text', 'text', 'text', 'text', 'numeric', 'text'
                  ]}
                  headings={[
                    'Recipe',
                    'Pricing',
                    'Margin',
                    'Trend', 
                    'Position',
                    'Opportunity',
                    'Actions'
                  ]}
                  rows={tableRows}
                />
              ) : (
                <Box padding="400">
                  <Text variant="bodyMd" as="p" alignment="center" tone="subdued">
                    No recipes match the current filters.
                  </Text>
                </Box>
              )}

              {/* Summary */}
              {filteredData.length > 0 && (
                <Box padding="300" background="bg-surface-secondary">
                  <InlineStack gap="400" wrap>
                    <Box>
                      <Text variant="bodySm" as="p" tone="subdued">Average Margin</Text>
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        {formatPercentage(insights.avgMargin)}
                      </Text>
                    </Box>
                    <Box>
                      <Text variant="bodySm" as="p" tone="subdued">High Margin Recipes</Text>
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        {insights.highMarginRecipes}
                      </Text>
                    </Box>
                    <Box>
                      <Text variant="bodySm" as="p" tone="subdued">Total Opportunity</Text>
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        {formatCurrency(insights.totalOpportunity)}
                      </Text>
                    </Box>
                    <Box>
                      <Text variant="bodySm" as="p" tone="subdued">Trending Up</Text>
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        {insights.trendingUp} recipes
                      </Text>
                    </Box>
                  </InlineStack>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}