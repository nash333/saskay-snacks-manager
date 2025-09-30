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
  Banner,
  Icon,
  Tooltip,
  Modal,
  TextField,
  FormLayout
} from '@shopify/polaris';
import {
  InfoIcon,
  AlertTriangleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TargetIcon,
  EditIcon
} from '@shopify/polaris-icons';

export interface ProfitAnalysisData {
  recipe_id: string;
  recipe_name: string;
  category: string;
  current_cost: number;
  current_price?: number;
  current_margin: number;
  target_margin: number;
  break_even_price: number;
  suggested_price: number;
  volume_sold: number;
  revenue_impact: number;
  cost_breakdown: {
    ingredients: number;
    labor: number;
    overhead: number;
    packaging: number;
  };
  margin_trend: 'improving' | 'declining' | 'stable';
  profitability_status: 'profitable' | 'break_even' | 'loss_making';
}

export interface MarginTargets {
  category: string;
  target_margin: number;
  minimum_margin: number;
  premium_margin: number;
}

interface ProfitMarginAnalyzerProps {
  analysisData: ProfitAnalysisData[];
  marginTargets: MarginTargets[];
  onUpdatePrice?: (recipeId: string, newPrice: number) => void;
  onUpdateTargets?: (targets: MarginTargets[]) => void;
  onExport?: () => void;
  loading?: boolean;
}

type ViewMode = 'overview' | 'analysis' | 'targets';
type FilterBy = 'all' | 'profitable' | 'break_even' | 'loss_making' | 'below_target';
type SortBy = 'name' | 'margin' | 'revenue_impact' | 'trend' | 'category';

