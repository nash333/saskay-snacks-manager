/**
 * Packaging Save Service (Task 29)
 * Implements packaging save & retrieval with reuse across products (FR-009, FR-030)
 */

export interface PackagingInfo {
  id?: string;
  name: string;
  description?: string;
  costPerUnit: number;
  unitType: 'each' | 'weight' | 'volume';
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'inches' | 'cm';
  };
  weight?: {
    value: number;
    unit: 'grams' | 'ounces';
  };
  capacity?: {
    value: number;
    unit: 'ml' | 'oz' | 'cups';
  };
  supplierInfo?: {
    supplierName: string;
    sku: string;
    orderingUrl?: string;
    minimumOrderQuantity?: number;
  };
  isActive: boolean;
  tags?: string[];
}

export interface PackagingSaveResponse extends PackagingInfo {
  id: string;
  usedByProducts: Array<{
    productId: string;
    productName: string;
    lastUsed: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  usageStats: {
    totalProducts: number;
    activeProducts: number;
    lastUsed?: Date;
    monthlyUsage: number;
  };
}

export interface PackagingSearchOptions {
  nameFilter?: string;
  unitType?: 'each' | 'weight' | 'volume';
  maxCostPerUnit?: number;
  minCostPerUnit?: number;
  supplierName?: string;
  tags?: string[];
  activeOnly?: boolean;
  sortBy?: 'name' | 'cost' | 'usage' | 'created' | 'updated';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PackagingReuseAnalysis {
  packagingId: string;
  packagingName: string;
  totalUses: number;
  uniqueProducts: number;
  costSavings: {
    totalSaved: number;
    savingsPerProduct: number;
    alternativeCost: number;
  };
  usagePattern: {
    mostRecentUse: Date;
    averageUsesPerMonth: number;
    peakUsageMonth: string;
  };
  recommendations: string[];
}

/**
 * Packaging Save Service
 */
export class PackagingSaveService {
  private metaobjects: any;
  private auditLog: any;

  constructor(metaobjectsService: any, auditLogService: any) {
    this.metaobjects = metaobjectsService;
    this.auditLog = auditLogService;
  }

