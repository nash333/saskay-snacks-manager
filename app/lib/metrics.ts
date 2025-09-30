/**
 * Metrics Capture System
 * 
 * Provides metrics collection for the Shopify Embedded Cost & Margin Manager.
 * Implements Task 56 requirements for observability metrics capture.
 * 
 * Key Metrics:
 * - save_latency_ms (histogram): Global save operation latency
 * - save_conflict_total (counter): Number of conflict events during saves
 * - save_override_total (counter): Number of override operations
 * - audit_prune_total (counter): Number of audit log pruning events
 * - retention_prune_total (counter): Number of retention pruning events
 * - in_memory_pending_changes_count (gauge): Number of unsaved changes
 */

export type MetricType = 'counter' | 'histogram' | 'gauge' | 'summary';

export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface HistogramBucket {
  upperBound: number;
  count: number;
}

export interface HistogramData {
  buckets: HistogramBucket[];
  count: number;
  sum: number;
  min: number;
  max: number;
}

export interface CounterData {
  value: number;
  increments: MetricValue[];
}

export interface GaugeData {
  value: number;
  history: MetricValue[];
}

export interface MetricSnapshot {
  name: string;
  type: MetricType;
  help: string;
  data: HistogramData | CounterData | GaugeData;
  labels: Record<string, string>;
}

export interface MetricsConfig {
  enableHistogramBuckets: boolean;
  histogramBuckets: number[];
  maxHistorySize: number;
  sampleRate: number;
}

class MetricsCollector {
  private counters = new Map<string, CounterData>();
  private histograms = new Map<string, HistogramData>();
  private gauges = new Map<string, GaugeData>();
  private config: MetricsConfig;
  private isEnabled: boolean;

  constructor(config?: Partial<MetricsConfig>) {
    this.config = {
      enableHistogramBuckets: true,
      histogramBuckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
      maxHistorySize: 1000,
      sampleRate: 1.0,
      ...config
    };

    this.isEnabled = this.shouldEnableMetrics();
    this.initializeAppMetrics();
  }

  /**
   * Increments a counter metric
   */
  incrementCounter(
    name: string,
    value = 1,
    labels: Record<string, string> = {}
  ): void {
    if (!this.isEnabled || !this.shouldSample()) return;

    if (!this.counters.has(name)) {
      this.counters.set(name, {
        value: 0,
        increments: []
      });
    }

    const counter = this.counters.get(name)!;
    counter.value += value;
    counter.increments.push({
      value,
      timestamp: Date.now(),
      labels
    });

    // Maintain history size
    if (counter.increments.length > this.config.maxHistorySize) {
      counter.increments.splice(0, counter.increments.length - this.config.maxHistorySize);
    }

    this.debugLog(`Counter ${name} incremented by ${value} (total: ${counter.value})`, labels);
  }

  /**
   * Records a histogram observation
   */
  recordHistogram(
    name: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    if (!this.isEnabled || !this.shouldSample()) return;

    if (!this.histograms.has(name)) {
      this.histograms.set(name, {
        buckets: this.config.histogramBuckets.map(upperBound => ({
          upperBound,
          count: 0
        })),
        count: 0,
        sum: 0,
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY
      });
    }

    const histogram = this.histograms.get(name)!;
    
    // Update statistics
    histogram.count++;
    histogram.sum += value;
    histogram.min = Math.min(histogram.min, value);
    histogram.max = Math.max(histogram.max, value);

    // Update buckets
    if (this.config.enableHistogramBuckets) {
      for (const bucket of histogram.buckets) {
        if (value <= bucket.upperBound) {
          bucket.count++;
        }
      }
    }

    this.debugLog(`Histogram ${name} recorded value ${value} (count: ${histogram.count})`, labels);
  }

  /**
   * Sets a gauge value
   */
  setGauge(
    name: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    if (!this.isEnabled) return;

    if (!this.gauges.has(name)) {
      this.gauges.set(name, {
        value: 0,
        history: []
      });
    }

    const gauge = this.gauges.get(name)!;
    gauge.value = value;
    gauge.history.push({
      value,
      timestamp: Date.now(),
      labels
    });

    // Maintain history size
    if (gauge.history.length > this.config.maxHistorySize) {
      gauge.history.splice(0, gauge.history.length - this.config.maxHistorySize);
    }

    this.debugLog(`Gauge ${name} set to ${value}`, labels);
  }

  /**
   * Convenience methods for application-specific metrics
   */

  // Save operation metrics
  recordSaveLatency(latencyMs: number, operationType: string = 'global'): void {
    this.recordHistogram('save_latency_ms', latencyMs, { operation_type: operationType });
  }

  incrementSaveConflicts(count = 1): void {
    this.incrementCounter('save_conflict_total', count);
  }

  incrementSaveOverrides(count = 1): void {
    this.incrementCounter('save_override_total', count);
  }

  // Audit and retention metrics
  incrementAuditPrunes(recordsPruned: number): void {
    this.incrementCounter('audit_prune_total', 1);
    this.recordHistogram('audit_prune_records', recordsPruned);
  }

