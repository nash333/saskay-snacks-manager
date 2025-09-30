import type { MetaobjectsService } from './metaobjects';
import type { AuditLogService } from './audit-log';

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
  limit?: number;
  offset?: number;
}

export interface IngredientSearchResult {
  ingredients: any[];
  total: number;
  offset: number;
  limit: number;
}

export interface SavedSearchFilter {
  id: string;
  name: string;
  criteria: IngredientSearchCriteria;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IngredientSearchService {
  /**
   * Search ingredients based on criteria
   */
  searchIngredients(criteria: IngredientSearchCriteria): Promise<IngredientSearchResult>;

  /**
   * Get all available categories
   */
  getCategories(): Promise<string[]>;

  /**
   * Get all available suppliers
   */
  getSuppliers(): Promise<string[]>;

  /**
   * Get all available allergens
   */
  getAllergens(): Promise<string[]>;

  /**
   * Get all available unit types
   */
  getUnitTypes(): Promise<string[]>;

  /**
   * Get ingredients by specific IDs
   */
  getIngredientsByIds(ids: string[]): Promise<any[]>;

  /**
   * Create a saved search filter
   */
  createSearchFilter(name: string, criteria: IngredientSearchCriteria, userId: string): Promise<SavedSearchFilter>;

  /**
   * Get saved search filters for a user
   */
  getSavedFilters(userId: string): Promise<SavedSearchFilter[]>;

  /**
   * Update a saved search filter
   */
  updateSearchFilter(filterId: string, updates: Partial<SavedSearchFilter>, userId: string): Promise<{ success: boolean }>;

  /**
   * Delete a saved search filter
   */
  deleteSearchFilter(filterId: string, userId: string): Promise<{ success: boolean }>;
}

export class IngredientSearchServiceImpl implements IngredientSearchService {
  constructor(
    private deps: {
      metaobjectsService: MetaobjectsService;
      auditLogService: AuditLogService;
    }
  ) {}

  async searchIngredients(criteria: IngredientSearchCriteria): Promise<IngredientSearchResult> {
    // Fetch real ingredients from Shopify metaobjects
    const metaobjectsResult = await this.deps.metaobjectsService.listIngredients({
      first: 250, // Get a large batch for filtering
      filter: {
        includeInactive: criteria.isActive === undefined ? true : criteria.isActive
      }
    });

    console.log('Fetched ingredients from metaobjects:', metaobjectsResult.edges.length);
    console.log('Sample edge:', JSON.stringify(metaobjectsResult.edges[0], null, 2));

    // Convert metaobject edges to ingredient format
    let ingredients = metaobjectsResult.edges.map(edge => edge.node);

    console.log('Converted ingredients:', ingredients.length);
    console.log('Sample ingredient:', JSON.stringify(ingredients[0], null, 2));

    // Apply client-side filtering for complex criteria
    ingredients = this.applyFilters(ingredients, criteria);

    // Apply sorting
    if (criteria.sortBy) {
      ingredients = this.applySorting(ingredients, criteria.sortBy, criteria.sortOrder || 'asc');
    }

    // Apply pagination after filtering
    const total = ingredients.length;
    const offset = criteria.offset || 0;
    const limit = criteria.limit || total;
    const paginatedResults = ingredients.slice(offset, offset + limit);

    return {
      ingredients: paginatedResults,
      total,
      offset,
      limit: Math.min(limit, paginatedResults.length)
    };
  }

  async getCategories(): Promise<string[]> {
    const metaobjectsResult = await this.deps.metaobjectsService.listIngredients({ first: 250 });
    const categories = new Set<string>();
    metaobjectsResult.edges.forEach((edge: any) => {
      if (edge.node.category) {
        categories.add(edge.node.category);
      }
    });
    return [...categories].sort();
  }

  async getSuppliers(): Promise<string[]> {
    const metaobjectsResult = await this.deps.metaobjectsService.listIngredients({ first: 250 });
    const suppliers = new Set<string>();
    metaobjectsResult.edges.forEach((edge: any) => {
      if (edge.node.supplier) {
        suppliers.add(edge.node.supplier);
      }
    });
    return [...suppliers].sort();
  }

  async getAllergens(): Promise<string[]> {
    const metaobjectsResult = await this.deps.metaobjectsService.listIngredients({ first: 250 });
    const allergens = new Set<string>();
    metaobjectsResult.edges.forEach((edge: any) => {
      if (edge.node.allergens && Array.isArray(edge.node.allergens)) {
        edge.node.allergens.forEach((allergen: string) => allergens.add(allergen));
      }
    });
    return [...allergens].sort();
  }

  async getUnitTypes(): Promise<string[]> {
    const metaobjectsResult = await this.deps.metaobjectsService.listIngredients({ first: 250 });
    const unitTypes = new Set<string>();
    metaobjectsResult.edges.forEach((edge: any) => {
      if (edge.node.unitType) {
        unitTypes.add(edge.node.unitType);
      }
    });
    return [...unitTypes].sort();
  }

  async getIngredientsByIds(ids: string[]): Promise<any[]> {
    const results = await Promise.all(
      ids.map(id => this.deps.metaobjectsService.getIngredient(id))
    );
    return results.filter(ingredient => ingredient !== null);
  }

