/**
 * Price History Trend Analysis Component
 * Task 51: Implement price history drawer (FR-037, FR-018)
 * Provides trend analysis and visualization for price history data
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Tooltip,
  Icon,
  Spinner,
  ProgressBar
} from '@shopify/polaris';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  InfoIcon
} from '@shopify/polaris-icons';
import type { PriceHistoryService } from '../../services/price-history';

export interface PriceTrendAnalysisProps {
  /** Ingredient ID to analyze */
  ingredientId: string;
  /** Price history service instance */
  priceHistoryService: PriceHistoryService;
  /** Days back to analyze */
  daysBack?: number;
  /** Show detailed metrics */
  showDetails?: boolean;
}

interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  trendStrength: number;
  averageMonthlyChange: number;
  projectedNextMonthPrice: number;
  confidence: number;
  dataPoints: number;
  analysisDate: Date;
}

/**
 * Price Trend Analysis Component
 */
export function PriceTrendAnalysis({
  ingredientId,
  priceHistoryService,
  daysBack = 90,
  showDetails = true
}: PriceTrendAnalysisProps) {
  const [analysis, setAnalysis] = useState<TrendAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load trend analysis
  useEffect(() => {
    const loadAnalysis = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await priceHistoryService.getPriceTrendAnalysis(ingredientId, daysBack);
        setAnalysis(result);
      } catch (err) {
        console.error('Failed to load trend analysis:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trend analysis');
      } finally {
        setLoading(false);
      }
    };

    if (ingredientId) {
      loadAnalysis();
    }
  }, [ingredientId, priceHistoryService, daysBack]);

  // Get trend display info
  const getTrendDisplay = (trend: TrendAnalysis['trend']) => {
    switch (trend) {
      case 'increasing':
        return {
          icon: ChevronUpIcon,
          color: 'critical' as const,
          label: 'Increasing',
          description: 'Prices are trending upward'
        };
      case 'decreasing':
        return {
          icon: ChevronDownIcon,
          color: 'success' as const,
          label: 'Decreasing',
          description: 'Prices are trending downward'
        };
      case 'volatile':
        return {
          icon: ChevronUpIcon,
          color: 'warning' as const,
          label: 'Volatile',
          description: 'Prices are fluctuating significantly'
        };
      default:
        return {
          icon: InfoIcon,
          color: 'info' as const,
          label: 'Stable',
          description: 'Prices are relatively stable'
        };
    }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spinner size="small" />
          <Text variant="bodyMd" as="p">
            Analyzing price trends...
          </Text>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Text variant="bodyMd" tone="critical" as="p">
          {error}
        </Text>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <Text variant="bodyMd" tone="subdued" as="p">
          No trend analysis available
        </Text>
      </Card>
    );
  }

  const trendDisplay = getTrendDisplay(analysis.trend);

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between">
          <Text variant="headingMd" as="h3">
            Price Trend Analysis
          </Text>
          <Badge tone={trendDisplay.color}>
            {trendDisplay.label}
          </Badge>
        </InlineStack>

        <InlineStack gap="200" align="center">
          <Icon source={trendDisplay.icon} />
          <Text variant="bodyLg" as="p">
            {trendDisplay.description}
          </Text>
        </InlineStack>

        {showDetails && (
          <BlockStack gap="200">
            {/* Trend Strength */}
            <div>
              <InlineStack align="space-between">
                <Text variant="bodyMd" as="span">
                  Trend Strength
                </Text>
                <Text variant="bodyMd" as="span">
                  {(analysis.trendStrength * 100).toFixed(1)}%
                </Text>
              </InlineStack>
              <ProgressBar progress={analysis.trendStrength * 100} size="small" />
            </div>

            {/* Confidence Level */}
            <div>
              <InlineStack align="space-between">
                <Text variant="bodyMd" as="span">
                  Confidence Level
                </Text>
                <Text variant="bodyMd" as="span">
                  {(analysis.confidence * 100).toFixed(1)}%
                </Text>
              </InlineStack>
              <ProgressBar 
                progress={analysis.confidence * 100} 
                size="small"
              />
            </div>

            {/* Key Metrics */}
            <InlineStack gap="400" wrap>
              <div>
                <Text variant="bodyMd" tone="subdued" as="p">
                  Monthly Change (Avg)
                </Text>
                <Text variant="headingMd" as="p" tone={analysis.averageMonthlyChange > 0 ? 'critical' : 'success'}>
                  {analysis.averageMonthlyChange > 0 ? '+' : ''}{analysis.averageMonthlyChange.toFixed(2)}%
                </Text>
              </div>

              <div>
                <Text variant="bodyMd" tone="subdued" as="p">
                  Projected Price (Next Month)
                </Text>
                <Text variant="headingMd" as="p">
                  ${analysis.projectedNextMonthPrice.toFixed(4)}
                </Text>
              </div>

              <div>
                <Text variant="bodyMd" tone="subdued" as="p">
                  Data Points
                </Text>
                <Text variant="headingMd" as="p">
                  {analysis.dataPoints}
                </Text>
              </div>
            </InlineStack>

            <Text variant="bodyMd" tone="subdued" as="p">
              Analysis based on {daysBack} days of price history data.
              Last updated: {analysis.analysisDate.toLocaleString()}
            </Text>
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}

/**
 * Compact Price History Button
 */
export interface PriceHistoryButtonProps {
  /** Ingredient ID */
  ingredientId: string;
  /** Ingredient name */
  ingredientName?: string;
  /** Show history count */
  showCount?: boolean;
  /** Callback when button is clicked */
  onClick: () => void;
  /** Price history service for getting count */
  priceHistoryService?: PriceHistoryService;
}

export function PriceHistoryButton({
  ingredientId,
  ingredientName,
  showCount = true,
  onClick,
  priceHistoryService
}: PriceHistoryButtonProps) {
  const [historyCount, setHistoryCount] = useState<number | null>(null);

  useEffect(() => {
    const loadCount = async () => {
      if (!priceHistoryService || !showCount) return;

      try {
        const history = await priceHistoryService.getIngredientPriceHistory(ingredientId, { limit: 1 });
        setHistoryCount(history.pagination.total);
      } catch (error) {
        console.error('Failed to load history count:', error);
      }
    };

    loadCount();
  }, [ingredientId, priceHistoryService, showCount]);

  return (
    <Tooltip content={`View price history for ${ingredientName || 'this ingredient'}`}>
      <button
        onClick={onClick}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <Icon source={InfoIcon} />
        <Text variant="bodyMd" as="span">
          History
        </Text>
        {showCount && historyCount !== null && (
          <Badge tone="info" size="small">
            {historyCount.toString()}
          </Badge>
        )}
      </button>
    </Tooltip>
  );
}

/**
 * Price Change Indicator
 */
export interface PriceChangeIndicatorProps {
  /** Previous price */
  previousPrice?: number;
  /** Current price */
  currentPrice: number;
  /** Show percentage change */
  showPercentage?: boolean;
  /** Show absolute change */
  showAbsolute?: boolean;
}

export function PriceChangeIndicator({
  previousPrice,
  currentPrice,
  showPercentage = true,
  showAbsolute = false
}: PriceChangeIndicatorProps) {
  if (!previousPrice || previousPrice === currentPrice) {
    return (
      <Badge tone="info" size="small">
        No Change
      </Badge>
    );
  }

  const changeAmount = currentPrice - previousPrice;
  const changePercent = (changeAmount / previousPrice) * 100;
  const isIncrease = changeAmount > 0;

  return (
    <InlineStack gap="100" align="center">
      <Icon source={isIncrease ? ChevronUpIcon : ChevronDownIcon} />
      {showAbsolute && (
        <Text variant="bodyMd" as="span" tone={isIncrease ? 'critical' : 'success'}>
          {isIncrease ? '+' : ''}${changeAmount.toFixed(4)}
        </Text>
      )}
      {showPercentage && (
        <Badge tone={isIncrease ? 'critical' : 'success'} size="small">
          {`${isIncrease ? '+' : ''}${changePercent.toFixed(1)}%`}
        </Badge>
      )}
    </InlineStack>
  );
}