  incrementRetentionPrunes(recordsPruned: number): void {
    this.incrementCounter('retention_prune_total', 1);
    this.recordHistogram('retention_prune_records', recordsPruned);
  }

  // UI state metrics
  setPendingChangesCount(count: number): void {
    this.setGauge('in_memory_pending_changes_count', count);
  }

  // Component render metrics
  recordComponentRender(componentName: string, renderTimeMs: number): void {
    this.recordHistogram('component_render_ms', renderTimeMs, { component: componentName });
  }

  // API interaction metrics
  recordApiCall(endpoint: string, latencyMs: number, status: 'success' | 'error'): void {
    this.recordHistogram('api_call_latency_ms', latencyMs, { endpoint, status });
    this.incrementCounter('api_calls_total', 1, { endpoint, status });
  }

  /**
   * Gets a snapshot of all current metrics
   */
  getMetricsSnapshot(): MetricSnapshot[] {
    const snapshots: MetricSnapshot[] = [];

    // Counters
    for (const [name, data] of this.counters) {
      snapshots.push({
        name,
        type: 'counter',
        help: this.getMetricHelp(name),
        data,
        labels: {}
      });
    }

    // Histograms
    for (const [name, data] of this.histograms) {
      snapshots.push({
        name,
        type: 'histogram',
        help: this.getMetricHelp(name),
        data,
        labels: {}
      });
    }

    // Gauges
    for (const [name, data] of this.gauges) {
      snapshots.push({
        name,
        type: 'gauge',
        help: this.getMetricHelp(name),
        data,
        labels: {}
      });
    }

    return snapshots;
  }

