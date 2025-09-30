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
  TextField,
  Modal,
  FormLayout,
  Banner,
  Icon,
  Tooltip,
  ProgressBar
} from '@shopify/polaris';
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  InfoIcon,
  AlertTriangleIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@shopify/polaris-icons';

export interface CompetitorData {
  id: string;
  name: string;
  location?: string;
  type: 'direct' | 'indirect' | 'substitute';
  products: CompetitorProduct[];
  last_updated: string;
}

export interface CompetitorProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  quality_rating?: number;
  availability: 'available' | 'limited' | 'unavailable';
  notes?: string;
}

export interface CompetitorComparison {
  recipe_id: string;
  recipe_name: string;
  our_price: number;
  our_cost: number;
  our_margin: number;
  competitors: {
    competitor_name: string;
    competitor_price: number;
    price_difference: number;
    market_position: 'below' | 'competitive' | 'premium';
  }[];
  market_average: number;
  price_recommendation: {
    suggested_price: number;
    rationale: string;
    confidence: 'low' | 'medium' | 'high';
  };
}

interface CompetitorAnalysisProps {
  competitors: CompetitorData[];
  comparisons: CompetitorComparison[];
  onAddCompetitor?: (competitor: Omit<CompetitorData, 'id'>) => void;
  onUpdateCompetitor?: (id: string, competitor: Partial<CompetitorData>) => void;
  onDeleteCompetitor?: (id: string) => void;
  onAddProduct?: (competitorId: string, product: Omit<CompetitorProduct, 'id'>) => void;
  onUpdatePricing?: (recipeId: string, newPrice: number) => void;
  loading?: boolean;
}

type ViewMode = 'overview' | 'competitors' | 'comparisons';
type SortBy = 'name' | 'position' | 'opportunity' | 'confidence';

