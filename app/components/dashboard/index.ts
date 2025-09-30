// Dashboard components for pricing and profit analysis
export { PricingDashboard } from './PricingDashboard';
export { CostTrendsChart } from './CostTrendsChart';
export { CompetitorAnalysis } from './CompetitorAnalysis';
export { ProfitMarginAnalyzer } from './ProfitMarginAnalyzer';

// Type exports for dashboard data
export type { 
  PricingData, 
  PricingMetrics 
} from './PricingDashboard';

export type {
  CostTrendData,
  TrendSummary
} from './CostTrendsChart';

export type {
  CompetitorData,
  CompetitorProduct,
  CompetitorComparison
} from './CompetitorAnalysis';

export type {
  ProfitAnalysisData,
  MarginTargets
} from './ProfitMarginAnalyzer';