  /**
   * Save packaging configuration (create or update)
   */
  async savePackaging(
    packaging: PackagingInfo,
    userId?: string
  ): Promise<PackagingSaveResponse> {
    // Step 1: Validate packaging data
    const validation = this.validatePackaging(packaging);
    if (!validation.valid) {
      throw new PackagingValidationError(validation.errors);
    }

    // Step 2: Check for duplicate names (if creating new)
    if (!packaging.id) {
      await this.checkForDuplicateName(packaging.name);
    }

    // Step 3: Save packaging to metaobjects
    const savedPackaging = await this.savePackagingToMetaobjects(packaging, userId);

    // Step 4: Get usage information
    const usageInfo = await this.getPackagingUsage(savedPackaging.id);

    // Step 5: Calculate usage statistics
    const usageStats = this.calculateUsageStats(usageInfo);

    // Step 6: Log the save action
    await this.auditLog.logAction(
      packaging.id ? 'UPDATE' : 'CREATE',
      'packaging',
      {
        entityId: savedPackaging.id,
        entityName: savedPackaging.name,
        metadata: {
          costPerUnit: savedPackaging.costPerUnit,
          unitType: savedPackaging.unitType,
          isActive: savedPackaging.isActive,
          supplierInfo: savedPackaging.supplierInfo?.supplierName
        },
        userId
      }
    );

    return {
      ...savedPackaging,
      usedByProducts: usageInfo,
      usageStats,
      createdAt: savedPackaging.createdAt || new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get packaging by ID with usage information
   */
  async getPackaging(packagingId: string): Promise<PackagingSaveResponse | null> {
    const packaging = await this.metaobjects.getPackaging(packagingId);
    if (!packaging) return null;

    const usageInfo = await this.getPackagingUsage(packagingId);
    const usageStats = this.calculateUsageStats(usageInfo);

    return {
      ...packaging,
      usedByProducts: usageInfo,
      usageStats
    };
  }

  /**
   * Search packaging with filters and pagination
   */
  async searchPackaging(options: PackagingSearchOptions = {}): Promise<{
    packagings: PackagingSaveResponse[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const limit = Math.min(options.limit || 50, 200);
    const offset = options.offset || 0;

    // Get packagings from metaobjects with filters
    const result = await this.metaobjects.searchPackaging({
      nameFilter: options.nameFilter,
      unitType: options.unitType,
      maxCostPerUnit: options.maxCostPerUnit,
      minCostPerUnit: options.minCostPerUnit,
      supplierName: options.supplierName,
      tags: options.tags,
      activeOnly: options.activeOnly,
      limit: limit + 1, // Get one extra to check hasNext
      offset
    });

    // Check if we have more results
    const hasNext = result.packagings.length > limit;
    const packagings = hasNext ? result.packagings.slice(0, limit) : result.packagings;

    // Enrich with usage information
    const enrichedPackagings = await Promise.all(
      packagings.map(async (packaging: any) => {
        const usageInfo = await this.getPackagingUsage(packaging.id);
        const usageStats = this.calculateUsageStats(usageInfo);
        
        return {
          ...packaging,
          usedByProducts: usageInfo,
          usageStats
        };
      })
    );

    // Apply sorting
    const sortedPackagings = this.sortPackagings(enrichedPackagings, options.sortBy, options.sortOrder);

    return {
      packagings: sortedPackagings,
      pagination: {
        total: result.total || packagings.length,
        limit,
        offset,
        hasNext,
        hasPrevious: offset > 0
      }
    };
  }

  /**
   * Assign packaging to a product
   */
  async assignPackagingToProduct(
    packagingId: string,
    productId: string,
    productName: string,
    userId?: string
  ): Promise<{
    packagingId: string;
    productId: string;
    assignedAt: Date;
    previousPackaging?: string;
  }> {
    // Validate packaging exists and is active
    const packaging = await this.getPackaging(packagingId);
    if (!packaging) {
      throw new PackagingValidationError(['Packaging not found']);
    }
    if (!packaging.isActive) {
      throw new PackagingValidationError(['Cannot assign inactive packaging']);
    }

    // Check if product already has packaging assigned
    const previousPackaging = await this.getProductPackaging(productId);

    // Assign packaging to product
    await this.metaobjects.assignPackagingToProduct(packagingId, productId, productName);

    // Log the assignment
    await this.auditLog.logAction('ASSIGN', 'packaging', {
      entityId: packagingId,
      entityName: packaging.name,
      metadata: {
        productId,
        productName,
        previousPackaging: previousPackaging?.id,
        costPerUnit: packaging.costPerUnit
      },
      userId
    });

    return {
      packagingId,
      productId,
      assignedAt: new Date(),
      previousPackaging: previousPackaging?.id
    };
  }

  /**
   * Get reuse analysis for packaging
   */
  async getPackagingReuseAnalysis(packagingId: string): Promise<PackagingReuseAnalysis> {
    const packaging = await this.getPackaging(packagingId);
    if (!packaging) {
      throw new PackagingValidationError(['Packaging not found']);
    }

    const usageHistory = await this.getPackagingUsageHistory(packagingId);
    
    // Calculate cost savings compared to single-use packaging
    const alternativeCostPerUnit = packaging.costPerUnit * 1.2; // Assume 20% markup for single-use
    const totalSaved = (alternativeCostPerUnit - packaging.costPerUnit) * packaging.usageStats.totalProducts;
    const savingsPerProduct = totalSaved / Math.max(packaging.usageStats.totalProducts, 1);

    // Analyze usage patterns
    const usagePattern = this.analyzeUsagePattern(usageHistory);

    // Generate recommendations
    const recommendations = this.generateReuseRecommendations(packaging, usagePattern);

    return {
      packagingId,
      packagingName: packaging.name,
      totalUses: usageHistory.length,
      uniqueProducts: packaging.usageStats.totalProducts,
      costSavings: {
        totalSaved,
        savingsPerProduct,
        alternativeCost: alternativeCostPerUnit
      },
      usagePattern,
      recommendations
    };
  }

  /**
   * Find similar packaging options for reuse
   */
  async findSimilarPackaging(
    criteria: {
      dimensions?: { length: number; width: number; height: number; tolerance?: number };
      capacity?: { value: number; unit: string; tolerance?: number };
      costRange?: { min: number; max: number };
      unitType?: string;
    },
    excludeIds?: string[]
  ): Promise<Array<{
    packaging: PackagingSaveResponse;
    similarity: {
      score: number; // 0-1
      matches: string[];
      differences: string[];
    };
  }>> {
    // Get all active packaging
    const { packagings } = await this.searchPackaging({ 
      activeOnly: true,
      limit: 1000
    });

    const candidates = packagings
      .filter(p => !excludeIds?.includes(p.id))
      .map(packaging => ({
        packaging,
        similarity: this.calculateSimilarity(packaging, criteria)
      }))
      .filter(candidate => candidate.similarity.score > 0.5) // Only include reasonably similar options
      .sort((a, b) => b.similarity.score - a.similarity.score);

    return candidates;
  }

  /**
   * Bulk update packaging assignments
   */
  async bulkUpdatePackagingAssignments(
    updates: Array<{
      productId: string;
      productName: string;
      newPackagingId: string;
    }>,
    userId?: string
  ): Promise<{
    successful: Array<{ productId: string; packagingId: string }>;
    failed: Array<{ productId: string; error: string }>;
    summary: {
      totalAttempted: number;
      successful: number;
      failed: number;
    };
  }> {
    const successful: Array<{ productId: string; packagingId: string }> = [];
    const failed: Array<{ productId: string; error: string }> = [];

    for (const update of updates) {
      try {
        await this.assignPackagingToProduct(
          update.newPackagingId,
          update.productId,
          update.productName,
          userId
        );
        successful.push({ productId: update.productId, packagingId: update.newPackagingId });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ productId: update.productId, error: errorMessage });
      }
    }

    return {
      successful,
      failed,
      summary: {
        totalAttempted: updates.length,
        successful: successful.length,
        failed: failed.length
      }
    };
  }

  // Private helper methods

  private validatePackaging(packaging: PackagingInfo): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!packaging.name || packaging.name.trim() === '') {
      errors.push('Packaging name is required');
    }

