import React, { useState, useCallback } from 'react';
import {
  Card,
  DataTable,
  Button,
  InlineStack,
  BlockStack,
  Text,
  Pagination,
  Select,
  TextField,
  Checkbox,
  EmptyState,
  ButtonGroup,
  Modal,
  Badge,
  Box,
  Filters,
  ChoiceList,
  RangeSlider,
  Tooltip
} from '@shopify/polaris';
import {
  PlusIcon,
  ViewIcon,
  EditIcon,
  DeleteIcon,
  ExportIcon,
  DuplicateIcon
} from '@shopify/polaris-icons';
import { Recipe } from './RecipeCard';

interface RecipeListProps {
  recipes: Recipe[];
  loading?: boolean;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  onView?: (recipe: Recipe) => void;
  onDuplicate?: (recipe: Recipe) => void;
  onCreate?: () => void;
  onExport?: (recipes: Recipe[]) => void;
  selectedRecipes?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

type SortField = 'name' | 'category' | 'cost_per_unit' | 'total_cost' | 'difficulty' | 'last_updated';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';

interface FilterState {
  search: string;
  category: string[];
  difficulty: string[];
  status: string[];
  costRange: [number, number];
  allergens: string[];
  showAdvanced: boolean;
}

const ITEMS_PER_PAGE_OPTIONS = [
  { label: '10 per page', value: '10' },
  { label: '25 per page', value: '25' },
  { label: '50 per page', value: '50' },
  { label: '100 per page', value: '100' }
];

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

export function RecipeList({
  recipes,
  loading = false,
  onEdit,
  onDelete,
  onView,
  onDuplicate,
  onCreate,
  onExport,
  selectedRecipes = [],
  onSelectionChange
}: RecipeListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: [],
    difficulty: [],
    status: [],
    costRange: [0, 100],
    allergens: [],
    showAdvanced: false
  });

  // Extract unique values for filter options
  const allCategories = [...new Set(recipes.map(recipe => recipe.fields.category))].sort();
  const allAllergens = [...new Set(recipes.flatMap(recipe => recipe.allergens || []))].sort();
  const maxCost = Math.max(...recipes.map(recipe => recipe.cost_per_unit), 100);

  // Filter recipes
  const filteredRecipes = recipes.filter(recipe => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        recipe.fields.name.toLowerCase().includes(searchLower) ||
        recipe.fields.description?.toLowerCase().includes(searchLower) ||
        recipe.fields.category.toLowerCase().includes(searchLower) ||
        recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Category filter
    if (filters.category.length > 0 && !filters.category.includes(recipe.fields.category)) {
      return false;
    }

    // Difficulty filter
    if (filters.difficulty.length > 0 && !filters.difficulty.includes(recipe.fields.difficulty)) {
      return false;
    }

    // Status filter
    if (filters.status.length > 0) {
      const isActive = recipe.fields.is_active;
      const statusMatch = filters.status.some(status => 
        (status === 'Active' && isActive) || (status === 'Inactive' && !isActive)
      );
      if (!statusMatch) return false;
    }

    // Cost range filter
    if (recipe.cost_per_unit < filters.costRange[0] || recipe.cost_per_unit > filters.costRange[1]) {
      return false;
    }

    // Allergens filter (recipes containing ANY of the selected allergens)
    if (filters.allergens.length > 0) {
      const hasSelectedAllergen = filters.allergens.some(allergen => 
        recipe.allergens?.includes(allergen)
      );
      if (!hasSelectedAllergen) return false;
    }

    return true;
  });

  // Sort recipes
  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortField) {
      case 'name':
        aValue = a.fields.name.toLowerCase();
        bValue = b.fields.name.toLowerCase();
        break;
      case 'category':
        aValue = a.fields.category.toLowerCase();
        bValue = b.fields.category.toLowerCase();
        break;
      case 'cost_per_unit':
        aValue = a.cost_per_unit;
        bValue = b.cost_per_unit;
        break;
      case 'total_cost':
        aValue = a.total_cost;
        bValue = b.total_cost;
        break;
      case 'difficulty':
        const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
        aValue = difficultyOrder[a.fields.difficulty];
        bValue = difficultyOrder[b.fields.difficulty];
        break;
      case 'last_updated':
        aValue = new Date(a.fields.last_updated).getTime();
        bValue = new Date(b.fields.last_updated).getTime();
        break;
      default:
        aValue = a.fields.name.toLowerCase();
        bValue = b.fields.name.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate recipes
  const totalPages = Math.ceil(sortedRecipes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecipes = sortedRecipes.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleFilterChange = useCallback((field: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      search: '',
      category: [],
      difficulty: [],
      status: [],
      costRange: [0, maxCost],
      allergens: [],
      showAdvanced: false
    });
    setCurrentPage(1);
  }, [maxCost]);

  const handleDeleteClick = useCallback((recipe: Recipe) => {
    setRecipeToDelete(recipe);
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (recipeToDelete && onDelete) {
      onDelete(recipeToDelete);
    }
    setDeleteModalOpen(false);
    setRecipeToDelete(null);
  }, [recipeToDelete, onDelete]);

  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    onSelectionChange?.(selectedIds);
  }, [onSelectionChange]);

  const handleBulkExport = useCallback(() => {
    if (onExport) {
      const recipesToExport = selectedRecipes.length > 0 
        ? recipes.filter(recipe => selectedRecipes.includes(recipe.id))
        : sortedRecipes;
      onExport(recipesToExport);
    }
  }, [onExport, selectedRecipes, recipes, sortedRecipes]);

  // Build filter components
  const filterComponents = [
    {
      key: 'category',
      label: 'Category',
      filter: (
        <ChoiceList
          title="Category"
          titleHidden
          choices={allCategories.map(category => ({ label: category, value: category }))}
          selected={filters.category}
          onChange={(value) => handleFilterChange('category', value)}
          allowMultiple
        />
      ),
      shortcut: true
    },
    {
      key: 'difficulty',
      label: 'Difficulty',
      filter: (
        <ChoiceList
          title="Difficulty"
          titleHidden
          choices={DIFFICULTY_OPTIONS.map(difficulty => ({ label: difficulty, value: difficulty }))}
          selected={filters.difficulty}
          onChange={(value) => handleFilterChange('difficulty', value)}
          allowMultiple
        />
      ),
      shortcut: true
    },
    {
      key: 'status',
      label: 'Status',
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={STATUS_OPTIONS.map(status => ({ label: status, value: status }))}
          selected={filters.status}
          onChange={(value) => handleFilterChange('status', value)}
          allowMultiple
        />
      ),
      shortcut: true
    }
  ];

  if (filters.showAdvanced) {
    filterComponents.push(
      {
        key: 'costRange',
        label: 'Cost Range',
        filter: (
          <BlockStack gap="200">
            <Text variant="bodyMd" as="p">Cost per unit: ${filters.costRange[0]} - ${filters.costRange[1]}</Text>
            <RangeSlider
              label="Cost range"
              labelHidden
              value={filters.costRange}
              min={0}
              max={maxCost}
              step={0.5}
              onChange={(value) => handleFilterChange('costRange', value)}
            />
          </BlockStack>
        ),
        shortcut: false
      },
      {
        key: 'allergens',
        label: 'Contains Allergens',
        filter: (
          <ChoiceList
            title="Allergens"
            titleHidden
            choices={allAllergens.map(allergen => ({ label: allergen, value: allergen }))}
            selected={filters.allergens}
            onChange={(value) => handleFilterChange('allergens', value)}
            allowMultiple
          />
        ),
        shortcut: false
      }
    );
  }

  // Build data table rows
  const tableRows = paginatedRecipes.map((recipe) => {
    const totalTime = (recipe.fields.prep_time_minutes || 0) + (recipe.fields.cook_time_minutes || 0);
    const formatTime = (minutes: number) => {
      if (minutes === 0) return '-';
      if (minutes < 60) return `${minutes}min`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    };

    return [
      recipe.fields.name,
      recipe.fields.category,
      recipe.fields.difficulty,
      `${recipe.fields.yield_quantity} ${recipe.fields.yield_unit}`,
      `${recipe.ingredients.length} items`,
      formatTime(totalTime),
      `$${recipe.cost_per_unit.toFixed(2)}`,
      recipe.fields.is_active ? 
        <Badge key={recipe.id} tone="success">Active</Badge> : 
        <Badge key={recipe.id} tone="critical">Inactive</Badge>,
      <ButtonGroup key={`actions-${recipe.id}`} variant="segmented">
        {onView && (
          <Tooltip content="View recipe">
            <Button
              icon={ViewIcon}
              onClick={() => onView(recipe)}
              accessibilityLabel={`View ${recipe.fields.name}`}
            />
          </Tooltip>
        )}
        {onEdit && (
          <Tooltip content="Edit recipe">
            <Button
              icon={EditIcon}
              onClick={() => onEdit(recipe)}
              accessibilityLabel={`Edit ${recipe.fields.name}`}
            />
          </Tooltip>
        )}
        {onDuplicate && (
          <Tooltip content="Duplicate recipe">
            <Button
              icon={DuplicateIcon}
              onClick={() => onDuplicate(recipe)}
              accessibilityLabel={`Duplicate ${recipe.fields.name}`}
            />
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip content="Delete recipe">
            <Button
              icon={DeleteIcon}
              tone="critical"
              onClick={() => handleDeleteClick(recipe)}
              accessibilityLabel={`Delete ${recipe.fields.name}`}
            />
          </Tooltip>
        )}
      </ButtonGroup>
    ];
  });

  const tableHeadings = [
    'Name',
    'Category', 
    'Difficulty',
    'Yield',
    'Ingredients',
    'Time',
    'Cost/Unit',
    'Status',
    'Actions'
  ];

  if (loading) {
    return (
      <Card>
        <Box padding="400">
          <Text variant="bodyMd" as="p" alignment="center">Loading recipes...</Text>
        </Box>
      </Card>
    );
  }

  if (recipes.length === 0) {
    return (
      <Card>
        <EmptyState
          heading="No recipes yet"
          action={onCreate ? { content: 'Create Recipe', onAction: onCreate } : undefined}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <Text variant="bodyMd" as="p">
            Create your first recipe to start managing your menu items and calculating costs.
          </Text>
        </EmptyState>
      </Card>
    );
  }

  return (
    <BlockStack gap="400">
      {/* Header with actions */}
      <InlineStack align="space-between">
        <Text variant="headingLg" as="h2">
          Recipes ({filteredRecipes.length})
        </Text>
        <InlineStack gap="200">
          {selectedRecipes.length > 0 && onExport && (
            <Button
              icon={ExportIcon}
              onClick={handleBulkExport}
            >
              {`Export Selected (${selectedRecipes.length})`}
            </Button>
          )}
          {onCreate && (
            <Button
              variant="primary"
              icon={PlusIcon}
              onClick={onCreate}
            >
              Create Recipe
            </Button>
          )}
        </InlineStack>
      </InlineStack>

      {/* Filters */}
      <Card>
        <BlockStack gap="300">
          <Filters
            queryValue={filters.search}
            queryPlaceholder="Search recipes..."
            onQueryChange={(value) => handleFilterChange('search', value)}
            onQueryClear={() => handleFilterChange('search', '')}
            onClearAll={clearAllFilters}
            filters={filterComponents}
          />
          <Button
            variant="tertiary"
            onClick={() => handleFilterChange('showAdvanced', !filters.showAdvanced)}
          >
            {filters.showAdvanced ? 'Hide advanced filters' : 'Show advanced filters'}
          </Button>
        </BlockStack>
      </Card>

      {/* Controls */}
      <InlineStack align="space-between">
        <InlineStack gap="200">
          <Text variant="bodyMd" as="p">
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedRecipes.length)} of {sortedRecipes.length}
          </Text>
          <Select
            options={ITEMS_PER_PAGE_OPTIONS}
            value={itemsPerPage.toString()}
            onChange={(value) => {
              setItemsPerPage(parseInt(value));
              setCurrentPage(1);
            }}
            label=""
          />
        </InlineStack>
      </InlineStack>

      {/* Results */}
      {filteredRecipes.length === 0 ? (
        <Card>
          <EmptyState
            heading="No recipes match your filters"
            action={{ content: 'Clear filters', onAction: clearAllFilters }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <Text variant="bodyMd" as="p">
              Try adjusting your search terms or filters to find what you're looking for.
            </Text>
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <DataTable
            columnContentTypes={[
              'text', 'text', 'text', 'text', 'text', 'text', 'numeric', 'text', 'text'
            ]}
            headings={tableHeadings}
            rows={tableRows}
            sortable={[true, true, true, false, false, false, true, false, false]}
            onSort={(index, direction) => {
              const sortFields: SortField[] = [
                'name', 'category', 'difficulty', 'name', 'name', 'name', 'cost_per_unit', 'name', 'name'
              ];
              setSortField(sortFields[index]);
              setSortDirection(direction === 'ascending' ? 'asc' : 'desc');
            }}

          />
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <InlineStack align="center">
          <Pagination
            hasPrevious={currentPage > 1}
            onPrevious={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            hasNext={currentPage < totalPages}
            onNext={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            label={`Page ${currentPage} of ${totalPages}`}
          />
        </InlineStack>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Recipe"
        primaryAction={{
          content: 'Delete',
          onAction: handleDeleteConfirm,
          destructive: true
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setDeleteModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          {recipeToDelete && (
            <Text variant="bodyMd" as="p">
              Are you sure you want to delete "{recipeToDelete.fields.name}"? This action cannot be undone.
            </Text>
          )}
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}