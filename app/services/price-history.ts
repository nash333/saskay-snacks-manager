/**
 * Price History Pagination Service (Task 23)
 * Implements price history query endpoint with pagination (FR-037, FR-018)
 * Provides efficient historical price data retrieval and analysis
 */

export interface PriceHistoryQuery {
  ingredientId?: string;
  startDate?: Date;
  endDate?: Date;
  changeType?: 'increase' | 'decrease' | 'both';
  minChangeAmount?: number;
  maxChangeAmount?: number;
  minChangePercent?: number;
  maxChangePercent?: number;
  includeAuditInfo?: boolean;
}

export interface PriceHistoryEntry {
  id: string;
  ingredientId: string;
  ingredientName: string;
  timestamp: Date;
  previousCost: number;
  newCost: number;
  changeAmount: number;
  changePercent: number;
  changeReason?: string;
  userId?: string;
  auditEntryId?: string;
}

export interface PriceHistoryPaginationOptions {
  limit?: number; // Default: 50, Max: 500
  offset?: number; // Default: 0
  sortBy?: 'timestamp' | 'changeAmount' | 'changePercent' | 'ingredientName';
  sortOrder?: 'asc' | 'desc';
}

export interface PriceHistoryPage {
  entries: PriceHistoryEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrevious: boolean;
    totalPages: number;
    currentPage: number;
  };
  summary: {
    dateRange: { start: Date; end: Date };
    totalChanges: number;
    averageChangeAmount: number;
    averageChangePercent: number;
    largestIncrease: { amount: number; percent: number };
    largestDecrease: { amount: number; percent: number };
  };
}

export interface PriceHistoryAggregates {
  ingredientId: string;
  ingredientName: string;
  totalChanges: number;
  firstRecordedPrice: number;
  currentPrice: number;
  overallChange: { amount: number; percent: number };
  lastUpdated: Date;
  changeFrequency: number; // Changes per month
  volatilityScore: number; // 0-100, higher = more volatile
}

/**
 * Price History Pagination Service
 */
export class PriceHistoryService {
  private metaobjects: any;
  private auditLog: any;

  constructor(metaobjectsService: any, auditLogService: any) {
    this.metaobjects = metaobjectsService;
    this.auditLog = auditLogService;
  }

  /**
   * Get paginated price history
   */
  async getPaginatedPriceHistory(
    query: PriceHistoryQuery = {},
    pagination: PriceHistoryPaginationOptions = {}
  ): Promise<PriceHistoryPage> {
    // Set defaults
    const limit = Math.min(pagination.limit || 50, 500);
    const offset = pagination.offset || 0;
    const sortBy = pagination.sortBy || 'timestamp';
    const sortOrder = pagination.sortOrder || 'desc';

    // Get price history from metaobjects service
    const priceHistoryData = await this.metaobjects.getPriceHistory({
      ingredientId: query.ingredientId,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: limit + 1, // Get one extra to check hasNext
      offset
    });

    // Transform raw data to PriceHistoryEntry format
    let entries = priceHistoryData.entries.map((entry: any) => this.transformToPriceHistoryEntry(entry));

    // Apply filters
    entries = this.applyFilters(entries, query);

    // Apply sorting
    entries = this.applySorting(entries, sortBy, sortOrder);

    // Check if we have more results
    const hasNext = entries.length > limit;
    if (hasNext) {
      entries = entries.slice(0, limit); // Remove the extra entry
    }

    const total = priceHistoryData.total || entries.length;
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    // Calculate summary statistics
    const summary = this.calculateSummary(entries);

    return {
      entries,
      pagination: {
        total,
        limit,
        offset,
        hasNext,
        hasPrevious: offset > 0,
        totalPages,
        currentPage
      },
      summary
    };
  }

  /**
   * Get price history for specific ingredient
   */
  async getIngredientPriceHistory(
    ingredientId: string,
    pagination: PriceHistoryPaginationOptions = {}
  ): Promise<PriceHistoryPage> {
    return this.getPaginatedPriceHistory(
      { ingredientId },
      pagination
    );
  }