    if (typeof packaging.costPerUnit !== 'number' || packaging.costPerUnit < 0) {
      errors.push('Cost per unit must be a non-negative number');
    }

    if (!['each', 'weight', 'volume'].includes(packaging.unitType)) {
      errors.push('Unit type must be "each", "weight", or "volume"');
    }

    // Validate dimensions if provided
    if (packaging.dimensions) {
      if (packaging.dimensions.length <= 0 || packaging.dimensions.width <= 0 || packaging.dimensions.height <= 0) {
        errors.push('Dimensions must be positive numbers');
      }
    }

    // Validate weight if provided
    if (packaging.weight && packaging.weight.value <= 0) {
      errors.push('Weight must be a positive number');
    }

    // Validate capacity if provided
    if (packaging.capacity && packaging.capacity.value <= 0) {
      errors.push('Capacity must be a positive number');
    }

    // Validate supplier info if provided
    if (packaging.supplierInfo) {
      if (packaging.supplierInfo.minimumOrderQuantity && packaging.supplierInfo.minimumOrderQuantity < 1) {
        errors.push('Minimum order quantity must be at least 1');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private async checkForDuplicateName(name: string): Promise<void> {
    const existing = await this.metaobjects.findPackagingByName(name);
    if (existing) {
      throw new PackagingValidationError([`Packaging with name "${name}" already exists`]);
    }
  }

  private async savePackagingToMetaobjects(packaging: PackagingInfo, userId?: string): Promise<PackagingInfo & { id: string; createdAt?: Date }> {
    // This would use the MetaobjectsService to save packaging
    // For now, simulate the save operation
    
    const id = packaging.id || `pack_${Date.now()}`;
    const now = new Date();
    
    return {
      ...packaging,
      id,
      createdAt: packaging.id ? undefined : now // Only set createdAt for new packaging
    };
  }

  private async getPackagingUsage(packagingId: string): Promise<Array<{
    productId: string;
    productName: string;
    lastUsed: Date;
  }>> {
    // This would query metaobjects for products using this packaging
    // For now, return mock data
    return [];
  }

  private calculateUsageStats(usageInfo: any[]): {
    totalProducts: number;
    activeProducts: number;
    lastUsed?: Date;
    monthlyUsage: number;
  } {
    const totalProducts = usageInfo.length;
    const activeProducts = usageInfo.filter((usage: any) => {
      // Consider active if used within last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(usage.lastUsed) >= thirtyDaysAgo;
    }).length;

    const lastUsed = usageInfo.length > 0 
      ? new Date(Math.max(...usageInfo.map((u: any) => new Date(u.lastUsed).getTime())))
      : undefined;

    return {
      totalProducts,
      activeProducts,
      lastUsed,
      monthlyUsage: activeProducts // Simplified calculation
    };
  }

  private async getProductPackaging(productId: string): Promise<{ id: string } | null> {
    // This would query metaobjects for current packaging assignment
    return null;
  }

  private async getPackagingUsageHistory(packagingId: string): Promise<any[]> {
    // This would get historical usage data
    return [];
  }

  private sortPackagings(packagings: any[], sortBy?: string, sortOrder?: string): any[] {
    if (!sortBy) return packagings;

    return packagings.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'cost':
          comparison = a.costPerUnit - b.costPerUnit;
          break;
        case 'usage':
          comparison = a.usageStats.totalProducts - b.usageStats.totalProducts;
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updated':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  private analyzeUsagePattern(usageHistory: any[]): {
    mostRecentUse: Date;
    averageUsesPerMonth: number;
    peakUsageMonth: string;
  } {
    if (usageHistory.length === 0) {
      return {
        mostRecentUse: new Date(),
        averageUsesPerMonth: 0,
        peakUsageMonth: 'None'
      };
    }

    const mostRecentUse = new Date(Math.max(...usageHistory.map(u => new Date(u.date).getTime())));
    
    // Simple calculations - in real implementation, analyze monthly patterns
    const averageUsesPerMonth = usageHistory.length / 12; // Assume 1 year of data
    const peakUsageMonth = 'January'; // Placeholder

    return {
      mostRecentUse,
      averageUsesPerMonth,
      peakUsageMonth
    };
  }

  private generateReuseRecommendations(packaging: any, usagePattern: any): string[] {
    const recommendations: string[] = [];

    if (packaging.usageStats.totalProducts === 0) {
      recommendations.push('This packaging is not currently being used. Consider marking as inactive or promoting to products.');
    } else if (packaging.usageStats.totalProducts === 1) {
      recommendations.push('This packaging is only used by one product. Look for similar products that could share this packaging.');
    } else if (packaging.usageStats.totalProducts > 10) {
      recommendations.push('This packaging is well-utilized across multiple products. Consider negotiating volume discounts with supplier.');
    }

    if (packaging.costPerUnit > 1.0) {
      recommendations.push('Consider looking for more cost-effective alternatives for high-cost packaging.');
    }

    if (usagePattern.averageUsesPerMonth < 1) {
      recommendations.push('Low usage frequency detected. Consider consolidating with similar packaging options.');
    }

    return recommendations;
  }

  private calculateSimilarity(packaging: any, criteria: any): {
    score: number;
    matches: string[];
    differences: string[];
  } {
    const matches: string[] = [];
    const differences: string[] = [];
    let score = 0;

    // Unit type match (high weight)
    if (criteria.unitType && packaging.unitType === criteria.unitType) {
      matches.push('Unit type');
      score += 0.3;
    } else if (criteria.unitType) {
      differences.push('Unit type');
    }

    // Cost range match
    if (criteria.costRange) {
      if (packaging.costPerUnit >= criteria.costRange.min && packaging.costPerUnit <= criteria.costRange.max) {
        matches.push('Cost range');
        score += 0.2;
      } else {
        differences.push('Cost range');
      }
    }

    // Dimensions similarity (if applicable)
    if (criteria.dimensions && packaging.dimensions) {
      const tolerance = criteria.dimensions.tolerance || 0.1;
      const dimensionMatch = Math.abs(packaging.dimensions.length - criteria.dimensions.length) <= tolerance &&
                           Math.abs(packaging.dimensions.width - criteria.dimensions.width) <= tolerance &&
                           Math.abs(packaging.dimensions.height - criteria.dimensions.height) <= tolerance;
      
      if (dimensionMatch) {
        matches.push('Dimensions');
        score += 0.3;
      } else {
        differences.push('Dimensions');
      }
    }

    // Capacity similarity (if applicable)
    if (criteria.capacity && packaging.capacity) {
      const tolerance = criteria.capacity.tolerance || 0.1;
      const capacityMatch = Math.abs(packaging.capacity.value - criteria.capacity.value) <= tolerance &&
                           packaging.capacity.unit === criteria.capacity.unit;
      
      if (capacityMatch) {
        matches.push('Capacity');
        score += 0.2;
      } else {
        differences.push('Capacity');
      }
    }

    return { score: Math.min(score, 1), matches, differences };
  }
}

/**
 * Custom error class
 */
export class PackagingValidationError extends Error {
  public readonly errors: string[];

  constructor(errors: string[]) {
    super(`Packaging validation failed: ${errors.join(', ')}`);
    this.name = 'PackagingValidationError';
    this.errors = errors;
  }
}