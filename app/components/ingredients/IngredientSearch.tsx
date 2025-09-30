import React, { useState, useCallback } from 'react';
import {
  Card,
  TextField,
  Button,
  InlineStack,
  BlockStack,
  Select,
  Checkbox,
  Tag,
  Text,
  Box,
  Collapsible,
  RangeSlider
} from '@shopify/polaris';
import {
  SearchIcon,
  FilterIcon,
  ResetIcon
} from '@shopify/polaris-icons';

export interface IngredientSearchCriteria {
  query?: string;
  category?: string;
  supplier?: string;
  allergens?: string[];
  excludeAllergens?: string[];
  isActive?: boolean;
  costRange?: { min?: number; max?: number };
  unitType?: string;
  lastUpdatedAfter?: string;
  sortBy?: 'name' | 'category' | 'cost' | 'lastUpdated';
  sortOrder?: 'asc' | 'desc';
}

interface IngredientSearchProps {
  onSearch: (criteria: IngredientSearchCriteria) => void;
  onReset?: () => void;
  categories?: string[];
  suppliers?: string[];
  allergens?: string[];
  unitTypes?: string[];
  isLoading?: boolean;
  initialCriteria?: IngredientSearchCriteria;
}

export function IngredientSearch({
  onSearch,
  onReset,
  categories = [],
  suppliers = [],
  allergens = [],
  unitTypes = [],
  isLoading = false,
  initialCriteria = {}
}: IngredientSearchProps) {
  const [criteria, setCriteria] = useState<IngredientSearchCriteria>(initialCriteria);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [costRange, setCostRange] = useState<[number, number]>([
    criteria.costRange?.min ?? 0,
    criteria.costRange?.max ?? 100
  ]);

  const categoryOptions = [
    { label: 'All Categories', value: '' },
    ...categories.map(cat => ({ label: cat, value: cat }))
  ];

  const supplierOptions = [
    { label: 'All Suppliers', value: '' },
    ...suppliers.map(sup => ({ label: sup, value: sup }))
  ];

  const unitTypeOptions = [
    { label: 'All Unit Types', value: '' },
    ...unitTypes.map(unit => ({ label: unit, value: unit }))
  ];

  const sortOptions = [
    { label: 'Name (A-Z)', value: 'name-asc' },
    { label: 'Name (Z-A)', value: 'name-desc' },
    { label: 'Category', value: 'category-asc' },
    { label: 'Cost (Low to High)', value: 'cost-asc' },
    { label: 'Cost (High to Low)', value: 'cost-desc' },
    { label: 'Recently Updated', value: 'lastUpdated-desc' }
  ];

  const handleQueryChange = useCallback((value: string) => {
    setCriteria(prev => ({ ...prev, query: value }));
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setCriteria(prev => ({ ...prev, category: value || undefined }));
  }, []);

  const handleSupplierChange = useCallback((value: string) => {
    setCriteria(prev => ({ ...prev, supplier: value || undefined }));
  }, []);

  const handleUnitTypeChange = useCallback((value: string) => {
    setCriteria(prev => ({ ...prev, unitType: value || undefined }));
  }, []);

  const handleSortChange = useCallback((value: string) => {
    const [sortBy, sortOrder] = value.split('-') as ['name' | 'category' | 'cost' | 'lastUpdated', 'asc' | 'desc'];
    setCriteria(prev => ({ ...prev, sortBy, sortOrder }));
  }, []);

  const handleActiveChange = useCallback((checked: boolean) => {
    setCriteria(prev => ({ ...prev, isActive: checked }));
  }, []);

  const handleAllergenToggle = useCallback((allergen: string) => {
    setCriteria(prev => {
      const currentAllergens = prev.allergens || [];
      const newAllergens = currentAllergens.includes(allergen)
        ? currentAllergens.filter(a => a !== allergen)
        : [...currentAllergens, allergen];
      
      return {
        ...prev,
        allergens: newAllergens.length > 0 ? newAllergens : undefined
      };
    });
  }, []);

  const handleExcludeAllergenToggle = useCallback((allergen: string) => {
    setCriteria(prev => {
      const currentExcluded = prev.excludeAllergens || [];
      const newExcluded = currentExcluded.includes(allergen)
        ? currentExcluded.filter(a => a !== allergen)
        : [...currentExcluded, allergen];
      
      return {
        ...prev,
        excludeAllergens: newExcluded.length > 0 ? newExcluded : undefined
      };
    });
  }, []);

  const handleCostRangeChange = useCallback((value: [number, number]) => {
    setCostRange(value);
    setCriteria(prev => ({
      ...prev,
      costRange: {
        min: value[0] > 0 ? value[0] : undefined,
        max: value[1] < 100 ? value[1] : undefined
      }
    }));
  }, []);

  const handleSearch = useCallback(() => {
    onSearch(criteria);
  }, [criteria, onSearch]);

  const handleReset = useCallback(() => {
    setCriteria({});
    setCostRange([0, 100]);
    setShowAdvancedFilters(false);
    if (onReset) {
      onReset();
    }
  }, [onReset]);

  const hasActiveFilters = Object.keys(criteria).some(key => 
    key !== 'sortBy' && key !== 'sortOrder' && criteria[key as keyof IngredientSearchCriteria]
  );

  const currentSort = criteria.sortBy && criteria.sortOrder 
    ? `${criteria.sortBy}-${criteria.sortOrder}`
    : 'name-asc';

  return (
    <Card>
      <BlockStack gap="400">
        {/* Main search bar */}
        <InlineStack gap="300" align="space-between">
          <Box minWidth="300px" width="100%">
            <TextField
              label=""
              placeholder="Search ingredients by name, category, supplier, or notes..."
              value={criteria.query || ''}
              onChange={handleQueryChange}
              prefix={<SearchIcon />}
              autoComplete="off"
            />
          </Box>
          <InlineStack gap="200">
            <Button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              icon={FilterIcon}
              variant={hasActiveFilters ? "primary" : "secondary"}
            >
              Filters
            </Button>
            <Button
              onClick={handleSearch}
              variant="primary"
              loading={isLoading}
            >
              Search
            </Button>
            {hasActiveFilters && (
              <Button
                onClick={handleReset}
                icon={ResetIcon}
                variant="tertiary"
              >
                Reset
              </Button>
            )}
          </InlineStack>
        </InlineStack>

        {/* Advanced filters */}
        <Collapsible id="advanced-filters" open={showAdvancedFilters}>
          <Card background="bg-surface-secondary">
            <BlockStack gap="400">
              <Text variant="headingSm" as="h3">Advanced Filters</Text>
              
              {/* Basic filters */}
              <InlineStack gap="300" wrap>
                <Box minWidth="200px">
                  <Select
                    label="Category"
                    options={categoryOptions}
                    value={criteria.category || ''}
                    onChange={handleCategoryChange}
                  />
                </Box>
                <Box minWidth="200px">
                  <Select
                    label="Supplier"
                    options={supplierOptions}
                    value={criteria.supplier || ''}
                    onChange={handleSupplierChange}
                  />
                </Box>
                <Box minWidth="200px">
                  <Select
                    label="Unit Type"
                    options={unitTypeOptions}
                    value={criteria.unitType || ''}
                    onChange={handleUnitTypeChange}
                  />
                </Box>
                <Box minWidth="200px">
                  <Select
                    label="Sort By"
                    options={sortOptions}
                    value={currentSort}
                    onChange={handleSortChange}
                  />
                </Box>
              </InlineStack>

              {/* Status filter */}
              <Checkbox
                label="Show only active ingredients"
                checked={criteria.isActive || false}
                onChange={handleActiveChange}
              />

              {/* Cost range */}
              <Box>
                <Text variant="bodyMd" as="p">Cost Range: ${costRange[0]} - ${costRange[1]}</Text>
                <Box paddingBlockStart="200">
                  <RangeSlider
                    label="Cost range"
                    value={costRange}
                    onChange={handleCostRangeChange}
                    output
                    min={0}
                    max={100}
                    step={1}
                    prefix="$"
                  />
                </Box>
              </Box>

              {/* Allergen filters */}
              {allergens.length > 0 && (
                <BlockStack gap="200">
                  <Text variant="bodyMd" as="p">Must contain allergens:</Text>
                  <InlineStack gap="200" wrap>
                    {allergens.map(allergen => (
                      <Tag
                        key={`include-${allergen}`}
                        onClick={() => handleAllergenToggle(allergen)}
                        disabled={false}
                      >
                        {allergen}
                        {criteria.allergens?.includes(allergen) && ' ✓'}
                      </Tag>
                    ))}
                  </InlineStack>
                </BlockStack>
              )}

              {allergens.length > 0 && (
                <BlockStack gap="200">
                  <Text variant="bodyMd" as="p">Must NOT contain allergens:</Text>
                  <InlineStack gap="200" wrap>
                    {allergens.map(allergen => (
                      <Tag
                        key={`exclude-${allergen}`}
                        onClick={() => handleExcludeAllergenToggle(allergen)}
                        disabled={false}
                      >
                        {allergen}
                        {criteria.excludeAllergens?.includes(allergen) && ' ✗'}
                      </Tag>
                    ))}
                  </InlineStack>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Collapsible>

        {/* Active filters display */}
        {hasActiveFilters && (
          <Box>
            <Text variant="bodyMd" as="p" tone="subdued">Active filters:</Text>
            <InlineStack gap="200" wrap>
              {criteria.query && (
                <Tag onRemove={() => setCriteria(prev => ({ ...prev, query: undefined }))}>
                  Search: "{criteria.query}"
                </Tag>
              )}
              {criteria.category && (
                <Tag onRemove={() => setCriteria(prev => ({ ...prev, category: undefined }))}>
                  Category: {criteria.category}
                </Tag>
              )}
              {criteria.supplier && (
                <Tag onRemove={() => setCriteria(prev => ({ ...prev, supplier: undefined }))}>
                  Supplier: {criteria.supplier}
                </Tag>
              )}
              {criteria.isActive && (
                <Tag onRemove={() => setCriteria(prev => ({ ...prev, isActive: undefined }))}>
                  Active only
                </Tag>
              )}
              {criteria.allergens?.map(allergen => (
                <Tag
                  key={`filter-include-${allergen}`}
                  onRemove={() => handleAllergenToggle(allergen)}
                >
                  Contains: {allergen}
                </Tag>
              ))}
              {criteria.excludeAllergens?.map(allergen => (
                <Tag
                  key={`filter-exclude-${allergen}`}
                  onRemove={() => handleExcludeAllergenToggle(allergen)}
                >
                  Excludes: {allergen}
                </Tag>
              ))}
            </InlineStack>
          </Box>
        )}
      </BlockStack>
    </Card>
  );
}