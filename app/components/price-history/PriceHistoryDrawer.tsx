/**
 * Price History Drawer Component
 * Task 51: Implement price history drawer/modal UI with pagination
 * Implements FR-037, FR-018 (price history query endpoint, audit trail display)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  ButtonGroup,
  DataTable,
  Pagination,
  Badge,
  Select,
  TextField,
  RangeSlider,
  Filters,
  Tooltip,
  Icon,
  Spinner,
  EmptyState,
  Banner
} from '@shopify/polaris';
import {
  CalendarIcon,
  ExportIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MinusIcon,
  AlertTriangleIcon,
  InfoIcon
} from '@shopify/polaris-icons';
import type { 
  PriceHistoryService,
  PriceHistoryEntry,
  PriceHistoryPage,
  PriceHistoryQuery,
  PriceHistoryPaginationOptions
} from '../../services/price-history';

export interface PriceHistoryDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when drawer is closed */
  onClose: () => void;
  /** Ingredient ID to show history for */
  ingredientId?: string;
  /** Ingredient name for display */
  ingredientName?: string;
  /** Price history service instance */
  priceHistoryService: PriceHistoryService;
  /** Show export functionality */
  showExport?: boolean;
  /** Show trend analysis */
  showTrendAnalysis?: boolean;
  /** Initial page size */
  initialPageSize?: number;
}

/**
 * Price History Drawer with pagination and filtering
 */