  /**
   * Get recent price changes across all ingredients
   */
  async getRecentPriceChanges(
    daysBack: number = 30,
    pagination: PriceHistoryPaginationOptions = {}
  ): Promise<PriceHistoryPage> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);

    return this.getPaginatedPriceHistory(
      { startDate, endDate },
      { ...pagination, sortBy: 'timestamp', sortOrder: 'desc' }
    );
  }

  /**
   * Get significant price changes (above threshold)
   */
  async getSignificantPriceChanges(
    minChangePercent: number = 10,
    daysBack?: number,
    pagination: PriceHistoryPaginationOptions = {}
  ): Promise<PriceHistoryPage> {
    const query: PriceHistoryQuery = { minChangePercent };
    
    if (daysBack) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      query.startDate = startDate;
      query.endDate = endDate;
    }

    return this.getPaginatedPriceHistory(
      query,
      { ...pagination, sortBy: 'changePercent', sortOrder: 'desc' }
    );
  }

  /**
   * Get price history aggregates by ingredient
   */
  async getPriceHistoryAggregates(
    ingredientIds?: string[]
  ): Promise<PriceHistoryAggregates[]> {
    const aggregates: PriceHistoryAggregates[] = [];

    // Get ingredients to analyze
    const ingredients = ingredientIds 
      ? await this.getIngredientsByIds(ingredientIds)
      : await this.metaobjects.listIngredients({ limit: 1000 });

    for (const ingredient of ingredients) {
      const history = await this.getPaginatedPriceHistory(
        { ingredientId: ingredient.id },
        { limit: 1000, sortBy: 'timestamp', sortOrder: 'asc' }
      );

      if (history.entries.length === 0) {
        continue; // Skip ingredients with no price history
      }

      const firstEntry = history.entries[0];
      const lastEntry = history.entries[history.entries.length - 1];
      
      // Calculate change frequency (changes per month)
      const daysBetween = Math.max(1, 
        (lastEntry.timestamp.getTime() - firstEntry.timestamp.getTime()) / (1000 * 60 * 60 * 24)
      );
      const changeFrequency = (history.entries.length / daysBetween) * 30;

      // Calculate volatility score (standard deviation of change percentages)
      const volatilityScore = this.calculateVolatilityScore(history.entries);

      const overallChangeAmount = lastEntry.newCost - firstEntry.previousCost;
      const overallChangePercent = firstEntry.previousCost > 0 
        ? (overallChangeAmount / firstEntry.previousCost) * 100
        : 0;

      aggregates.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        totalChanges: history.entries.length,
        firstRecordedPrice: firstEntry.previousCost,
        currentPrice: lastEntry.newCost,
        overallChange: {
          amount: overallChangeAmount,
          percent: overallChangePercent
        },
        lastUpdated: lastEntry.timestamp,
        changeFrequency,
        volatilityScore
      });
    }

    return aggregates.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  }

  /**
   * Export price history to CSV format
   */
  async exportPriceHistoryCSV(
    query: PriceHistoryQuery = {},
    maxRecords: number = 10000
  ): Promise<string> {
    const history = await this.getPaginatedPriceHistory(
      query,
      { limit: maxRecords, sortBy: 'timestamp', sortOrder: 'desc' }
    );

    const headers = [
      'Ingredient ID',
      'Ingredient Name', 
      'Timestamp',
      'Previous Cost',
      'New Cost',
      'Change Amount',
      'Change Percent',
      'Change Reason',
      'User ID',
      'Audit Entry ID'
    ];

    const csvRows = [headers.join(',')];

    history.entries.forEach(entry => {
      const row = [
        entry.ingredientId,
        `"${entry.ingredientName}"`,
        entry.timestamp.toISOString(),
        entry.previousCost.toFixed(4),
        entry.newCost.toFixed(4),
        entry.changeAmount.toFixed(4),
        entry.changePercent.toFixed(2),
        `"${entry.changeReason || ''}"`,
        entry.userId || '',
        entry.auditEntryId || ''
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Get price trend analysis
   */
  async getPriceTrendAnalysis(
    ingredientId: string,
    daysBack: number = 90
  ): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    trendStrength: number; // 0-1
    averageMonthlyChange: number;
    projectedNextMonthPrice: number;
    confidence: number; // 0-1
    dataPoints: number;
    analysisDate: Date;
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);

    const history = await this.getPaginatedPriceHistory(
      { ingredientId, startDate, endDate },
      { limit: 1000, sortBy: 'timestamp', sortOrder: 'asc' }
    );

    if (history.entries.length < 2) {
      return {
        trend: 'stable',
        trendStrength: 0,
        averageMonthlyChange: 0,
        projectedNextMonthPrice: history.entries[0]?.newCost || 0,
        confidence: 0,
        dataPoints: history.entries.length,
        analysisDate: new Date()
      };
    }

    // Calculate linear trend
    const prices = history.entries.map(entry => entry.newCost);
    const dates = history.entries.map(entry => entry.timestamp.getTime());
    
    const { slope, rSquared } = this.calculateLinearRegression(dates, prices);
    
    // Determine trend direction
    let trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    const slopeThreshold = 0.001; // Adjust based on typical price ranges
    
    if (Math.abs(slope) < slopeThreshold) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Check for volatility
    const volatilityScore = this.calculateVolatilityScore(history.entries);
    if (volatilityScore > 50) { // High volatility threshold
      trend = 'volatile';
    }

    // Calculate monthly change rate
    const daySpan = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
    const averageMonthlyChange = slope * 30; // Convert daily slope to monthly

    // Project next month price
    const currentPrice = prices[prices.length - 1];
    const projectedNextMonthPrice = Math.max(0, currentPrice + averageMonthlyChange);

    return {
      trend,
      trendStrength: Math.abs(slope),
      averageMonthlyChange,
      projectedNextMonthPrice,
      confidence: rSquared,
      dataPoints: history.entries.length,
      analysisDate: new Date()
    };
  }

  // Private helper methods

  private transformToPriceHistoryEntry(rawEntry: any): PriceHistoryEntry {
    const changeAmount = rawEntry.newCost - rawEntry.previousCost;
    const changePercent = rawEntry.previousCost > 0 
      ? (changeAmount / rawEntry.previousCost) * 100 
      : 0;

    return {
      id: rawEntry.id,
      ingredientId: rawEntry.ingredientId,
      ingredientName: rawEntry.ingredientName,
      timestamp: new Date(rawEntry.timestamp),
      previousCost: rawEntry.previousCost,
      newCost: rawEntry.newCost,
      changeAmount,
      changePercent,
      changeReason: rawEntry.changeReason,
      userId: rawEntry.userId,
      auditEntryId: rawEntry.auditEntryId
    };
  }

  private applyFilters(entries: PriceHistoryEntry[], query: PriceHistoryQuery): PriceHistoryEntry[] {
    return entries.filter(entry => {
      // Change type filter
      if (query.changeType) {
        if (query.changeType === 'increase' && entry.changeAmount <= 0) return false;
        if (query.changeType === 'decrease' && entry.changeAmount >= 0) return false;
      }

      // Change amount filters
      if (query.minChangeAmount !== undefined && Math.abs(entry.changeAmount) < query.minChangeAmount) {
        return false;
      }
      if (query.maxChangeAmount !== undefined && Math.abs(entry.changeAmount) > query.maxChangeAmount) {
        return false;
      }

      // Change percent filters
      if (query.minChangePercent !== undefined && Math.abs(entry.changePercent) < query.minChangePercent) {
        return false;
      }
      if (query.maxChangePercent !== undefined && Math.abs(entry.changePercent) > query.maxChangePercent) {
        return false;
      }

      return true;
    });
  }

  private applySorting(
    entries: PriceHistoryEntry[], 
    sortBy: string, 
    sortOrder: string
  ): PriceHistoryEntry[] {
    return entries.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'changeAmount':
          comparison = Math.abs(a.changeAmount) - Math.abs(b.changeAmount);
          break;
        case 'changePercent':
          comparison = Math.abs(a.changePercent) - Math.abs(b.changePercent);
          break;
        case 'ingredientName':
          comparison = a.ingredientName.localeCompare(b.ingredientName);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  private calculateSummary(entries: PriceHistoryEntry[]) {
    if (entries.length === 0) {
      return {
        dateRange: { start: new Date(), end: new Date() },
        totalChanges: 0,
        averageChangeAmount: 0,
        averageChangePercent: 0,
        largestIncrease: { amount: 0, percent: 0 },
        largestDecrease: { amount: 0, percent: 0 }
      };
    }

    const timestamps = entries.map(e => e.timestamp);
    const changeAmounts = entries.map(e => e.changeAmount);
    const changePercents = entries.map(e => e.changePercent);

    const increases = entries.filter(e => e.changeAmount > 0);
    const decreases = entries.filter(e => e.changeAmount < 0);

    return {
      dateRange: {
        start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
        end: new Date(Math.max(...timestamps.map(t => t.getTime())))
      },
      totalChanges: entries.length,
      averageChangeAmount: changeAmounts.reduce((sum, amt) => sum + amt, 0) / entries.length,
      averageChangePercent: changePercents.reduce((sum, pct) => sum + pct, 0) / entries.length,
      largestIncrease: {
        amount: increases.length > 0 ? Math.max(...increases.map(e => e.changeAmount)) : 0,
        percent: increases.length > 0 ? Math.max(...increases.map(e => e.changePercent)) : 0
      },
      largestDecrease: {
        amount: decreases.length > 0 ? Math.min(...decreases.map(e => e.changeAmount)) : 0,
        percent: decreases.length > 0 ? Math.min(...decreases.map(e => e.changePercent)) : 0
      }
    };
  }

  private calculateVolatilityScore(entries: PriceHistoryEntry[]): number {
    if (entries.length < 2) return 0;

    const changePercents = entries.map(e => e.changePercent);
    const mean = changePercents.reduce((sum, pct) => sum + pct, 0) / changePercents.length;
    
    const squaredDiffs = changePercents.map(pct => Math.pow(pct - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / changePercents.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert to 0-100 scale (adjust multiplier based on typical price volatility)
    return Math.min(100, standardDeviation * 2);
  }

  private calculateLinearRegression(xValues: number[], yValues: number[]): { slope: number; rSquared: number } {
    const n = xValues.length;
    if (n < 2) return { slope: 0, rSquared: 0 };

    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

    const numerator = xValues.reduce((sum, x, i) => sum + (x - xMean) * (yValues[i] - yMean), 0);
    const denominator = xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);

    const slope = denominator === 0 ? 0 : numerator / denominator;

    // Calculate R-squared
    const yPredicted = xValues.map(x => slope * (x - xMean) + yMean);
    const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssRes = yValues.reduce((sum, y, i) => sum + Math.pow(y - yPredicted[i], 2), 0);
    
    const rSquared = ssTotal === 0 ? 1 : 1 - (ssRes / ssTotal);

    return { slope, rSquared: Math.max(0, Math.min(1, rSquared)) };
  }

  private async getIngredientsByIds(ingredientIds: string[]): Promise<any[]> {
    // This would use the metaobjects service to get ingredients by IDs
    // For now, return empty array as placeholder
    return [];
  }
}