  async createSearchFilter(name: string, criteria: IngredientSearchCriteria, userId: string): Promise<SavedSearchFilter> {
    const filterId = `gid://shopify/Metaobject/search-filter-${Date.now()}`;
    const now = new Date().toISOString();

    // Log the operation using existing method signature
    await this.deps.auditLogService.startBatchAudit(userId, `search-filter-${Date.now()}`, {
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
      createdAt: now
    };
  }

  async getSavedFilters(userId: string): Promise<SavedSearchFilter[]> {
    // Return empty array for now - would integrate with Shopify API
    return [];
  }

  async updateSearchFilter(filterId: string, updates: Partial<SavedSearchFilter>, userId: string): Promise<{ success: boolean }> {
    // Log the operation
    await this.deps.auditLogService.startBatchAudit(userId, `update-filter-${Date.now()}`, {
      operation: 'UPDATE_SEARCH_FILTER',
      entityType: 'search_filter',
      filterId,
      updates
    });

    return { success: true };
  }

  async deleteSearchFilter(filterId: string, userId: string): Promise<{ success: boolean }> {
    // Log the operation
    await this.deps.auditLogService.startBatchAudit(userId, `delete-filter-${Date.now()}`, {
      operation: 'DELETE_SEARCH_FILTER',
      entityType: 'search_filter',
      filterId
    });

    return { success: true };
  }

  private getMockIngredients(): any[] {
    return [
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
  }

  private processIngredientResults(response: any): any[] {
    const edges = response.data?.metaobjects?.edges || response.data?.nodes || [];
    
    return edges.map((edge: any) => {
      const node = edge.node || edge;
      const fields: any = {};
      
      if (node.fields) {
        node.fields.forEach((field: any) => {
          let value = field.value;
          
          // Parse JSON fields
          if (field.key === 'allergens' && typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch {
              value = [];
            }
          }
          
          // Parse boolean fields
          if (field.key === 'is_active') {
            value = value === 'true' || value === true;
          }
          
          fields[field.key] = value;
        });
      }
      
      return {
        id: node.id,
        handle: node.handle,
        fields
      };
    });
  }

  private processSavedFilterResults(response: any): SavedSearchFilter[] {
    const edges = response.data?.metaobjects?.edges || [];
    
    return edges.map((edge: any) => {
      const node = edge.node;
      const fields: any = {};
      
      node.fields.forEach((field: any) => {
        fields[field.key] = field.value;
      });
      
      return {
        id: node.id,
        name: fields.name,
        criteria: JSON.parse(fields.criteria || '{}'),
        createdBy: fields.created_by,
        createdAt: fields.created_at,
        updatedAt: fields.updated_at
      };
    });
  }

  private applyFilters(ingredients: any[], criteria: IngredientSearchCriteria): any[] {
    let results = [...ingredients];

    // Text search
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      results = results.filter(ingredient =>
        ingredient.name?.toLowerCase().includes(query) ||
        ingredient.category?.toLowerCase().includes(query) ||
        ingredient.supplier?.toLowerCase().includes(query) ||
        ingredient.notes?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (criteria.category) {
      results = results.filter(ingredient =>
        ingredient.category === criteria.category
      );
    }

    // Supplier filter
    if (criteria.supplier) {
      results = results.filter(ingredient =>
        ingredient.supplier === criteria.supplier
      );
    }

    // Allergen filters - ingredient must contain ALL specified allergens
    if (criteria.allergens && criteria.allergens.length > 0) {
      results = results.filter(ingredient =>
        criteria.allergens!.every(allergen =>
          ingredient.allergens?.includes(allergen)
        )
      );
    }

    if (criteria.excludeAllergens && criteria.excludeAllergens.length > 0) {
      results = results.filter(ingredient =>
        !criteria.excludeAllergens!.some(allergen =>
          ingredient.allergens?.includes(allergen)
        )
      );
    }

    // Active status filter
    if (criteria.isActive !== undefined) {
      results = results.filter(ingredient =>
        ingredient.isActive === criteria.isActive
      );
    }

    // Cost range filter
    if (criteria.costRange) {
      results = results.filter(ingredient => {
        const cost = ingredient.costPerUnit;
        if (isNaN(cost)) return false;

        if (criteria.costRange!.min !== undefined && cost < criteria.costRange!.min) {
          return false;
        }
        if (criteria.costRange!.max !== undefined && cost > criteria.costRange!.max) {
          return false;
        }
        return true;
      });
    }

    // Unit type filter
    if (criteria.unitType) {
      results = results.filter(ingredient =>
        ingredient.unitType === criteria.unitType
      );
    }

    // Last updated filter
    if (criteria.lastUpdatedAfter) {
      results = results.filter(ingredient =>
        ingredient.updatedAt && ingredient.updatedAt >= criteria.lastUpdatedAfter!
      );
    }

    return results;
  }

  private applySorting(ingredients: any[], sortBy: string, sortOrder: 'asc' | 'desc'): any[] {
    return ingredients.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        case 'cost':
          aValue = parseFloat(a.costPerUnit?.toString() || '0') || 0;
          bValue = parseFloat(b.costPerUnit?.toString() || '0') || 0;
          break;
        case 'lastUpdated':
          aValue = a.updatedAt || '';
          bValue = b.updatedAt || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'desc' ? 1 : -1;
      if (aValue > bValue) return sortOrder === 'desc' ? -1 : 1;
      return 0;
    });
  }
}