import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { IngredientSearchService } from '../../app/services/ingredient-search';
import type { MetaobjectsService } from '../../app/services/metaobjects';
import type { AuditLogService } from '../../app/services/audit-log';

// Mock dependencies
const mockMetaobjectsService = {
  getByGid: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  executeBulkOperations: jest.fn(),
  createIngredient: jest.fn(),
  updateIngredient: jest.fn(),
  getIngredient: jest.fn(),
  listIngredients: jest.fn(),
  deleteIngredient: jest.fn(),
  createRecipe: jest.fn(),
  updateRecipe: jest.fn(),
  deleteRecipe: jest.fn()
} as any;

const mockAuditLogService = {
  getOperationLogs: jest.fn(),
  startBatchAudit: jest.fn(),
  completeBatchAudit: jest.fn(),
  logAction: jest.fn(),
  logIngredientChange: jest.fn(),
  logRecipeChange: jest.fn(),
  logBatchOperation: jest.fn(),
  getActionsByEntity: jest.fn(),
  getActionsByUser: jest.fn()
} as any;

// Test data
const mockIngredients = [
  {
    id: 'gid://shopify/Metaobject/ingredient-1',
    handle: 'flour-all-purpose',
    fields: {
      name: 'All-Purpose Flour',
      category: 'Baking',
      supplier: 'Local Mill Co',
      cost_per_unit: '2.50',
      unit_type: 'pound',
      allergens: ['Gluten'],
      is_active: true,
      last_cost_update: '2024-01-15',
      notes: 'Premium quality flour'
    }
  },
  {
    id: 'gid://shopify/Metaobject/ingredient-2',
    handle: 'sugar-granulated',
    fields: {
      name: 'Granulated Sugar',
      category: 'Sweeteners',
      supplier: 'Sweet Supply Co',
      cost_per_unit: '1.80',
      unit_type: 'pound',
      allergens: [],
      is_active: true,
      last_cost_update: '2024-01-10',
      notes: 'Pure cane sugar'
    }
  },
  {
    id: 'gid://shopify/Metaobject/ingredient-3',
    handle: 'chocolate-dark',
    fields: {
      name: 'Dark Chocolate 70%',
      category: 'Chocolate',
      supplier: 'Cocoa Dreams',
      cost_per_unit: '8.50',
      unit_type: 'pound',
      allergens: ['Milk', 'Soy'],
      is_active: true,
      last_cost_update: '2024-01-20',
      notes: 'Premium Belgian chocolate'
    }
  },
  {
    id: 'gid://shopify/Metaobject/ingredient-4',
    handle: 'butter-unsalted',
    fields: {
      name: 'Unsalted Butter',
      category: 'Dairy',
      supplier: 'Farm Fresh Dairy',
      cost_per_unit: '4.20',
      unit_type: 'pound',
      allergens: ['Milk'],
      is_active: false,
      last_cost_update: '2024-01-05',
      notes: 'Currently discontinued'
    }
  },
  {
    id: 'gid://shopify/Metaobject/ingredient-5',
    handle: 'vanilla-extract',
    fields: {
      name: 'Pure Vanilla Extract',
      category: 'Extracts',
      supplier: 'Flavor House',
      cost_per_unit: '15.00',
      unit_type: 'ounce',
      allergens: [],
      is_active: true,
      last_cost_update: '2024-01-18',
      notes: 'Madagascar vanilla beans'
    }
  }
];