  /**
   * Exports metrics in Prometheus format
   */
  exportPrometheusFormat(): string {
    const lines: string[] = [];
    const snapshots = this.getMetricsSnapshot();

    for (const snapshot of snapshots) {
      lines.push(`# HELP ${snapshot.name} ${snapshot.help}`);
      lines.push(`# TYPE ${snapshot.name} ${snapshot.type}`);

      if (snapshot.type === 'counter') {
        const data = snapshot.data as CounterData;
        lines.push(`${snapshot.name} ${data.value}`);
      } else if (snapshot.type === 'histogram') {
        const data = snapshot.data as HistogramData;
        
        // Buckets
        for (const bucket of data.buckets) {
          lines.push(`${snapshot.name}_bucket{le="${bucket.upperBound}"} ${bucket.count}`);
        }
        lines.push(`${snapshot.name}_bucket{le="+Inf"} ${data.count}`);
        
        // Summary stats
        lines.push(`${snapshot.name}_count ${data.count}`);
        lines.push(`${snapshot.name}_sum ${data.sum}`);
      } else if (snapshot.type === 'gauge') {
        const data = snapshot.data as GaugeData;
        lines.push(`${snapshot.name} ${data.value}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Gets summary statistics for key metrics
   */
  getSummaryStats(): Record<string, any> {
    const summary: Record<string, any> = {};

    // Save performance
    const saveLatency = this.histograms.get('save_latency_ms');
    if (saveLatency && saveLatency.count > 0) {
      summary.saveLatency = {
        avg: saveLatency.sum / saveLatency.count,
        min: saveLatency.min,
        max: saveLatency.max,
        count: saveLatency.count,
        p95: this.calculatePercentile(saveLatency, 0.95)
      };
    }

    // Conflict rates
    const conflicts = this.counters.get('save_conflict_total')?.value || 0;
    const saves = saveLatency?.count || 0;
    if (saves > 0) {
      summary.conflictRate = conflicts / saves;
    }

    // Current state
    summary.pendingChanges = this.gauges.get('in_memory_pending_changes_count')?.value || 0;
    summary.totalConflicts = conflicts;
    summary.totalOverrides = this.counters.get('save_override_total')?.value || 0;
    summary.totalPrunes = this.counters.get('audit_prune_total')?.value || 0;

    return summary;
  }

  /**
   * Clears all metrics data
   */
  clear(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
    this.initializeAppMetrics();
  }

  /**
   * Generates a metrics report
   */
  generateReport(): string {
    const summary = this.getSummaryStats();
    const lines: string[] = [];

    lines.push('=== METRICS REPORT ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    if (summary.saveLatency) {
      lines.push('📊 Save Performance:');
      lines.push(`  Average Latency: ${summary.saveLatency.avg.toFixed(2)}ms`);
      lines.push(`  Min/Max: ${summary.saveLatency.min}ms / ${summary.saveLatency.max}ms`);
      lines.push(`  P95 Latency: ${summary.saveLatency.p95.toFixed(2)}ms`);
      lines.push(`  Total Saves: ${summary.saveLatency.count}`);
      lines.push('');
    }

    lines.push('⚡ Conflict & Override Stats:');
    lines.push(`  Conflict Rate: ${((summary.conflictRate || 0) * 100).toFixed(1)}%`);
    lines.push(`  Total Conflicts: ${summary.totalConflicts}`);
    lines.push(`  Total Overrides: ${summary.totalOverrides}`);
    lines.push('');

    lines.push('🧹 Maintenance:');
    lines.push(`  Pruning Events: ${summary.totalPrunes}`);
    lines.push(`  Pending Changes: ${summary.pendingChanges}`);
    lines.push('');

    return lines.join('\n');
  }

  private shouldEnableMetrics(): boolean {
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.ENABLE_METRICS === 'true' ||
      (typeof window !== 'undefined' && window.location.search.includes('metrics=true'))
    );
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private initializeAppMetrics(): void {
    // Initialize gauges with default values
    this.setGauge('in_memory_pending_changes_count', 0);
  }

  private debugLog(message: string, labels?: Record<string, string>): void {
    if (process.env.NODE_ENV === 'development' && this.isEnabled) {
      console.debug(`[Metrics] ${message}`, labels || {});
    }
  }

  private getMetricHelp(name: string): string {
    const helpText: Record<string, string> = {
      'save_latency_ms': 'Latency of global save operations in milliseconds',
      'save_conflict_total': 'Total number of version conflicts during save operations',
      'save_override_total': 'Total number of conflict override operations',
      'audit_prune_total': 'Total number of audit log pruning events',
      'retention_prune_total': 'Total number of retention pruning events',
      'in_memory_pending_changes_count': 'Number of unsaved changes in memory',
      'component_render_ms': 'Component render time in milliseconds',
      'api_call_latency_ms': 'API call latency in milliseconds',
      'api_calls_total': 'Total number of API calls',
      'audit_prune_records': 'Number of records pruned during audit cleanup',
      'retention_prune_records': 'Number of records pruned during retention cleanup'
    };

    return helpText[name] || `Metric: ${name}`;
  }

  private calculatePercentile(histogram: HistogramData, percentile: number): number {
    if (histogram.count === 0) return 0;

    const targetCount = Math.ceil(histogram.count * percentile);
    let cumulativeCount = 0;

    for (const bucket of histogram.buckets) {
      cumulativeCount += bucket.count;
      if (cumulativeCount >= targetCount) {
        return bucket.upperBound;
      }
    }

    return histogram.max;
  }
}

// Singleton instance for global use
export const metricsCollector = new MetricsCollector();

// Convenience functions for common usage patterns
export const recordSaveLatency = (latencyMs: number, operationType?: string) => 
  metricsCollector.recordSaveLatency(latencyMs, operationType);

export const incrementSaveConflicts = (count?: number) => 
  metricsCollector.incrementSaveConflicts(count);

export const incrementSaveOverrides = (count?: number) => 
  metricsCollector.incrementSaveOverrides(count);

export const incrementAuditPrunes = (recordsPruned: number) => 
  metricsCollector.incrementAuditPrunes(recordsPruned);

export const setPendingChangesCount = (count: number) => 
  metricsCollector.setPendingChangesCount(count);

export const recordComponentRender = (componentName: string, renderTimeMs: number) => 
  metricsCollector.recordComponentRender(componentName, renderTimeMs);

export const recordApiCall = (endpoint: string, latencyMs: number, status: 'success' | 'error') => 
  metricsCollector.recordApiCall(endpoint, latencyMs, status);

export const getMetricsSnapshot = () => metricsCollector.getMetricsSnapshot();

export const getSummaryStats = () => metricsCollector.getSummaryStats();

export const generateMetricsReport = () => metricsCollector.generateReport();

/**
 * Hook for React components to easily integrate metrics collection
 */
export function useMetrics() {
  return {
    recordSaveLatency,
    incrementSaveConflicts,
    incrementSaveOverrides,
    incrementAuditPrunes,
    setPendingChangesCount,
    recordComponentRender,
    recordApiCall,
    getSnapshot: getMetricsSnapshot,
    getSummary: getSummaryStats,
    generateReport: generateMetricsReport
  };
}

/**
 * Performance timing decorator for automatic metrics collection
 */
export function withMetrics<T extends (...args: any[]) => any>(
  metricName: string,
  fn: T
): T {
  return ((...args: any[]) => {
    const startTime = performance.now();
    const result = fn(...args);
    
    if (result instanceof Promise) {
      return result
        .then((data) => {
          const latency = performance.now() - startTime;
          metricsCollector.recordHistogram(`${metricName}_latency_ms`, latency);
          metricsCollector.incrementCounter(`${metricName}_total`, 1, { status: 'success' });
          return data;
        })
        .catch((error) => {
          const latency = performance.now() - startTime;
          metricsCollector.recordHistogram(`${metricName}_latency_ms`, latency);
          metricsCollector.incrementCounter(`${metricName}_total`, 1, { status: 'error' });
          throw error;
        });
    } else {
      const latency = performance.now() - startTime;
      metricsCollector.recordHistogram(`${metricName}_latency_ms`, latency);
      metricsCollector.incrementCounter(`${metricName}_total`, 1, { status: 'success' });
      return result;
    }
  }) as T;
}