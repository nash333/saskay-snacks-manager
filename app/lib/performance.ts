/**
 * Performance Marks Service
 * 
 * Provides structured performance measurement for the Shopify Embedded Cost & Margin Manager.
 * Implements the performance marks defined in Task 54 for granular performance visibility.
 * 
 * Performance Marks:
 * - app-load-start: Application initialization begins
 * - dashboard-first-render: Main dashboard completes first render
 * - ingredients-table-render: Ingredients table completes rendering
 * - pricing-panel-render: Pricing panel completes rendering
 * - global-save-click: User initiates global save operation
 * - global-save-complete: Global save operation completes
 * 
 * LCP (Largest Contentful Paint) Measurement:
 * The dashboard-first-render mark serves as a proxy for LCP measurement.
 * Target: <1.5s initial view as per performance budget.
 */

export type PerformanceMarkName = 
  | 'app-load-start'
  | 'dashboard-first-render'
  | 'ingredients-table-render'
  | 'pricing-panel-render'
  | 'global-save-click'
  | 'global-save-complete';

export interface PerformanceMeasurement {
  name: string;
  startTime: number;
  duration?: number;
  mark?: PerformanceMarkName;
  timestamp: string;
}

export interface PerformanceMetrics {
  appLoadTime?: number;
  dashboardRenderTime?: number;
  ingredientsTableRenderTime?: number;
  pricingPanelRenderTime?: number;
  globalSaveLatency?: number;
  lcpEstimate?: number;
}

class PerformanceTracker {
  private marks: Map<PerformanceMarkName, number> = new Map();
  private measurements: PerformanceMeasurement[] = [];
  private isEnabled: boolean;

  constructor() {
    // Enable performance tracking in development and when explicitly enabled
    this.isEnabled = typeof window !== 'undefined' && (
      process.env.NODE_ENV === 'development' ||
      process.env.ENABLE_PERFORMANCE_TRACKING === 'true' ||
      window.location.search.includes('perf=true')
    );
  }

  /**
   * Creates a performance mark with the given name
   */
  mark(name: PerformanceMarkName): void {
    if (!this.isEnabled || typeof window === 'undefined') return;

    try {
      const timestamp = performance.now();
      this.marks.set(name, timestamp);
      
      // Create browser performance mark for dev tools
      if ('mark' in performance) {
        performance.mark(name);
      }

      // Log structured performance data
      console.debug(`[Performance] Mark: ${name} at ${timestamp.toFixed(2)}ms`);
      
      // Store measurement record
      this.measurements.push({
        name,
        startTime: timestamp,
        mark: name,
        timestamp: new Date().toISOString()
      });

      // Calculate derived metrics when we have pairs
      this.calculateDerivedMetrics(name);
    } catch (error) {
      console.warn(`[Performance] Failed to create mark ${name}:`, error);
    }
  }

  /**
   * Measures duration between two marks
   */
  measure(name: string, startMark: PerformanceMarkName, endMark?: PerformanceMarkName): number | null {
    if (!this.isEnabled || typeof window === 'undefined') return null;

    try {
      const startTime = this.marks.get(startMark);
      if (!startTime) {
        console.warn(`[Performance] Start mark ${startMark} not found for measurement ${name}`);
        return null;
      }

      const endTime = endMark ? this.marks.get(endMark) : performance.now();
      if (endMark && !endTime) {
        console.warn(`[Performance] End mark ${endMark} not found for measurement ${name}`);
        return null;
      }

      const duration = (endTime || performance.now()) - startTime;

      // Create browser performance measure for dev tools
      if ('measure' in performance && endMark) {
        performance.measure(name, startMark, endMark);
      }

      // Store measurement record
      this.measurements.push({
        name,
        startTime,
        duration,
        timestamp: new Date().toISOString()
      });

      console.debug(`[Performance] Measure: ${name} = ${duration.toFixed(2)}ms`);
      return duration;
    } catch (error) {
      console.warn(`[Performance] Failed to measure ${name}:`, error);
      return null;
    }
  }