export function ProfitMarginAnalyzer({
  analysisData,
  marginTargets,
  onUpdatePrice,
  onUpdateTargets,
  onExport,
  loading = false
}: ProfitMarginAnalyzerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [sortBy, setSortBy] = useState<SortBy>('revenue_impact');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [editingTargets, setEditingTargets] = useState<MarginTargets[]>([]);

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(analysisData.map(item => item.category))];
    return ['all', ...uniqueCategories.sort()];
  }, [analysisData]);

  // Calculate overall metrics
  const overallMetrics = useMemo(() => {
    const totalRecipes = analysisData.length;
    const profitableRecipes = analysisData.filter(item => item.profitability_status === 'profitable').length;
    const lossMakingRecipes = analysisData.filter(item => item.profitability_status === 'loss_making').length;
    const belowTargetRecipes = analysisData.filter(item => 
      item.current_margin < item.target_margin
    ).length;

    const totalRevenue = analysisData.reduce((sum, item) => 
      sum + (item.current_price || 0) * item.volume_sold, 0
    );
    const totalRevenueImpact = analysisData.reduce((sum, item) => sum + item.revenue_impact, 0);
    
    const avgMargin = totalRecipes > 0 
      ? analysisData.reduce((sum, item) => sum + item.current_margin, 0) / totalRecipes
      : 0;

    const improvingTrend = analysisData.filter(item => item.margin_trend === 'improving').length;
    const decliningTrend = analysisData.filter(item => item.margin_trend === 'declining').length;

    return {
      totalRecipes,
      profitableRecipes,
      lossMakingRecipes,
      belowTargetRecipes,
      totalRevenue,
      totalRevenueImpact,
      avgMargin,
      improvingTrend,
      decliningTrend,
      profitabilityRate: totalRecipes > 0 ? (profitableRecipes / totalRecipes) * 100 : 0
    };
  }, [analysisData]);

  // Filter and sort analysis data
  const filteredData = useMemo(() => {
    let filtered = analysisData;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by status
    switch (filterBy) {
      case 'profitable':
        filtered = filtered.filter(item => item.profitability_status === 'profitable');
        break;
      case 'break_even':
        filtered = filtered.filter(item => item.profitability_status === 'break_even');
        break;
      case 'loss_making':
        filtered = filtered.filter(item => item.profitability_status === 'loss_making');
        break;
      case 'below_target':
        filtered = filtered.filter(item => item.current_margin < item.target_margin);
        break;
    }

    // Sort data
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.recipe_name.localeCompare(b.recipe_name);
        case 'margin':
          return b.current_margin - a.current_margin;
        case 'revenue_impact':
          return b.revenue_impact - a.revenue_impact;
        case 'trend':
          const trendOrder = { 'improving': 3, 'stable': 2, 'declining': 1 };
          return trendOrder[b.margin_trend] - trendOrder[a.margin_trend];
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });
  }, [analysisData, selectedCategory, filterBy, sortBy]);

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getMarginColor = (margin: number, target: number) => {
    if (margin >= target) return 'success';
    if (margin >= target * 0.8) return 'warning';
    return 'critical';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return ChevronUpIcon;
      case 'declining': return ChevronDownIcon;
      default: return null;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'success';
      case 'declining': return 'critical';
      default: return 'subdued';
    }
  };

  const getProfitabilityColor = (status: string) => {
    switch (status) {
      case 'profitable': return 'success';
      case 'break_even': return 'warning';
      case 'loss_making': return 'critical';
      default: return 'subdued';
    }
  };

  const handleUpdateTargets = () => {
    if (onUpdateTargets) {
      onUpdateTargets(editingTargets);
      setShowTargetsModal(false);
    }
  };

  // Build analysis table rows
  const analysisRows = filteredData.map((item) => {
    const trendIcon = getTrendIcon(item.margin_trend);
    const marginGap = item.target_margin - item.current_margin;
    const priceIncrease = item.suggested_price - (item.current_price || item.current_cost);

    return [
      <BlockStack key={`name-${item.recipe_id}`} gap="100">
        <Text variant="bodyMd" as="p" fontWeight="semibold">{item.recipe_name}</Text>
        <Text variant="bodySm" as="p" tone="subdued">{item.category}</Text>
      </BlockStack>,

      <InlineStack key={`margin-${item.recipe_id}`} gap="200">
        <BlockStack gap="100">
          <InlineStack gap="100">
            <Text variant="bodyMd" as="p" fontWeight="semibold">
              {formatPercentage(item.current_margin)}
            </Text>
            {trendIcon && <Icon source={trendIcon} tone={getTrendColor(item.margin_trend)} />}
          </InlineStack>
          <ProgressBar 
            progress={Math.min(100, (item.current_margin / item.target_margin) * 100)}
            tone={getMarginColor(item.current_margin, item.target_margin) as any}
            size="small"
          />
          <Text variant="bodySm" as="p" tone="subdued">
            Target: {formatPercentage(item.target_margin)}
          </Text>
        </BlockStack>
      </InlineStack>,

      <Badge key={`status-${item.recipe_id}`} tone={getProfitabilityColor(item.profitability_status) as any}>
        {item.profitability_status.replace('_', ' ')}
      </Badge>,

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

      <BlockStack key={`breakdown-${item.recipe_id}`} gap="100">
        <Text variant="bodySm" as="p" tone="subdued">Cost Breakdown:</Text>
        <InlineStack gap="200" wrap>
          <Text variant="bodySm" as="p">
            Ingredients: {formatPercentage((item.cost_breakdown.ingredients / item.current_cost) * 100)}
          </Text>
          <Text variant="bodySm" as="p">
            Labor: {formatPercentage((item.cost_breakdown.labor / item.current_cost) * 100)}
          </Text>
        </InlineStack>
      </BlockStack>,

      <BlockStack key={`impact-${item.recipe_id}`} gap="100">
        <Text variant="bodyMd" as="p" fontWeight="semibold" tone={item.revenue_impact > 0 ? "success" : "subdued"}>
          {item.revenue_impact > 0 ? `+${formatCurrency(item.revenue_impact)}` : 'None'}
        </Text>
        {item.revenue_impact > 0 && onUpdatePrice && (
          <Button
            size="slim"
            onClick={() => onUpdatePrice(item.recipe_id, item.suggested_price)}
          >
            Apply
          </Button>
        )}
      </BlockStack>
    ];
  });

  // Initialize editing targets
  React.useEffect(() => {
    if (showTargetsModal && editingTargets.length === 0) {
      setEditingTargets([...marginTargets]);
    }
  }, [showTargetsModal, marginTargets, editingTargets.length]);

  return (
    <BlockStack gap="400">
      {/* View Mode Tabs */}
      <Card>
        <InlineStack gap="200">
          <Button
            variant={viewMode === 'overview' ? 'primary' : 'tertiary'}
            onClick={() => setViewMode('overview')}
          >
            Overview
          </Button>
          <Button
            variant={viewMode === 'analysis' ? 'primary' : 'tertiary'}
            onClick={() => setViewMode('analysis')}
          >
            Detailed Analysis
          </Button>
          <Button
            variant={viewMode === 'targets' ? 'primary' : 'tertiary'}
            onClick={() => setViewMode('targets')}
          >
            Margin Targets
          </Button>
        </InlineStack>
      </Card>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <BlockStack gap="400">
          {/* Key Metrics Cards */}
          <InlineStack gap="400" wrap>
            <Card>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" tone="subdued">Profitability Rate</Text>
                <Text variant="headingLg" as="h3" tone={overallMetrics.profitabilityRate > 80 ? "success" : "critical"}>
                  {formatPercentage(overallMetrics.profitabilityRate)}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  {overallMetrics.profitableRecipes} of {overallMetrics.totalRecipes} recipes
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" tone="subdued">Average Margin</Text>
                <Text variant="headingLg" as="h3">
                  {formatPercentage(overallMetrics.avgMargin)}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  Across all recipes
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" tone="subdued">Revenue Opportunity</Text>
                <Text variant="headingLg" as="h3" tone="success">
                  {formatCurrency(overallMetrics.totalRevenueImpact)}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  Potential increase
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" tone="subdued">Below Target</Text>
                <Text variant="headingLg" as="h3" tone="critical">
                  {overallMetrics.belowTargetRecipes}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  recipes need attention
                </Text>
              </BlockStack>
            </Card>
          </InlineStack>

          {/* Trend Analysis */}
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">Margin Trends</Text>
              <InlineStack gap="400" wrap>
                <Box>
                  <InlineStack gap="200">
                    <Icon source={ChevronUpIcon} tone="success" />
                    <BlockStack gap="100">
                      <Text variant="bodyMd" as="p" fontWeight="semibold" tone="success">
                        {overallMetrics.improvingTrend} Improving
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        Margins increasing
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Box>

                <Box>
                  <InlineStack gap="200">
                    <Icon source={ChevronDownIcon} tone="critical" />
                    <BlockStack gap="100">
                      <Text variant="bodyMd" as="p" fontWeight="semibold" tone="critical">
                        {overallMetrics.decliningTrend} Declining
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        Margins decreasing
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Box>

                <Box>
                  <BlockStack gap="100">
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      {overallMetrics.totalRecipes - overallMetrics.improvingTrend - overallMetrics.decliningTrend} Stable
                    </Text>
                    <Text variant="bodySm" as="p" tone="subdued">
                      Margins stable
                    </Text>
                  </BlockStack>
                </Box>
              </InlineStack>
            </BlockStack>
          </Card>

          {/* Alerts */}
          <BlockStack gap="200">
            {overallMetrics.lossMakingRecipes > 0 && (
              <Banner tone="critical">
                <InlineStack gap="200">
                  <Icon source={AlertTriangleIcon} />
                  <Text variant="bodyMd" as="p">
                    {overallMetrics.lossMakingRecipes} recipes are operating at a loss. 
                    Review pricing and costs immediately.
                  </Text>
                </InlineStack>
              </Banner>
            )}

            {overallMetrics.belowTargetRecipes > overallMetrics.totalRecipes * 0.3 && (
              <Banner tone="warning">
                <InlineStack gap="200">
                  <Icon source={InfoIcon} />
                  <Text variant="bodyMd" as="p">
                    Over 30% of recipes are below margin targets. 
                    Consider reviewing pricing strategy or margin targets.
                  </Text>
                </InlineStack>
              </Banner>
            )}

            {overallMetrics.totalRevenueImpact > 1000 && (
              <Banner tone="info">
                <InlineStack gap="200">
                  <Icon source={TargetIcon} />
                  <Text variant="bodyMd" as="p">
                    Significant revenue opportunity identified: {formatCurrency(overallMetrics.totalRevenueImpact)}. 
                    Review the detailed analysis for optimization suggestions.
                  </Text>
                </InlineStack>
              </Banner>
            )}
          </BlockStack>
        </BlockStack>
      )}

      {/* Analysis Mode */}
      {viewMode === 'analysis' && (
        <BlockStack gap="400">
          {/* Filters */}
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
                  { label: 'Profitable', value: 'profitable' },
                  { label: 'Break Even', value: 'break_even' },
                  { label: 'Loss Making', value: 'loss_making' },
                  { label: 'Below Target', value: 'below_target' }
                ]}
                value={filterBy}
                onChange={(value) => setFilterBy(value as FilterBy)}
              />

              <Select
                label="Sort by"
                options={[
                  { label: 'Revenue Impact', value: 'revenue_impact' },
                  { label: 'Recipe Name', value: 'name' },
                  { label: 'Current Margin', value: 'margin' },
                  { label: 'Margin Trend', value: 'trend' },
                  { label: 'Category', value: 'category' }
                ]}
                value={sortBy}
                onChange={(value) => setSortBy(value as SortBy)}
              />
            </InlineStack>
          </Card>

          {/* Analysis Table */}
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h3">
                  Profit Analysis ({filteredData.length} recipes)
                </Text>
                {onExport && (
                  <Button onClick={onExport}>
                    Export Analysis
                  </Button>
                )}
              </InlineStack>

              {filteredData.length > 0 ? (
                <DataTable
                  columnContentTypes={[
                    'text', 'text', 'text', 'text', 'text', 'text'
                  ]}
                  headings={[
                    'Recipe',
                    'Margin vs Target',
                    'Status',
                    'Pricing',
                    'Cost Breakdown',
                    'Revenue Impact'
                  ]}
                  rows={analysisRows}
                />
              ) : (
                <Box padding="400">
                  <Text variant="bodyMd" as="p" alignment="center" tone="subdued">
                    No recipes match the current filters.
                  </Text>
                </Box>
              )}
            </BlockStack>
          </Card>
        </BlockStack>
      )}

      {/* Targets Mode */}
      {viewMode === 'targets' && (
        <BlockStack gap="400">
          <Card>
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h3">Margin Targets by Category</Text>
              {onUpdateTargets && (
                <Button
                  variant="primary"
                  icon={EditIcon}
                  onClick={() => setShowTargetsModal(true)}
                >
                  Edit Targets
                </Button>
              )}
            </InlineStack>
          </Card>

          <InlineStack gap="400" wrap>
            {marginTargets.map((target, index) => (
              <Card key={index}>
                <BlockStack gap="300">
                  <Text variant="headingSm" as="h4">{target.category}</Text>
                  
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="p" tone="subdued">Target Margin</Text>
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        {formatPercentage(target.target_margin)}
                      </Text>
                    </InlineStack>
                    
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="p" tone="subdued">Minimum Margin</Text>
                      <Text variant="bodyMd" as="p" tone="critical">
                        {formatPercentage(target.minimum_margin)}
                      </Text>
                    </InlineStack>
                    
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="p" tone="subdued">Premium Margin</Text>
                      <Text variant="bodyMd" as="p" tone="success">
                        {formatPercentage(target.premium_margin)}
                      </Text>
                    </InlineStack>
                  </BlockStack>

                  {/* Current performance for this category */}
                  {(() => {
                    const categoryRecipes = analysisData.filter(item => item.category === target.category);
                    const avgMargin = categoryRecipes.length > 0 
                      ? categoryRecipes.reduce((sum, item) => sum + item.current_margin, 0) / categoryRecipes.length
                      : 0;
                    const aboveTarget = categoryRecipes.filter(item => item.current_margin >= target.target_margin).length;
                    
                    return (
                      <Box padding="200" background="bg-surface-secondary">
                        <BlockStack gap="100">
                          <Text variant="bodySm" as="p" tone="subdued">
                            Current Performance
                          </Text>
                          <Text variant="bodyMd" as="p">
                            Average: {formatPercentage(avgMargin)}
                          </Text>
                          <Text variant="bodySm" as="p">
                            {aboveTarget} of {categoryRecipes.length} recipes meet target
                          </Text>
                        </BlockStack>
                      </Box>
                    );
                  })()}
                </BlockStack>
              </Card>
            ))}
          </InlineStack>
        </BlockStack>
      )}

      {/* Edit Targets Modal */}
      <Modal
        open={showTargetsModal}
        onClose={() => setShowTargetsModal(false)}
        title="Edit Margin Targets"
        primaryAction={{
          content: 'Save Targets',
          onAction: handleUpdateTargets
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowTargetsModal(false)
          }
        ]}

      >
        <Modal.Section>
          <BlockStack gap="400">
            {editingTargets.map((target, index) => (
              <Card key={index}>
                <BlockStack gap="300">
                  <Text variant="headingSm" as="h4">{target.category}</Text>
                  
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField
                        label="Target Margin (%)"
                        type="number"
                        value={target.target_margin.toString()}
                        onChange={(value) => {
                          const newTargets = [...editingTargets];
                          newTargets[index].target_margin = parseFloat(value) || 0;
                          setEditingTargets(newTargets);
                        }}
                        min={0}
                        max={100}
                        step={0.1}
                        suffix="%"
                        autoComplete="off"
                      />
                      
                      <TextField
                        label="Minimum Margin (%)"
                        type="number"
                        value={target.minimum_margin.toString()}
                        onChange={(value) => {
                          const newTargets = [...editingTargets];
                          newTargets[index].minimum_margin = parseFloat(value) || 0;
                          setEditingTargets(newTargets);
                        }}
                        min={0}
                        max={100}
                        step={0.1}
                        suffix="%"
                        autoComplete="off"
                      />
                      
                      <TextField
                        label="Premium Margin (%)"
                        type="number"
                        value={target.premium_margin.toString()}
                        onChange={(value) => {
                          const newTargets = [...editingTargets];
                          newTargets[index].premium_margin = parseFloat(value) || 0;
                          setEditingTargets(newTargets);
                        }}
                        min={0}
                        max={100}
                        step={0.1}
                        suffix="%"
                        autoComplete="off"
                      />
                    </FormLayout.Group>
                  </FormLayout>
                </BlockStack>
              </Card>
            ))}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}