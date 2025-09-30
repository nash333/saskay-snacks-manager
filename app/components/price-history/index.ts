/**
 * Price History Components
 * Task 51: Implement price history drawer/modal UI with pagination
 * Exports all price history related components and utilities
 */

// Main components
export { PriceHistoryDrawer } from './PriceHistoryDrawer';
export type { PriceHistoryDrawerProps } from './PriceHistoryDrawer';

export { 
  PriceTrendAnalysis, 
  PriceHistoryButton, 
  PriceChangeIndicator 
} from './PriceTrendAnalysis';
export type { 
  PriceTrendAnalysisProps, 
  PriceHistoryButtonProps, 
  PriceChangeIndicatorProps 
} from './PriceTrendAnalysis';

// Re-export service types for convenience
export type { 
  PriceHistoryService,
  PriceHistoryEntry,
  PriceHistoryPage,
  PriceHistoryQuery,
  PriceHistoryPaginationOptions,
  PriceHistoryAggregates
} from '../../services/price-history';