  /**
   * Gets current performance metrics summary
   */
  getMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};

    // App load time (from start to dashboard first render)
    const appStart = this.marks.get('app-load-start');
    const dashboardRender = this.marks.get('dashboard-first-render');
    if (appStart && dashboardRender) {
      metrics.appLoadTime = dashboardRender - appStart;
      metrics.lcpEstimate = metrics.appLoadTime; // Dashboard render as LCP proxy
    }

    // Individual component render times
    const ingredientsStart = this.marks.get('dashboard-first-render');
    const ingredientsEnd = this.marks.get('ingredients-table-render');
    if (ingredientsStart && ingredientsEnd) {
      metrics.ingredientsTableRenderTime = ingredientsEnd - ingredientsStart;
    }

    const pricingStart = this.marks.get('dashboard-first-render');
    const pricingEnd = this.marks.get('pricing-panel-render');
    if (pricingStart && pricingEnd) {
      metrics.pricingPanelRenderTime = pricingEnd - pricingStart;
    }

    // Global save latency
    const saveStart = this.marks.get('global-save-click');
    const saveEnd = this.marks.get('global-save-complete');
    if (saveStart && saveEnd) {
      metrics.globalSaveLatency = saveEnd - saveStart;
    }

    return metrics;
  }

  /**
   * Gets all recorded measurements
   */
  getAllMeasurements(): PerformanceMeasurement[] {
    return [...this.measurements];
  }

  /**
   * Clears all stored marks and measurements
   */
  clear(): void {
    this.marks.clear();
    this.measurements.length = 0;
    
    if (typeof window !== 'undefined' && 'clearMarks' in performance) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }

  /**
   * Reports performance metrics in a structured format for observability
   */
  report(): void {
    if (!this.isEnabled) return;

    const metrics = this.getMetrics();
    console.group('[Performance Report]');
    
    if (metrics.appLoadTime) {
      const status = metrics.appLoadTime < 1500 ? '✅' : '⚠️';
      console.log(`${status} App Load Time: ${metrics.appLoadTime.toFixed(2)}ms (target: <1500ms)`);
    }

    if (metrics.globalSaveLatency) {
      const status = metrics.globalSaveLatency < 100 ? '✅' : '⚠️';
      console.log(`${status} Global Save Latency: ${metrics.globalSaveLatency.toFixed(2)}ms (target: <100ms)`);
    }

    if (metrics.ingredientsTableRenderTime) {
      console.log(`📊 Ingredients Table Render: ${metrics.ingredientsTableRenderTime.toFixed(2)}ms`);
    }

    if (metrics.pricingPanelRenderTime) {
      console.log(`💰 Pricing Panel Render: ${metrics.pricingPanelRenderTime.toFixed(2)}ms`);
    }

    console.groupEnd();
  }

  /**
   * Calculates derived metrics when certain mark pairs are available
   */
  private calculateDerivedMetrics(name: PerformanceMarkName): void {
    // Auto-measure common intervals
    switch (name) {
      case 'dashboard-first-render':
        if (this.marks.has('app-load-start')) {
          this.measure('app-load-duration', 'app-load-start', 'dashboard-first-render');
        }
        break;
      case 'global-save-complete':
        if (this.marks.has('global-save-click')) {
          this.measure('global-save-duration', 'global-save-click', 'global-save-complete');
        }
        break;
      case 'ingredients-table-render':
        if (this.marks.has('dashboard-first-render')) {
          this.measure('ingredients-table-duration', 'dashboard-first-render', 'ingredients-table-render');
        }
        break;
      case 'pricing-panel-render':
        if (this.marks.has('dashboard-first-render')) {
          this.measure('pricing-panel-duration', 'dashboard-first-render', 'pricing-panel-render');
        }
        break;
    }
  }
}

// Singleton instance for global use
export const performanceTracker = new PerformanceTracker();

// Convenience functions for common usage patterns
export const markPerformance = (name: PerformanceMarkName) => performanceTracker.mark(name);
export const measurePerformance = (name: string, startMark: PerformanceMarkName, endMark?: PerformanceMarkName) => 
  performanceTracker.measure(name, startMark, endMark);
export const getPerformanceMetrics = () => performanceTracker.getMetrics();
export const reportPerformance = () => performanceTracker.report();

// Auto-mark app load start when this module is imported
if (typeof window !== 'undefined') {
  performanceTracker.mark('app-load-start');
}

/**
 * Performance Budget Validation
 * 
 * Validates that key metrics meet the performance budgets defined in the constitution:
 * - LCP <1.5s initial view
 * - Interactions <100ms perceived
 * - ≤2 API round trips per primary save
 * - Initial critical JS ≤220KB compressed
 */
export function validatePerformanceBudgets(): {
  passed: boolean;
  violations: string[];
  metrics: PerformanceMetrics;
} {
  const metrics = performanceTracker.getMetrics();
  const violations: string[] = [];

  // LCP Budget: <1.5s
  if (metrics.lcpEstimate && metrics.lcpEstimate > 1500) {
    violations.push(`LCP estimate ${metrics.lcpEstimate.toFixed(2)}ms exceeds 1500ms target`);
  }

  // Interaction Budget: <100ms for saves
  if (metrics.globalSaveLatency && metrics.globalSaveLatency > 100) {
    violations.push(`Global save latency ${metrics.globalSaveLatency.toFixed(2)}ms exceeds 100ms target`);
  }

  return {
    passed: violations.length === 0,
    violations,
    metrics
  };
}

/**
 * Hook for React components to easily integrate performance marking
 */
export function usePerformanceMarking() {
  return {
    mark: markPerformance,
    measure: measurePerformance,
    getMetrics: getPerformanceMetrics,
    report: reportPerformance
  };
}