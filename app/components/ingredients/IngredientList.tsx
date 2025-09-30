import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  DataTable,
  Pagination,
  InlineStack,
  BlockStack,
  Text,
  Button,
  Badge,
  EmptyState,
  Box,
  Checkbox,
  ButtonGroup,
  Tooltip
} from '@shopify/polaris';
import {
  EditIcon,
  DeleteIcon,
  ViewIcon,
  ExportIcon
} from '@shopify/polaris-icons';
import { IngredientCard, type Ingredient } from './IngredientCard';
import { markPerformance } from '../../lib/performance';

export interface IngredientListResult {
  ingredients: Ingredient[];
  total: number;
  offset: number;
  limit: number;
}

interface IngredientListProps {
  result: IngredientListResult;
  onEdit?: (ingredient: Ingredient) => void;
  onDelete?: (ingredients: Ingredient[]) => void;
  onView?: (ingredient: Ingredient) => void;
  onExport?: (ingredients: Ingredient[]) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSize?: number;
  currentPage?: number;
  viewMode?: 'table' | 'cards';
  onViewModeChange?: (mode: 'table' | 'cards') => void;
  isLoading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

export function IngredientList({
  result,
  onEdit,
  onDelete,
  onView,
  onExport,
  onPageChange,
  onPageSizeChange,
  pageSize = 20,
  currentPage = 1,
  viewMode = 'table',
  onViewModeChange,
  isLoading = false,
  emptyStateTitle = "No ingredients found",
  emptyStateDescription = "Try adjusting your search criteria or add some ingredients to get started."
}: IngredientListProps) {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  
  const { ingredients, total, offset, limit } = result;
  const totalPages = Math.ceil(total / pageSize);
  const hasSelection = selectedIngredients.length > 0;
  const isAllSelected = selectedIngredients.length === ingredients.length && ingredients.length > 0;
  const isIndeterminate = selectedIngredients.length > 0 && selectedIngredients.length < ingredients.length;

  // Performance tracking for ingredients table render
  useEffect(() => {
    const timer = setTimeout(() => {
      markPerformance('ingredients-table-render');
    }, 0);
    
    return () => clearTimeout(timer);
  }, [ingredients]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIngredients(ingredients.map(ingredient => ingredient.id || ingredient.gid || ''));
    } else {
      setSelectedIngredients([]);
    }
  }, [ingredients]);

  const handleSelectIngredient = useCallback((ingredientId: string, checked: boolean) => {
    if (checked) {
      setSelectedIngredients(prev => [...prev, ingredientId]);
    } else {
      setSelectedIngredients(prev => prev.filter(id => id !== ingredientId));
    }
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (onDelete) {
      const selectedItems = ingredients.filter(ingredient => {
        const id = ingredient.id || ingredient.gid || '';
        return selectedIngredients.includes(id);
      });
      onDelete(selectedItems);
      setSelectedIngredients([]);
    }
  }, [ingredients, selectedIngredients, onDelete]);

  const handleBulkExport = useCallback(() => {
    if (onExport) {
      const selectedItems = ingredients.filter(ingredient => {
        const id = ingredient.id || ingredient.gid || '';
        return selectedIngredients.includes(id);
      });
      onExport(selectedItems.length > 0 ? selectedItems : ingredients);
    }
  }, [ingredients, selectedIngredients, onExport]);

  const formatCurrency = (value: string | number | undefined | null) => {
    const num = parseFloat(value?.toString() || '0');
    return `$${num.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Table view
  const tableRows = ingredients.map((ingredient) => {
    const isSelected = selectedIngredients.includes(ingredient.id || ingredient.gid || '');

    return [
      <Checkbox
        label=""
        checked={isSelected}
        onChange={(checked: boolean) => handleSelectIngredient(ingredient.id || ingredient.gid || '', checked)}
      />,
      ingredient.name || '-',
      ingredient.category || '-',
      ingredient.supplier || '-',
      formatCurrency(ingredient.costPerUnit),
      ingredient.unitType || '-',
      <InlineStack gap="100">
        {(ingredient.allergens && ingredient.allergens.length > 0) ? (
          ingredient.allergens.map((allergen: string) => (
            <Badge key={allergen} tone="warning" size="small">
              {allergen}
            </Badge>
          ))
        ) : (
          <Text as="span" tone="subdued">None</Text>
        )}
      </InlineStack>,
      <Badge tone={ingredient.isActive ? 'success' : 'critical'}>
        {ingredient.isActive ? 'Active' : 'Inactive'}
      </Badge>,
      formatDate(ingredient.updatedAt || ingredient.createdAt || new Date().toISOString()),
      <InlineStack gap="100">
        {onView && (
          <Tooltip content="View details">
            <Button
              icon={ViewIcon}
              variant="tertiary"
              size="slim"
              onClick={() => onView(ingredient)}
            />
          </Tooltip>
        )}
        {onEdit && (
          <Tooltip content="Edit ingredient">
            <Button
              icon={EditIcon}
              variant="tertiary"
              size="slim"
              onClick={() => onEdit(ingredient)}
            />
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip content="Delete ingredient">
            <Button
              icon={DeleteIcon}
              variant="tertiary"
              size="slim"
              tone="critical"
              onClick={() => onDelete([ingredient])}
            />
          </Tooltip>
        )}
      </InlineStack>
    ];
  });

  const tableHeadings = [
    <Checkbox
      label=""
      checked={isAllSelected}
      onChange={handleSelectAll}
    />,
    'Name',
    'Category',
    'Supplier',
    'Cost',
    'Unit',
    'Allergens',
    'Status',
    'Last Updated',
    'Actions'
  ];

  if (ingredients.length === 0) {
    return (
      <EmptyState
        heading={emptyStateTitle}
        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
      >
        <Text as="p" variant="bodyMd">
          {emptyStateDescription}
        </Text>
      </EmptyState>
    );
  }

  return (
    <BlockStack gap="400">
      {/* Controls */}
      <Card>
        <InlineStack align="space-between">
          <InlineStack gap="300">
            <Text as="p" variant="bodyMd">
              {total} ingredient{total !== 1 ? 's' : ''} found
            </Text>
            {hasSelection && (
              <Text as="p" variant="bodyMd" tone="subdued">
                {selectedIngredients.length} selected
              </Text>
            )}
          </InlineStack>
          
          <InlineStack gap="200">
            {/* Bulk actions */}
            {hasSelection && (
              <ButtonGroup>
                {onExport && (
                  <Button
                    icon={ExportIcon}
                    onClick={handleBulkExport}
                    variant="secondary"
                  >
                    Export Selected
                  </Button>
                )}
                {onDelete && (
                  <Button
                    icon={DeleteIcon}
                    onClick={handleBulkDelete}
                    tone="critical"
                    variant="secondary"
                  >
                    Delete Selected
                  </Button>
                )}
              </ButtonGroup>
            )}

            {/* Export all */}
            {onExport && !hasSelection && (
              <Button
                icon={ExportIcon}
                onClick={handleBulkExport}
                variant="secondary"
              >
                Export All
              </Button>
            )}

            {/* View mode toggle */}
            {onViewModeChange && (
              <ButtonGroup>
                <Button
                  pressed={viewMode === 'table'}
                  onClick={() => onViewModeChange('table')}
                >
                  Table
                </Button>
                <Button
                  pressed={viewMode === 'cards'}
                  onClick={() => onViewModeChange('cards')}
                >
                  Cards
                </Button>
              </ButtonGroup>
            )}
          </InlineStack>
        </InlineStack>
      </Card>

      {/* Content */}
      {viewMode === 'table' ? (
        <Card>
          <DataTable
            columnContentTypes={[
              'text', // Checkbox
              'text', // Name
              'text', // Category
              'text', // Supplier
              'numeric', // Cost
              'text', // Unit
              'text', // Allergens
              'text', // Status
              'text', // Last Updated
              'text'  // Actions
            ]}
            headings={tableHeadings}
            rows={tableRows}
          />
        </Card>
      ) : (
        <BlockStack gap="300">
          {ingredients.map((ingredient) => (
            <Box key={ingredient.id}>
              <IngredientCard
                ingredient={ingredient}
                onEdit={onEdit}
                onDelete={onDelete ? (ing) => onDelete([ing]) : undefined}
                onView={onView}
                compact={false}
              />
            </Box>
          ))}
        </BlockStack>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <InlineStack align="center">
            <Pagination
              hasPrevious={currentPage > 1}
              onPrevious={() => onPageChange && onPageChange(currentPage - 1)}
              hasNext={currentPage < totalPages}
              onNext={() => onPageChange && onPageChange(currentPage + 1)}
              label={`Page ${currentPage} of ${totalPages}`}
            />
          </InlineStack>
        </Card>
      )}
    </BlockStack>
  );
}