/**
 * Optimistic UI Service Provider
 * Task 45: Implement optimistic update + rollback
 * Provides dependency injection for optimistic UI services
 */

import React, { createContext, useContext, useMemo } from 'react';
import { OptimisticUIServiceImpl } from '../services/optimistic-ui';
import type { OptimisticUIService } from '../services/optimistic-ui';
import type { GlobalSaveOrchestratorService } from '../services/global-save-orchestrator';

export interface OptimisticUIContext {
  optimisticService: OptimisticUIService;
}

const OptimisticUIContext = createContext<OptimisticUIContext | null>(null);

export interface OptimisticUIProviderProps {
  children: React.ReactNode;
  globalSaveOrchestrator: GlobalSaveOrchestratorService;
  toastService?: {
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showInfo: (message: string) => void;
  };
  analyticsService?: {
    trackOptimisticUpdate: (operationId: string, itemCount: number) => void;
    trackRollback: (operationId: string, reason: string) => void;
  };
}

/**
 * Provider component for optimistic UI services
 */
export function OptimisticUIProvider({
  children,
  globalSaveOrchestrator,
  toastService,
  analyticsService
}: OptimisticUIProviderProps) {
  const optimisticService = useMemo(
    () => new OptimisticUIServiceImpl({
      globalSaveOrchestrator,
      toastService,
      analyticsService
    }),
    [globalSaveOrchestrator, toastService, analyticsService]
  );

  const contextValue = useMemo(
    () => ({ optimisticService }),
    [optimisticService]
  );

  return (
    <OptimisticUIContext.Provider value={contextValue}>
      {children}
    </OptimisticUIContext.Provider>
  );
}

/**
 * Hook to access optimistic UI service from context
 */
export function useOptimisticUIService(): OptimisticUIService {
  const context = useContext(OptimisticUIContext);
  
  if (!context) {
    throw new Error(
      'useOptimisticUIService must be used within an OptimisticUIProvider'
    );
  }
  
  return context.optimisticService;
}

/**
 * HOC for components that need optimistic UI services
 */
export function withOptimisticUI<P extends object>(
  Component: React.ComponentType<P & { optimisticService: OptimisticUIService }>
): React.ComponentType<P> {
  return function WithOptimisticUIComponent(props: P) {
    const optimisticService = useOptimisticUIService();
    
    return (
      <Component
        {...props}
        optimisticService={optimisticService}
      />
    );
  };
}

/**
 * Mock services for testing and development
 */
export const mockToastService = {
  showSuccess: (message: string) => console.log('✅ Success:', message),
  showError: (message: string) => console.error('❌ Error:', message),
  showInfo: (message: string) => console.info('ℹ️ Info:', message)
};

export const mockAnalyticsService = {
  trackOptimisticUpdate: (operationId: string, itemCount: number) => 
    console.log('📊 Optimistic Update:', { operationId, itemCount }),
  trackRollback: (operationId: string, reason: string) => 
    console.log('📊 Rollback:', { operationId, reason })
};

/**
 * Development-only optimistic UI provider with mock services
 */
export function DevOptimisticUIProvider({
  children,
  globalSaveOrchestrator
}: {
  children: React.ReactNode;
  globalSaveOrchestrator: GlobalSaveOrchestratorService;
}) {
  return (
    <OptimisticUIProvider
      globalSaveOrchestrator={globalSaveOrchestrator}
      toastService={mockToastService}
      analyticsService={mockAnalyticsService}
    >
      {children}
    </OptimisticUIProvider>
  );
}