export function PriceHistoryDrawer({
  open,
  onClose,
  ingredientId,
  ingredientName,
  priceHistoryService,
  showExport = true,
  showTrendAnalysis = true,
  initialPageSize = 20
}: PriceHistoryDrawerProps) {
  const [historyData, setHistoryData] = useState<PriceHistoryPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Filter state
  const [filters, setFilters] = useState<PriceHistoryQuery>({});
  const [appliedFilters, setAppliedFilters] = useState<Array<{ key: string; label: string; value: any }>>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Date range filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Change range filter (percentage)
  const [changeRange, setChangeRange] = useState<[number, number]>([-100, 100]);
  const [changeType, setChangeType] = useState<'both' | 'increase' | 'decrease'>('both');

  // Sorting
  const [sortBy, setSortBy] = useState<'timestamp' | 'changeAmount' | 'changePercent'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load price history data
  const loadPriceHistory = useCallback(async () => {
    if (!ingredientId || !open) return;

    setLoading(true);
    setError(null);

    try {
      const query: PriceHistoryQuery = {
        ingredientId,
        ...filters
      };

      if (startDate) query.startDate = new Date(startDate);
      if (endDate) query.endDate = new Date(endDate);
      if (changeType !== 'both') query.changeType = changeType;
      if (changeRange[0] > -100) query.minChangePercent = changeRange[0];
      if (changeRange[1] < 100) query.maxChangePercent = changeRange[1];

      const pagination: PriceHistoryPaginationOptions = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        sortBy,
        sortOrder
      };

      const data = await priceHistoryService.getPaginatedPriceHistory(query, pagination);
      setHistoryData(data);
    } catch (err) {
      console.error('Failed to load price history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load price history');
    } finally {
      setLoading(false);
    }
  }, [ingredientId, open, filters, startDate, endDate, changeType, changeRange, currentPage, pageSize, sortBy, sortOrder, priceHistoryService]);

  // Load data when dependencies change
  useEffect(() => {
    loadPriceHistory();
  }, [loadPriceHistory]);

  // Reset state when drawer opens/closes
  useEffect(() => {
    if (open) {
      setCurrentPage(1);
      setError(null);
    }
  }, [open]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  // Handle date range filter
  const handleDateRangeFilter = useCallback(() => {
    const newFilters: Array<{ key: string; label: string; value: any }> = [];
    if (startDate) newFilters.push({ key: 'startDate', label: `After ${startDate}`, value: startDate });
    if (endDate) newFilters.push({ key: 'endDate', label: `Before ${endDate}`, value: endDate });
    if (changeType !== 'both') newFilters.push({ key: 'changeType', label: `${changeType} only`, value: changeType });
    if (changeRange[0] > -100 || changeRange[1] < 100) {
      newFilters.push({ 
        key: 'changeRange', 
        label: `Change: ${changeRange[0]}% to ${changeRange[1]}%`, 
        value: changeRange 
      });
    }
    setAppliedFilters(newFilters);
    setCurrentPage(1);
  }, [startDate, endDate, changeType, changeRange]);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setChangeRange([-100, 100]);
    setChangeType('both');
    setFilters({});
    setAppliedFilters([]);
    setCurrentPage(1);
  }, []);

  // Remove individual filter
  const handleRemoveFilter = useCallback((key: string) => {
    if (key === 'startDate') setStartDate('');
    if (key === 'endDate') setEndDate('');
    if (key === 'changeType') setChangeType('both');
    if (key === 'changeRange') setChangeRange([-100, 100]);
    
    const newFilters = { ...filters };
    delete newFilters[key as keyof PriceHistoryQuery];
    setFilters(newFilters);
    
    setAppliedFilters(prev => prev.filter(f => f.key !== key));
    setCurrentPage(1);
  }, [filters]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!ingredientId) return;

    setExporting(true);
    try {
      const csvData = await priceHistoryService.exportPriceHistoryCSV({
        ingredientId,
        ...filters
      });
      
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `price-history-${ingredientName || ingredientId}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [ingredientId, ingredientName, filters, priceHistoryService]);

  // Format change display
  const formatChange = (entry: PriceHistoryEntry) => {
    const isIncrease = entry.changeAmount > 0;
    const isDecrease = entry.changeAmount < 0;
    
    return (
      <InlineStack gap="100" align="center">
        <Icon source={isIncrease ? ChevronUpIcon : isDecrease ? ChevronDownIcon : MinusIcon} />
        <Text 
          variant="bodyMd" 
          as="span"
          tone={isIncrease ? 'critical' : isDecrease ? 'success' : undefined}
        >
          {isIncrease ? '+' : ''}{entry.changeAmount.toFixed(4)}
        </Text>
        <Badge tone={isIncrease ? 'critical' : isDecrease ? 'success' : 'info'} size="small">
          {`${isIncrease ? '+' : ''}${entry.changePercent.toFixed(1)}%`}
        </Badge>
      </InlineStack>
    );
  };

  // Create table data
  const tableData = historyData?.entries.map(entry => [
    new Date(entry.timestamp).toLocaleString(),
    `$${entry.previousCost.toFixed(4)}`,
    `$${entry.newCost.toFixed(4)}`,
    formatChange(entry),
    <Text variant="bodyMd" as="span" key={`reason-${entry.id}`}>
      {entry.changeReason || 'No reason provided'}
    </Text>,
    entry.auditEntryId ? (
      <Tooltip content={`Audit Entry: ${entry.auditEntryId}`} key={`audit-${entry.id}`}>
        <Badge tone="info" size="small">
          Audit
        </Badge>
      </Tooltip>
    ) : (
      <Text variant="bodyMd" tone="subdued" as="span" key={`no-audit-${entry.id}`}>
        —
      </Text>
    )
  ]) || [];

  const tableHeaders = ['Date & Time', 'Previous Price', 'New Price', 'Change', 'Reason', 'Audit Trail'];

  // Page size options
  const pageSizeOptions = [
    { label: '10 per page', value: '10' },
    { label: '20 per page', value: '20' },
    { label: '50 per page', value: '50' },
    { label: '100 per page', value: '100' }
  ];

  // Sort options
  const sortOptions = [
    { label: 'Date (newest first)', value: 'timestamp-desc' },
    { label: 'Date (oldest first)', value: 'timestamp-asc' },
    { label: 'Change amount (highest first)', value: 'changeAmount-desc' },
    { label: 'Change amount (lowest first)', value: 'changeAmount-asc' },
    { label: 'Change % (highest first)', value: 'changePercent-desc' },
    { label: 'Change % (lowest first)', value: 'changePercent-asc' }
  ];

  // Handle sort change
  const handleSortChange = useCallback((value: string) => {
    const [field, order] = value.split('-');
    setSortBy(field as any);
    setSortOrder(order as 'asc' | 'desc');
    setCurrentPage(1);
  }, []);

  // Change type options
  const changeTypeOptions = [
    { label: 'All changes', value: 'both' },
    { label: 'Increases only', value: 'increase' },
    { label: 'Decreases only', value: 'decrease' }
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Price History - ${ingredientName || 'Ingredient'}`}
      primaryAction={{
        content: 'Close',
        onAction: onClose
      }}
      secondaryActions={showExport ? [{
        content: 'Export CSV',
        loading: exporting,
        onAction: handleExport,
        icon: ExportIcon,
        disabled: !historyData?.entries.length
      }] : undefined}
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* Summary Statistics */}
          {historyData && (
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">
                  Summary Statistics
                </Text>
                
                <InlineStack gap="400" wrap>
                  <div>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Total Changes
                    </Text>
                    <Text variant="headingLg" as="p">
                      {historyData.summary.totalChanges}
                    </Text>
                  </div>
                  
                  <div>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Average Change
                    </Text>
                    <Text variant="headingLg" as="p">
                      {historyData.summary.averageChangePercent.toFixed(1)}%
                    </Text>
                  </div>
                  
                  <div>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Largest Increase
                    </Text>
                    <Text variant="headingLg" as="p" tone="critical">
                      +{historyData.summary.largestIncrease.percent.toFixed(1)}%
                    </Text>
                  </div>
                  
                  <div>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Largest Decrease
                    </Text>
                    <Text variant="headingLg" as="p" tone="success">
                      {historyData.summary.largestDecrease.percent.toFixed(1)}%
                    </Text>
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h3">
                  Filters & Options
                </Text>
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  disclosure={showFilters ? 'up' : 'down'}
                >
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
              </InlineStack>

              <Filters
                appliedFilters={appliedFilters}
                onClearAll={handleClearFilters}
                onQueryChange={() => {}}
                onQueryClear={() => {}}
                filters={showFilters ? [
                  {
                    key: 'dateRange',
                    label: 'Date Range',
                    filter: (
                      <InlineStack gap="200">
                        <TextField
                          type="date"
                          label="Start Date"
                          value={startDate}
                          onChange={setStartDate}
                          autoComplete="off"
                        />
                        <TextField
                          type="date"
                          label="End Date"
                          value={endDate}
                          onChange={setEndDate}
                          autoComplete="off"
                        />
                      </InlineStack>
                    )
                  },
                  {
                    key: 'changeType',
                    label: 'Change Type',
                    filter: (
                      <Select
                        label="Change type"
                        options={changeTypeOptions}
                        value={changeType}
                        onChange={(value) => setChangeType(value as any)}
                      />
                    )
                  },
                  {
                    key: 'changeRange',
                    label: 'Change Range (%)',
                    filter: (
                      <RangeSlider
                        label="Change percentage range"
                        value={changeRange}
                        onChange={(value) => setChangeRange(value as [number, number])}
                        min={-100}
                        max={100}
                        step={5}
                        output
                      />
                    )
                  }
                ] : []}
              >
                <InlineStack gap="200">
                  <Button onClick={handleDateRangeFilter}>
                    Apply Filters
                  </Button>
                  <Select
                    label="Sort by"
                    options={sortOptions}
                    value={`${sortBy}-${sortOrder}`}
                    onChange={handleSortChange}
                  />
                  <Select
                    label="Page size"
                    options={pageSizeOptions}
                    value={pageSize.toString()}
                    onChange={(value) => {
                      setPageSize(parseInt(value));
                      setCurrentPage(1);
                    }}
                  />
                </InlineStack>
              </Filters>
            </BlockStack>
          </Card>

          {/* Error Banner */}
          {error && (
            <Banner tone="critical" onDismiss={() => setError(null)}>
              <Text variant="bodyMd" as="p">
                {error}
              </Text>
            </Banner>
          )}

          {/* Loading State */}
          {loading && (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spinner size="large" />
                <Text variant="bodyLg" as="p" alignment="center">
                  Loading price history...
                </Text>
              </div>
            </Card>
          )}

          {/* Empty State */}
          {!loading && historyData && historyData.entries.length === 0 && (
            <Card>
              <EmptyState
                heading="No price history found"
                image="/empty-state-illustration.svg"
                action={{
                  content: 'Clear filters',
                  onAction: handleClearFilters
                }}
              >
                <p>
                  No price changes match your current filters. 
                  Try adjusting the date range or change type filters.
                </p>
              </EmptyState>
            </Card>
          )}

          {/* Price History Table */}
          {!loading && historyData && historyData.entries.length > 0 && (
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text variant="headingMd" as="h3">
                    Price History ({historyData.pagination.total} total changes)
                  </Text>
                  <Tooltip content="Price changes are tracked with full audit trails for compliance">
                    <Icon source={InfoIcon} />
                  </Tooltip>
                </InlineStack>

                <DataTable
                  columnContentTypes={['text', 'numeric', 'numeric', 'text', 'text', 'text']}
                  headings={tableHeaders}
                  rows={tableData}
                  footerContent={
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" tone="subdued" as="span">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, historyData.pagination.total)} of {historyData.pagination.total} entries
                      </Text>
                      <Pagination
                        hasNext={historyData.pagination.hasNext}
                        hasPrevious={historyData.pagination.hasPrevious}
                        onNext={() => setCurrentPage(prev => prev + 1)}
                        onPrevious={() => setCurrentPage(prev => prev - 1)}
                      />
                    </InlineStack>
                  }
                />
              </BlockStack>
            </Card>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}