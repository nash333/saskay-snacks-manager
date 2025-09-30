/**
 * Structured Logging Helper
 * 
 * Provides structured logging for the Shopify Embedded Cost & Margin Manager.
 * Implements Task 55 requirements for observability of save/conflict/override events.
 * 
 * Key Events:
 * - Global save operations (FR-028, FR-031)
 * - Conflict detection and resolution (FR-019, FR-032)
 * - Override operations with audit trails (FR-018, FR-019)
 * - Price change audit logging (FR-018)
 * - Retention pruning events (FR-018)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  merchantId?: string;
  shopId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  operationId?: string;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  action: string;
  context: LogContext;
  metadata?: Record<string, any>;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

// Specific event types for type safety
export interface SaveEvent {
  action: 'global_save_start' | 'global_save_complete' | 'global_save_error';
  ingredientCount?: number;
  recipeCount?: number;
  packagingCount?: number;
  conflictCount?: number;
  overrideCount?: number;
  batchSize?: number;
  apiCalls?: number;
}

export interface ConflictEvent {
  action: 'conflict_detected' | 'conflict_refreshed' | 'conflict_overridden';
  conflictedItems: Array<{
    type: 'ingredient' | 'recipe' | 'packaging';
    id: string;
    localVersion: string;
    remoteVersion: string;
  }>;
  resolutionStrategy?: 'refresh' | 'override';
}

export interface AuditEvent {
  action: 'price_changed' | 'ingredient_modified' | 'recipe_modified' | 'packaging_modified';
  entityType: 'ingredient' | 'recipe' | 'packaging';
  entityId: string;
  changes: Record<string, { from: any; to: any }>;
  priorRemoteValues?: Record<string, any>;
}

export interface RetentionEvent {
  action: 'audit_pruned' | 'history_pruned';
  recordsRemoved: number;
  cutoffDate: string;
  totalRecordsRemaining: number;
}

class StructuredLogger {
  private context: LogContext = {};
  private isEnabled: boolean;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;

  constructor() {
    this.isEnabled = this.shouldEnableLogging();
  }

  /**
   * Sets the global context for all subsequent log entries
   */
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clears the global context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Gets the current global context
   */
  getContext(): LogContext {
    return { ...this.context };
  }

  /**
   * Logs a structured entry
   */
  log(
    level: LogLevel,
    action: string,
    message: string,
    metadata?: Record<string, any>,
    duration?: number,
    error?: Error
  ): void {
    if (!this.isEnabled) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      action,
      context: { ...this.context },
      metadata,
      duration,
      error: error ? this.serializeError(error) : undefined
    };

    this.writeLog(entry);
    this.bufferLog(entry);
  }

  /**
   * Logs a global save event
   */
  logSaveEvent(event: SaveEvent, message?: string, duration?: number, error?: Error): void {
    this.log(
      error ? 'error' : 'info',
      event.action,
      message || this.getDefaultSaveMessage(event.action),
      {
        ingredientCount: event.ingredientCount,
        recipeCount: event.recipeCount,
        packagingCount: event.packagingCount,
        conflictCount: event.conflictCount,
        overrideCount: event.overrideCount,
        batchSize: event.batchSize,
        apiCalls: event.apiCalls
      },
      duration,
      error
    );
  }

  /**
   * Logs a conflict resolution event
   */
  logConflictEvent(event: ConflictEvent, message?: string): void {
    this.log(
      'warn',
      event.action,
      message || this.getDefaultConflictMessage(event.action),
      {
        conflictedItems: event.conflictedItems,
        conflictCount: event.conflictedItems.length,
        resolutionStrategy: event.resolutionStrategy,
        itemTypes: this.summarizeConflictTypes(event.conflictedItems)
      }
    );
  }

  /**
   * Logs an audit trail event
   */
  logAuditEvent(event: AuditEvent, message?: string): void {
    this.log(
      'info',
      event.action,
      message || this.getDefaultAuditMessage(event.action),
      {
        entityType: event.entityType,
        entityId: event.entityId,
        changeCount: Object.keys(event.changes).length,
        changedFields: Object.keys(event.changes),
        changes: event.changes,
        priorRemoteValues: event.priorRemoteValues
      }
    );
  }

  /**
   * Logs a retention pruning event
   */
  logRetentionEvent(event: RetentionEvent, message?: string): void {
    this.log(
      'info',
      event.action,
      message || this.getDefaultRetentionMessage(event.action),
      {
        recordsRemoved: event.recordsRemoved,
        cutoffDate: event.cutoffDate,
        totalRecordsRemaining: event.totalRecordsRemaining,
        pruningRatio: event.recordsRemoved / (event.recordsRemoved + event.totalRecordsRemaining)
      }
    );
  }

  /**
   * Creates a timing logger for measuring operation duration
   */
  startTimer(action: string): {
    complete: (message?: string, metadata?: Record<string, any>) => void;
    error: (error: Error, message?: string, metadata?: Record<string, any>) => void;
  } {
    const startTime = performance.now();
    
    return {
      complete: (message?: string, metadata?: Record<string, any>) => {
        const duration = performance.now() - startTime;
        this.log('info', action, message || `${action} completed`, metadata, duration);
      },
      error: (error: Error, message?: string, metadata?: Record<string, any>) => {
        const duration = performance.now() - startTime;
        this.log('error', action, message || `${action} failed`, metadata, duration, error);
      }
    };
  }

  /**
   * Gets recent log entries from buffer
   */
  getRecentLogs(count = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Clears the log buffer
   */
  clearBuffer(): void {
    this.logBuffer.length = 0;
  }

  /**
   * Exports logs in JSON format for external analysis
   */
  exportLogs(filterLevel?: LogLevel): string {
    const logs = filterLevel 
      ? this.logBuffer.filter(log => this.getLogLevelPriority(log.level) >= this.getLogLevelPriority(filterLevel))
      : this.logBuffer;
    
    return JSON.stringify(logs, null, 2);
  }

  private shouldEnableLogging(): boolean {
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.ENABLE_STRUCTURED_LOGGING === 'true' ||
      (typeof window !== 'undefined' && window.location.search.includes('logs=true'))
    );
  }

  private writeLog(entry: LogEntry): void {
    // In development, write to console with structured format
    if (process.env.NODE_ENV === 'development') {
      const logMethod = this.getConsoleMethod(entry.level);
      logMethod(
        `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.action}: ${entry.message}`,
        {
          context: entry.context,
          metadata: entry.metadata,
          duration: entry.duration ? `${entry.duration.toFixed(2)}ms` : undefined,
          error: entry.error
        }
      );
    }

    // In production, integrate with external logging service
    // Implementation ready for DataDog, LogRocket, or Shopify native logging
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(entry);
    }
  }

  private bufferLog(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Maintain buffer size limit
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.splice(0, this.logBuffer.length - this.maxBufferSize);
    }
  }

  private serializeError(error: Error): NonNullable<LogEntry['error']> {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    };
  }

  private getConsoleMethod(level: LogLevel): (message?: any, ...optionalParams: any[]) => void {
    switch (level) {
      case 'debug': return console.debug.bind(console);
      case 'info': return console.info.bind(console);
      case 'warn': return console.warn.bind(console);
      case 'error': return console.error.bind(console);
      default: return console.log.bind(console);
    }
  }

  private getLogLevelPriority(level: LogLevel): number {
    switch (level) {
      case 'debug': return 0;
      case 'info': return 1;
      case 'warn': return 2;
      case 'error': return 3;
      default: return 1;
    }
  }

  private getDefaultSaveMessage(action: SaveEvent['action']): string {
    switch (action) {
      case 'global_save_start': return 'Global save operation initiated';
      case 'global_save_complete': return 'Global save operation completed successfully';
      case 'global_save_error': return 'Global save operation failed';
      default: return `Save operation: ${action}`;
    }
  }

  private getDefaultConflictMessage(action: ConflictEvent['action']): string {
    switch (action) {
      case 'conflict_detected': return 'Version conflicts detected during save';
      case 'conflict_refreshed': return 'Conflicts resolved by refreshing local data';
      case 'conflict_overridden': return 'Conflicts resolved by overriding remote data';
      default: return `Conflict event: ${action}`;
    }
  }

  private getDefaultAuditMessage(action: AuditEvent['action']): string {
    switch (action) {
      case 'price_changed': return 'Ingredient price updated';
      case 'ingredient_modified': return 'Ingredient data modified';
      case 'recipe_modified': return 'Recipe data modified';
      case 'packaging_modified': return 'Packaging data modified';
      default: return `Audit event: ${action}`;
    }
  }

  private getDefaultRetentionMessage(action: RetentionEvent['action']): string {
    switch (action) {
      case 'audit_pruned': return 'Audit log entries pruned for retention compliance';
      case 'history_pruned': return 'Price history entries pruned for retention compliance';
      default: return `Retention event: ${action}`;
    }
  }

  private summarizeConflictTypes(conflictedItems: ConflictEvent['conflictedItems']): Record<string, number> {
    return conflictedItems.reduce((summary, item) => {
      summary[item.type] = (summary[item.type] || 0) + 1;
      return summary;
    }, {} as Record<string, number>);
  }

  private sendToExternalLogger(entry: LogEntry): void {
    // External logging service integration point
    // Ready for integration with:
    // - Shopify native logging (shopify.app.logger)
    // - DataDog logs API
    // - LogRocket session recording
    // - Sentry for error tracking
    
    // Ensure critical errors are visible in production
    if (entry.level === 'error') {
      console.error('[STRUCTURED_LOG]', entry);
    }
  }
}