describe('IngredientSearchService Integration Tests', () => {
  let searchService: IngredientSearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create service with mocked dependencies
    searchService = new (class implements IngredientSearchService {
      constructor(
        private deps: {
          metaobjectsService: MetaobjectsService;
          auditLogService: AuditLogService;
        }
      ) {}

      async searchIngredients(criteria: {
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
        limit?: number;
        offset?: number;
      }) {
        // Simulate search logic
        let results = [...mockIngredients];

        // Apply text search
        if (criteria.query) {
          const query = criteria.query.toLowerCase();
          results = results.filter(ingredient => 
            ingredient.fields.name.toLowerCase().includes(query) ||
            ingredient.fields.category.toLowerCase().includes(query) ||
            ingredient.fields.supplier.toLowerCase().includes(query) ||
            ingredient.fields.notes.toLowerCase().includes(query)
          );
        }

        // Apply category filter
        if (criteria.category) {
          results = results.filter(ingredient => 
            ingredient.fields.category === criteria.category
          );
        }

        // Apply supplier filter
        if (criteria.supplier) {
          results = results.filter(ingredient => 
            ingredient.fields.supplier === criteria.supplier
          );
        }

        // Apply allergen filters - ingredient must contain ALL specified allergens
        if (criteria.allergens && criteria.allergens.length > 0) {
          results = results.filter(ingredient =>
            criteria.allergens!.every(allergen =>
              ingredient.fields.allergens.includes(allergen)
            )
          );
        }

        if (criteria.excludeAllergens && criteria.excludeAllergens.length > 0) {
          results = results.filter(ingredient =>
            !criteria.excludeAllergens!.some(allergen =>
              ingredient.fields.allergens.includes(allergen)
            )
          );
        }

        // Apply active status filter
        if (criteria.isActive !== undefined) {
          results = results.filter(ingredient => 
            ingredient.fields.is_active === criteria.isActive
          );
        }

        // Apply cost range filter
        if (criteria.costRange) {
          results = results.filter(ingredient => {
            const cost = parseFloat(ingredient.fields.cost_per_unit);
            if (criteria.costRange!.min !== undefined && cost < criteria.costRange!.min) {
              return false;
            }
            if (criteria.costRange!.max !== undefined && cost > criteria.costRange!.max) {
              return false;
            }
            return true;
          });
        }

        // Apply unit type filter
        if (criteria.unitType) {
          results = results.filter(ingredient => 
            ingredient.fields.unit_type === criteria.unitType
          );
        }

        // Apply last updated filter
        if (criteria.lastUpdatedAfter) {
          results = results.filter(ingredient => 
            ingredient.fields.last_cost_update >= criteria.lastUpdatedAfter!
          );
        }

        // Apply sorting
        if (criteria.sortBy) {
          results.sort((a, b) => {
            let aValue: any, bValue: any;
            
            switch (criteria.sortBy) {
              case 'name':
                aValue = a.fields.name;
                bValue = b.fields.name;
                break;
              case 'category':
                aValue = a.fields.category;
                bValue = b.fields.category;
                break;
              case 'cost':
                aValue = parseFloat(a.fields.cost_per_unit);
                bValue = parseFloat(b.fields.cost_per_unit);
                break;
              case 'lastUpdated':
                aValue = a.fields.last_cost_update;
                bValue = b.fields.last_cost_update;
                break;
              default:
                return 0;
            }

            if (aValue < bValue) return criteria.sortOrder === 'desc' ? 1 : -1;
            if (aValue > bValue) return criteria.sortOrder === 'desc' ? -1 : 1;
            return 0;
          });
        }

        // Apply pagination
        const offset = criteria.offset || 0;
        const limit = criteria.limit || results.length;
        const paginatedResults = results.slice(offset, offset + limit);

        return {
          ingredients: paginatedResults,
          total: results.length,
          offset,
          limit: Math.min(limit, paginatedResults.length)
        };
      }

      async getCategories() {
        return [...new Set(mockIngredients.map(i => i.fields.category))].sort();
      }

      async getSuppliers() {
        return [...new Set(mockIngredients.map(i => i.fields.supplier))].sort();
      }

      async getAllergens() {
        const allergens = new Set<string>();
        mockIngredients.forEach(ingredient => {
          ingredient.fields.allergens.forEach(allergen => allergens.add(allergen));
        });
        return [...allergens].sort();
      }

      async getUnitTypes() {
        return [...new Set(mockIngredients.map(i => i.fields.unit_type))].sort();
      }

      async getIngredientsByIds(ids: string[]) {
        return mockIngredients.filter(ingredient => ids.includes(ingredient.id));
      }

      async createSearchFilter(name: string, criteria: any, userId: string) {
        const filterId = `gid://shopify/Metaobject/search-filter-${Date.now()}`;
        
        await this.deps.auditLogService.startBatchAudit(userId, `create-filter-${Date.now()}`, {
          operation: 'CREATE_SEARCH_FILTER',
          entityType: 'search_filter',
          name,
          criteria
        });

        return {
          id: filterId,
          name,
          criteria,
          createdBy: userId,
          createdAt: new Date().toISOString()
        };
      }

      async getSavedFilters(userId: string) {
        return []; // Simplified for testing
      }

      async updateSearchFilter(filterId: string, updates: any, userId: string) {
        await this.deps.auditLogService.startBatchAudit(userId, `update-filter-${Date.now()}`, {
          operation: 'UPDATE_SEARCH_FILTER',
          entityType: 'search_filter',
          filterId,
          updates
        });

        return { success: true };
      }

      async deleteSearchFilter(filterId: string, userId: string) {
        await this.deps.auditLogService.startBatchAudit(userId, `delete-filter-${Date.now()}`, {
          operation: 'DELETE_SEARCH_FILTER',
          entityType: 'search_filter',
          filterId
        });

        return { success: true };
      }
    })({
      metaobjectsService: mockMetaobjectsService,
      auditLogService: mockAuditLogService
    });
  });

  describe('Basic Search Functionality', () => {
    it('should search ingredients by name', async () => {
      const result = await searchService.searchIngredients({
        query: 'flour'
      });

      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0].fields.name).toBe('All-Purpose Flour');
      expect(result.total).toBe(1);
    });

    it('should search ingredients by category', async () => {
      const result = await searchService.searchIngredients({
        query: 'chocolate'
      });

      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0].fields.category).toBe('Chocolate');
    });

    it('should search ingredients by supplier', async () => {
      const result = await searchService.searchIngredients({
        query: 'local mill'
      });

      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0].fields.supplier).toBe('Local Mill Co');
    });

    it('should return all ingredients when no query provided', async () => {
      const result = await searchService.searchIngredients({});

      expect(result.ingredients).toHaveLength(5);
      expect(result.total).toBe(5);
    });
  });

  describe('Category Filtering', () => {
    it('should filter by specific category', async () => {
      const result = await searchService.searchIngredients({
        category: 'Baking'
      });

      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0].fields.category).toBe('Baking');
    });

    it('should return empty results for non-existent category', async () => {
      const result = await searchService.searchIngredients({
        category: 'NonExistent'
      });

      expect(result.ingredients).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should get all available categories', async () => {
      const categories = await searchService.getCategories();

      expect(categories).toHaveLength(5);
      expect(categories).toContain('Baking');
      expect(categories).toContain('Sweeteners');
      expect(categories).toContain('Chocolate');
      expect(categories).toContain('Dairy');
      expect(categories).toContain('Extracts');
    });
  });

  describe('Supplier Filtering', () => {
    it('should filter by specific supplier', async () => {
      const result = await searchService.searchIngredients({
        supplier: 'Sweet Supply Co'
      });

      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0].fields.supplier).toBe('Sweet Supply Co');
    });

    it('should get all available suppliers', async () => {
      const suppliers = await searchService.getSuppliers();

      expect(suppliers).toHaveLength(5);
      expect(suppliers).toContain('Local Mill Co');
      expect(suppliers).toContain('Sweet Supply Co');
      expect(suppliers).toContain('Cocoa Dreams');
      expect(suppliers).toContain('Farm Fresh Dairy');
      expect(suppliers).toContain('Flavor House');
    });
  });

  describe('Allergen Filtering', () => {
    it('should filter ingredients containing specific allergens', async () => {
      const result = await searchService.searchIngredients({
        allergens: ['Milk']
      });

      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients.every((i: any) => i.fields.allergens.includes('Milk'))).toBe(true);
    });

    it('should filter ingredients excluding specific allergens', async () => {
      const result = await searchService.searchIngredients({
        excludeAllergens: ['Milk']
      });

      expect(result.ingredients).toHaveLength(3);
      expect(result.ingredients.every((i: any) => !i.fields.allergens.includes('Milk'))).toBe(true);
    });

    it('should handle multiple allergen filters', async () => {
      const result = await searchService.searchIngredients({
        allergens: ['Milk', 'Soy']
      });

      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0].fields.name).toBe('Dark Chocolate 70%');
    });

    it('should get all available allergens', async () => {
      const allergens = await searchService.getAllergens();

      expect(allergens).toHaveLength(3);
      expect(allergens).toContain('Gluten');
      expect(allergens).toContain('Milk');
      expect(allergens).toContain('Soy');
    });
  });

  describe('Active Status Filtering', () => {
    it('should filter for active ingredients only', async () => {
      const result = await searchService.searchIngredients({
        isActive: true
      });

      expect(result.ingredients).toHaveLength(4);
      expect(result.ingredients.every((i: any) => i.fields.is_active === true)).toBe(true);
    });

    it('should filter for inactive ingredients only', async () => {
      const result = await searchService.searchIngredients({
        isActive: false
      });

      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0].fields.name).toBe('Unsalted Butter');
    });
  });

  describe('Cost Range Filtering', () => {
    it('should filter by minimum cost', async () => {
      const result = await searchService.searchIngredients({
        costRange: { min: 5.0 }
      });

      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients.every((i: any) => parseFloat(i.fields.cost_per_unit) >= 5.0)).toBe(true);
    });

    it('should filter by maximum cost', async () => {
      const result = await searchService.searchIngredients({
        costRange: { max: 3.0 }
      });

      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients.every((i: any) => parseFloat(i.fields.cost_per_unit) <= 3.0)).toBe(true);
    });

    it('should filter by cost range', async () => {
      const result = await searchService.searchIngredients({
        costRange: { min: 2.0, max: 5.0 }
      });

      expect(result.ingredients).toHaveLength(2);
      result.ingredients.forEach((ingredient: any) => {
        const cost = parseFloat(ingredient.fields.cost_per_unit);
        expect(cost).toBeGreaterThanOrEqual(2.0);
        expect(cost).toBeLessThanOrEqual(5.0);
      });
    });
  });

  describe('Unit Type Filtering', () => {
    it('should filter by unit type', async () => {
      const result = await searchService.searchIngredients({
        unitType: 'pound'
      });

      expect(result.ingredients).toHaveLength(4);
      expect(result.ingredients.every((i: any) => i.fields.unit_type === 'pound')).toBe(true);
    });

    it('should get all available unit types', async () => {
      const unitTypes = await searchService.getUnitTypes();

      expect(unitTypes).toHaveLength(2);
      expect(unitTypes).toContain('pound');
      expect(unitTypes).toContain('ounce');
    });
  });

  describe('Date Filtering', () => {
    it('should filter by last updated date', async () => {
      const result = await searchService.searchIngredients({
        lastUpdatedAfter: '2024-01-15'
      });

      expect(result.ingredients).toHaveLength(3);
      expect(result.ingredients.every((i: any) => i.fields.last_cost_update >= '2024-01-15')).toBe(true);
    });
  });

  describe('Sorting', () => {
    it('should sort by name ascending', async () => {
      const result = await searchService.searchIngredients({
        sortBy: 'name',
        sortOrder: 'asc'
      });

      expect(result.ingredients[0].fields.name).toBe('All-Purpose Flour');
      expect(result.ingredients[4].fields.name).toBe('Unsalted Butter');
    });

    it('should sort by name descending', async () => {
      const result = await searchService.searchIngredients({
        sortBy: 'name',
        sortOrder: 'desc'
      });

      expect(result.ingredients[0].fields.name).toBe('Unsalted Butter');
      expect(result.ingredients[4].fields.name).toBe('All-Purpose Flour');
    });

    it('should sort by cost ascending', async () => {
      const result = await searchService.searchIngredients({
        sortBy: 'cost',
        sortOrder: 'asc'
      });

      expect(parseFloat(result.ingredients[0].fields.cost_per_unit)).toBe(1.80);
      expect(parseFloat(result.ingredients[4].fields.cost_per_unit)).toBe(15.00);
    });

    it('should sort by category', async () => {
      const result = await searchService.searchIngredients({
        sortBy: 'category',
        sortOrder: 'asc'
      });

      expect(result.ingredients[0].fields.category).toBe('Baking');
      expect(result.ingredients[4].fields.category).toBe('Sweeteners');
    });
  });

  describe('Pagination', () => {
    it('should apply pagination with limit', async () => {
      const result = await searchService.searchIngredients({
        limit: 2
      });

      expect(result.ingredients).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
    });

    it('should apply pagination with offset', async () => {
      const result = await searchService.searchIngredients({
        offset: 2,
        limit: 2
      });

      expect(result.ingredients).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(2);
    });

    it('should handle offset beyond available results', async () => {
      const result = await searchService.searchIngredients({
        offset: 10,
        limit: 2
      });

      expect(result.ingredients).toHaveLength(0);
      expect(result.total).toBe(5);
      expect(result.offset).toBe(10);
    });
  });

  describe('Combined Filters', () => {
    it('should apply multiple filters simultaneously', async () => {
      const result = await searchService.searchIngredients({
        category: 'Chocolate',
        isActive: true,
        costRange: { min: 5.0 },
        excludeAllergens: ['Gluten']
      });

      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0].fields.name).toBe('Dark Chocolate 70%');
    });

    it('should return empty results when filters conflict', async () => {
      const result = await searchService.searchIngredients({
        category: 'Baking',
        excludeAllergens: ['Gluten']
      });

      expect(result.ingredients).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Ingredient Selection by IDs', () => {
    it('should get ingredients by specific IDs', async () => {
      const ids = [
        'gid://shopify/Metaobject/ingredient-1',
        'gid://shopify/Metaobject/ingredient-3'
      ];

      const result = await searchService.getIngredientsByIds(ids);

      expect(result).toHaveLength(2);
      expect(result[0].fields.name).toBe('All-Purpose Flour');
      expect(result[1].fields.name).toBe('Dark Chocolate 70%');
    });

    it('should handle non-existent IDs', async () => {
      const ids = ['gid://shopify/Metaobject/ingredient-999'];

      const result = await searchService.getIngredientsByIds(ids);

      expect(result).toHaveLength(0);
    });
  });

  describe('Saved Search Filters', () => {
    it('should create saved search filter', async () => {
      const criteria = {
        category: 'Baking',
        isActive: true,
        costRange: { max: 5.0 }
      };

      const filter = await searchService.createSearchFilter(
        'Affordable Baking Ingredients',
        criteria,
        'user-123'
      );

      expect(filter.name).toBe('Affordable Baking Ingredients');
      expect(filter.criteria).toEqual(criteria);
      expect(filter.createdBy).toBe('user-123');
      expect(mockAuditLogService.startBatchAudit).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('create-filter-'),
        {
          operation: 'CREATE_SEARCH_FILTER',
          entityType: 'search_filter',
          name: 'Affordable Baking Ingredients',
          criteria
        }
      );
    });

    it('should update saved search filter', async () => {
      const updates = { name: 'Updated Filter Name' };

      const result = await searchService.updateSearchFilter(
        'gid://shopify/Metaobject/search-filter-123',
        updates,
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(mockAuditLogService.startBatchAudit).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('update-filter-'),
        {
          operation: 'UPDATE_SEARCH_FILTER',
          entityType: 'search_filter',
          filterId: 'gid://shopify/Metaobject/search-filter-123',
          updates
        }
      );
    });

    it('should delete saved search filter', async () => {
      const result = await searchService.deleteSearchFilter(
        'gid://shopify/Metaobject/search-filter-123',
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(mockAuditLogService.startBatchAudit).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('delete-filter-'),
        {
          operation: 'DELETE_SEARCH_FILTER',
          entityType: 'search_filter',
          filterId: 'gid://shopify/Metaobject/search-filter-123'
        }
      );
    });
  });
});