export function CompetitorAnalysis({
  competitors,
  comparisons,
  onAddCompetitor,
  onUpdateCompetitor,
  onDeleteCompetitor,
  onAddProduct,
  onUpdatePricing,
  loading = false
}: CompetitorAnalysisProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [sortBy, setSortBy] = useState<SortBy>('opportunity');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddCompetitorModal, setShowAddCompetitorModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('');
  
  // Form states
  const [newCompetitor, setNewCompetitor] = useState({
    name: '',
    location: '',
    type: 'direct' as const
  });
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    category: '',
    description: '',
    quality_rating: 3,
    availability: 'available' as const,
    notes: ''
  });

  // Get unique categories
  const categories = useMemo(() => {
    const allProducts = competitors.flatMap(comp => comp.products);
    const uniqueCategories = [...new Set(allProducts.map(product => product.category))];
    return ['all', ...uniqueCategories.sort()];
  }, [competitors]);

  // Calculate market insights
  const marketInsights = useMemo(() => {
    const totalComparisons = comparisons.length;
    const belowMarket = comparisons.filter(comp => 
      comp.competitors.some(c => c.market_position === 'below')
    ).length;
    const premiumPriced = comparisons.filter(comp => 
      comp.competitors.some(c => c.market_position === 'premium')
    ).length;
    const highConfidenceOpportunities = comparisons.filter(comp => 
      comp.price_recommendation.confidence === 'high' &&
      comp.price_recommendation.suggested_price > comp.our_price
    ).length;

    const totalRevenuePotential = comparisons.reduce((sum, comp) => {
      const opportunity = Math.max(0, comp.price_recommendation.suggested_price - comp.our_price);
      return sum + opportunity;
    }, 0);

    return {
      totalComparisons,
      belowMarket,
      premiumPriced,
      highConfidenceOpportunities,
      totalRevenuePotential,
      competitorCount: competitors.length
    };
  }, [comparisons, competitors]);

  // Filter and sort comparisons
  const filteredComparisons = useMemo(() => {
    let filtered = comparisons;

    if (selectedCategory !== 'all') {
      // This would need to be implemented based on recipe categories
      // For now, we'll show all
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.recipe_name.localeCompare(b.recipe_name);
        case 'position':
          // Sort by how many competitors we're below
          const aBelow = a.competitors.filter(c => c.market_position === 'below').length;
          const bBelow = b.competitors.filter(c => c.market_position === 'below').length;
          return bBelow - aBelow;
        case 'opportunity':
          const aOpportunity = Math.max(0, a.price_recommendation.suggested_price - a.our_price);
          const bOpportunity = Math.max(0, b.price_recommendation.suggested_price - b.our_price);
          return bOpportunity - aOpportunity;
        case 'confidence':
          const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          return confidenceOrder[b.price_recommendation.confidence] - confidenceOrder[a.price_recommendation.confidence];
        default:
          return 0;
      }
    });
  }, [comparisons, selectedCategory, sortBy]);

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'below': return 'critical';
      case 'competitive': return 'success';
      case 'premium': return 'warning';
      default: return 'subdued';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'critical';
      default: return 'subdued';
    }
  };

  const handleAddCompetitor = () => {
    if (onAddCompetitor && newCompetitor.name.trim()) {
      onAddCompetitor({
        ...newCompetitor,
        products: [],
        last_updated: new Date().toISOString()
      });
      setNewCompetitor({ name: '', location: '', type: 'direct' });
      setShowAddCompetitorModal(false);
    }
  };

  const handleAddProduct = () => {
    if (onAddProduct && selectedCompetitor && newProduct.name.trim()) {
      onAddProduct(selectedCompetitor, {
        ...newProduct,
        price: Number(newProduct.price)
      });
      setNewProduct({
        name: '',
        price: 0,
        category: '',
        description: '',
        quality_rating: 3,
        availability: 'available',
        notes: ''
      });
      setShowAddProductModal(false);
      setSelectedCompetitor('');
    }
  };

  // Build comparison table rows
  const comparisonRows = filteredComparisons.map((comparison) => {
    const opportunity = Math.max(0, comparison.price_recommendation.suggested_price - comparison.our_price);
    const avgCompetitorPrice = comparison.competitors.length > 0
      ? comparison.competitors.reduce((sum, c) => sum + c.competitor_price, 0) / comparison.competitors.length
      : 0;

    return [
      <BlockStack key={`name-${comparison.recipe_id}`} gap="100">
        <Text variant="bodyMd" as="p" fontWeight="semibold">{comparison.recipe_name}</Text>
        <Text variant="bodySm" as="p" tone="subdued">
          Margin: {formatPercentage(comparison.our_margin)}
        </Text>
      </BlockStack>,

      <InlineStack key={`pricing-${comparison.recipe_id}`} gap="200">
        <BlockStack gap="100">
          <Text variant="bodySm" as="p" tone="subdued">Our Price</Text>
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            {formatCurrency(comparison.our_price)}
          </Text>
        </BlockStack>
        <BlockStack gap="100">
          <Text variant="bodySm" as="p" tone="subdued">Market Avg</Text>
          <Text variant="bodyMd" as="p">
            {formatCurrency(avgCompetitorPrice)}
          </Text>
        </BlockStack>
      </InlineStack>,

      <BlockStack key={`competitors-${comparison.recipe_id}`} gap="100">
        {comparison.competitors.slice(0, 2).map((comp, index) => (
          <InlineStack key={index} gap="200" align="space-between">
            <Text variant="bodySm" as="p">{comp.competitor_name}</Text>
            <InlineStack gap="100">
              <Text variant="bodySm" as="p">
                {formatCurrency(comp.competitor_price)}
              </Text>
              <Badge size="small" tone={getPositionColor(comp.market_position) as any}>
                {comp.market_position}
              </Badge>
            </InlineStack>
          </InlineStack>
        ))}
        {comparison.competitors.length > 2 && (
          <Text variant="bodySm" as="p" tone="subdued">
            +{comparison.competitors.length - 2} more
          </Text>
        )}
      </BlockStack>,

      <BlockStack key={`recommendation-${comparison.recipe_id}`} gap="100">
        <InlineStack gap="200">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            {formatCurrency(comparison.price_recommendation.suggested_price)}
          </Text>
          <Badge tone={getConfidenceColor(comparison.price_recommendation.confidence) as any}>
            {comparison.price_recommendation.confidence}
          </Badge>
        </InlineStack>
        <Text variant="bodySm" as="p" tone="subdued">
          {comparison.price_recommendation.rationale}
        </Text>
      </BlockStack>,

      <BlockStack key={`opportunity-${comparison.recipe_id}`} gap="100">
        <Text variant="bodyMd" as="p" fontWeight="semibold" tone={opportunity > 0 ? "success" : "subdued"}>
          {opportunity > 0 ? `+${formatCurrency(opportunity)}` : 'None'}
        </Text>
        {opportunity > 0 && (
          <Button
            size="slim"
            onClick={() => onUpdatePricing?.(comparison.recipe_id, comparison.price_recommendation.suggested_price)}
          >
            Apply
          </Button>
        )}
      </BlockStack>
    ];
  });

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
            variant={viewMode === 'competitors' ? 'primary' : 'tertiary'}
            onClick={() => setViewMode('competitors')}
          >
            {`Competitors (${competitors.length})`}
          </Button>
          <Button
            variant={viewMode === 'comparisons' ? 'primary' : 'tertiary'}
            onClick={() => setViewMode('comparisons')}
          >
            {`Price Comparisons (${comparisons.length})`}
          </Button>
        </InlineStack>
      </Card>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <BlockStack gap="400">
          {/* Market Insights Cards */}
          <InlineStack gap="400" wrap>
            <Card>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" tone="subdued">Competitors Tracked</Text>
                <Text variant="headingLg" as="h3">{marketInsights.competitorCount}</Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  Active monitoring
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" tone="subdued">Below Market</Text>
                <Text variant="headingLg" as="h3" tone="critical">
                  {marketInsights.belowMarket}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  recipes underpriced
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" tone="subdued">Premium Positioned</Text>
                <Text variant="headingLg" as="h3">
                  {marketInsights.premiumPriced}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  recipes at premium
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p" tone="subdued">Revenue Opportunity</Text>
                <Text variant="headingLg" as="h3" tone="success">
                  {formatCurrency(marketInsights.totalRevenuePotential)}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  potential increase
                </Text>
              </BlockStack>
            </Card>
          </InlineStack>

          {/* Key Insights */}
          <BlockStack gap="200">
            {marketInsights.belowMarket > 0 && (
              <Banner tone="warning">
                <InlineStack gap="200">
                  <Icon source={AlertTriangleIcon} />
                  <Text variant="bodyMd" as="p">
                    {marketInsights.belowMarket} of your recipes are priced below market average. 
                    Consider price increases to improve margins.
                  </Text>
                </InlineStack>
              </Banner>
            )}

            {marketInsights.highConfidenceOpportunities > 0 && (
              <Banner tone="info">
                <InlineStack gap="200">
                  <Icon source={InfoIcon} />
                  <Text variant="bodyMd" as="p">
                    {marketInsights.highConfidenceOpportunities} high-confidence pricing opportunities identified. 
                    Review the comparisons tab for details.
                  </Text>
                </InlineStack>
              </Banner>
            )}
          </BlockStack>
        </BlockStack>
      )}

      {/* Competitors Mode */}
      {viewMode === 'competitors' && (
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text variant="headingMd" as="h3">Competitor Management</Text>
            {onAddCompetitor && (
              <Button
                variant="primary"
                icon={PlusIcon}
                onClick={() => setShowAddCompetitorModal(true)}
              >
                Add Competitor
              </Button>
            )}
          </InlineStack>

          {competitors.length === 0 ? (
            <Card>
              <Box padding="400">
                <Text variant="bodyMd" as="p" alignment="center" tone="subdued">
                  No competitors added yet. Add competitors to start tracking market prices.
                </Text>
              </Box>
            </Card>
          ) : (
            <InlineStack gap="400" wrap>
              {competitors.map((competitor) => (
                <Card key={competitor.id}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text variant="headingSm" as="h4">{competitor.name}</Text>
                        {competitor.location && (
                          <Text variant="bodySm" as="p" tone="subdued">
                            {competitor.location}
                          </Text>
                        )}
                        <Badge tone={competitor.type === 'direct' ? 'success' : 'warning'}>
                          {competitor.type}
                        </Badge>
                      </BlockStack>
                      <InlineStack gap="100">
                        {onAddProduct && (
                          <Tooltip content="Add product">
                            <Button
                              icon={PlusIcon}
                              variant="tertiary"
                              onClick={() => {
                                setSelectedCompetitor(competitor.id);
                                setShowAddProductModal(true);
                              }}
                            />
                          </Tooltip>
                        )}
                        {onDeleteCompetitor && (
                          <Tooltip content="Delete competitor">
                            <Button
                              icon={DeleteIcon}
                              variant="tertiary"
                              tone="critical"
                              onClick={() => onDeleteCompetitor(competitor.id)}
                            />
                          </Tooltip>
                        )}
                      </InlineStack>
                    </InlineStack>

                    <BlockStack gap="200">
                      <Text variant="bodyMd" as="p">
                        Products: {competitor.products.length}
                      </Text>
                      {competitor.products.slice(0, 3).map((product) => (
                        <InlineStack key={product.id} align="space-between">
                          <Text variant="bodySm" as="p">{product.name}</Text>
                          <Text variant="bodySm" as="p" fontWeight="semibold">
                            {formatCurrency(product.price)}
                          </Text>
                        </InlineStack>
                      ))}
                      {competitor.products.length > 3 && (
                        <Text variant="bodySm" as="p" tone="subdued">
                          +{competitor.products.length - 3} more products
                        </Text>
                      )}
                    </BlockStack>

                    <Text variant="bodySm" as="p" tone="subdued">
                      Updated: {new Date(competitor.last_updated).toLocaleDateString()}
                    </Text>
                  </BlockStack>
                </Card>
              ))}
            </InlineStack>
          )}
        </BlockStack>
      )}

      {/* Comparisons Mode */}
      {viewMode === 'comparisons' && (
        <BlockStack gap="400">
          {/* Filters */}
          <Card>
            <InlineStack gap="300" wrap>
              <Select
                label="Sort by"
                options={[
                  { label: 'Revenue Opportunity', value: 'opportunity' },
                  { label: 'Recipe Name', value: 'name' },
                  { label: 'Market Position', value: 'position' },
                  { label: 'Confidence Level', value: 'confidence' }
                ]}
                value={sortBy}
                onChange={(value) => setSortBy(value as SortBy)}
              />
            </InlineStack>
          </Card>

          {/* Comparisons Table */}
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h3">
                Price Comparisons ({filteredComparisons.length} recipes)
              </Text>

              {filteredComparisons.length > 0 ? (
                <DataTable
                  columnContentTypes={[
                    'text', 'text', 'text', 'text', 'text'
                  ]}
                  headings={[
                    'Recipe',
                    'Pricing',
                    'Competitors',
                    'Recommendation',
                    'Opportunity'
                  ]}
                  rows={comparisonRows}
                />
              ) : (
                <Box padding="400">
                  <Text variant="bodyMd" as="p" alignment="center" tone="subdued">
                    No price comparisons available. Add competitors and their products to see comparisons.
                  </Text>
                </Box>
              )}
            </BlockStack>
          </Card>
        </BlockStack>
      )}

      {/* Add Competitor Modal */}
      <Modal
        open={showAddCompetitorModal}
        onClose={() => setShowAddCompetitorModal(false)}
        title="Add Competitor"
        primaryAction={{
          content: 'Add Competitor',
          onAction: handleAddCompetitor,
          disabled: !newCompetitor.name.trim()
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowAddCompetitorModal(false)
          }
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Competitor Name"
              value={newCompetitor.name}
              onChange={(value) => setNewCompetitor(prev => ({ ...prev, name: value }))}
              autoComplete="off"
            />
            
            <TextField
              label="Location (Optional)"
              value={newCompetitor.location}
              onChange={(value) => setNewCompetitor(prev => ({ ...prev, location: value }))}
              autoComplete="off"
            />
            
            <Select
              label="Competitor Type"
              options={[
                { label: 'Direct Competitor', value: 'direct' },
                { label: 'Indirect Competitor', value: 'indirect' },
                { label: 'Substitute Product', value: 'substitute' }
              ]}
              value={newCompetitor.type}
              onChange={(value) => setNewCompetitor(prev => ({ ...prev, type: value as any }))}
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

      {/* Add Product Modal */}
      <Modal
        open={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        title="Add Competitor Product"
        primaryAction={{
          content: 'Add Product',
          onAction: handleAddProduct,
          disabled: !newProduct.name.trim() || newProduct.price <= 0
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowAddProductModal(false)
          }
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Product Name"
              value={newProduct.name}
              onChange={(value) => setNewProduct(prev => ({ ...prev, name: value }))}
              autoComplete="off"
            />
            
            <TextField
              label="Price"
              type="number"
              value={newProduct.price.toString()}
              onChange={(value) => setNewProduct(prev => ({ ...prev, price: parseFloat(value) || 0 }))}
              prefix="$"
              step={0.01}
              min={0}
              autoComplete="off"
            />
            
            <TextField
              label="Category"
              value={newProduct.category}
              onChange={(value) => setNewProduct(prev => ({ ...prev, category: value }))}
              autoComplete="off"
            />
            
            <TextField
              label="Description (Optional)"
              value={newProduct.description}
              onChange={(value) => setNewProduct(prev => ({ ...prev, description: value }))}
              multiline={2}
              autoComplete="off"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}