// Singleton instance for global use
export const structuredLogger = new StructuredLogger();

// Convenience functions for common logging patterns
export const logSave = (event: SaveEvent, message?: string, duration?: number, error?: Error) => 
  structuredLogger.logSaveEvent(event, message, duration, error);

export const logConflict = (event: ConflictEvent, message?: string) => 
  structuredLogger.logConflictEvent(event, message);

export const logAudit = (event: AuditEvent, message?: string) => 
  structuredLogger.logAuditEvent(event, message);

export const logRetention = (event: RetentionEvent, message?: string) => 
  structuredLogger.logRetentionEvent(event, message);

export const startTimer = (action: string) => structuredLogger.startTimer(action);

export const setLogContext = (context: Partial<LogContext>) => structuredLogger.setContext(context);

export const clearLogContext = () => structuredLogger.clearContext();

/**
 * Hook for React components to easily integrate structured logging
 */
export function useStructuredLogging() {
  return {
    logSave,
    logConflict,
    logAudit,
    logRetention,
    startTimer,
    setContext: setLogContext,
    clearContext: clearLogContext,
    getRecentLogs: () => structuredLogger.getRecentLogs(),
    exportLogs: (level?: LogLevel) => structuredLogger.exportLogs(level)
  };
}

/**
 * Integration helpers for existing services
 */
export class LoggingIntegration {
  /**
   * Wraps a service method with automatic logging
   */
  static wrapServiceMethod<T extends (...args: any[]) => any>(
    serviceName: string,
    methodName: string,
    method: T,
    action?: string
  ): T {
    return ((...args: any[]) => {
      const timer = startTimer(action || `${serviceName}.${methodName}`);
      const result = method(...args);
      
      if (result instanceof Promise) {
        return result
          .then((data) => {
            timer.complete(`${serviceName}.${methodName} completed`);
            return data;
          })
          .catch((error) => {
            timer.error(error, `${serviceName}.${methodName} failed`);
            throw error;
          });
      } else {
        timer.complete(`${serviceName}.${methodName} completed`);
        return result;
      }
    }) as T;
  }

  /**
   * Creates a logging context for a request/session
   */
  static createRequestContext(
    shopId: string,
    userId?: string,
    sessionId?: string,
    requestId?: string
  ): LogContext {
    return {
      shopId,
      userId,
      sessionId,
      requestId: requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }
}