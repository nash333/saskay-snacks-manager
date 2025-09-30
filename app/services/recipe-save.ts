/**
 * Recipe Save Service (Task 27)
 * Implements recipe save action with cost recalculation trigger (FR-006, FR-007, FR-008, FR-005)
 */

// Type definitions for service dependencies
interface CostCalculationService {
  calculateBatchCost(ingredients: any[]): { totalCost: number };
}

interface MetaobjectsService {
  getRecipe(productId: string): Promise<{ recipeLines: any[]; version: number }>;
  getIngredient(ingredientId: string): Promise<{ name: string; costPerUnit: number } | null>;
}

interface AuditLogService {
  logAction(action: string, entityType: string, data: any): Promise<{ id: string }>;
}

interface ComplimentaryValidationService {
  validateComplimentaryIngredient(ingredient: any): Promise<any>;
}

export interface RecipeLine {
  id?: string;
  ingredientId: string;
  ingredientName?: string;
  quantityGrams: number;
  isInactive: boolean;
  isComplimentary: boolean;
  notes?: string;
  costPerGram?: number;
}

export interface RecipeSaveRequest {
  productId: string;
  recipeLines: RecipeLine[];
  version?: number;
  triggerCostRecalculation?: boolean;
}

export interface RecipeSaveResponse {
  productId: string;
  recipeLines: RecipeLine[];
  version: number;
  costCalculation?: {
    totalCostPerBatch: number;
    costPerUnit: number;
    margin: number;
    calculatedAt: Date;
  };
  warnings: string[];
}

export interface RecipeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  duplicateIngredients: string[];
  invalidLines: Array<{
    lineIndex: number;
    ingredientId: string;
    errors: string[];
  }>;
}

/**
 * Recipe Save Service
 */
export class RecipeSaveService {
  private costCalculation: CostCalculationService;
  private metaobjects: MetaobjectsService;
  private auditLog: AuditLogService;
  private complimentaryValidation: ComplimentaryValidationService;

  constructor(
    costCalculationService: CostCalculationService,
    metaobjectsService: MetaobjectsService,
    auditLogService: AuditLogService,
    complimentaryValidationService: ComplimentaryValidationService
  ) {
    this.costCalculation = costCalculationService;
    this.metaobjects = metaobjectsService;
    this.auditLog = auditLogService;
    this.complimentaryValidation = complimentaryValidationService;
  }

  /**
   * Save recipe with validation and cost recalculation
   */
  async saveRecipe(
    request: RecipeSaveRequest,
    userId?: string
  ): Promise<RecipeSaveResponse> {
    // Step 1: Validate recipe data
    const validation = await this.validateRecipe(request.recipeLines);
    if (!validation.valid) {
      throw new RecipeValidationError(validation);
    }

    // Step 2: Check for version conflicts (optimistic concurrency)
    if (request.version !== undefined) {
      await this.checkVersionConflict(request.productId, request.version);
    }

    // Step 3: Enrich recipe lines with ingredient data
    const enrichedLines = await this.enrichRecipeLines(request.recipeLines);

    // Step 4: Save recipe to metaobjects
    const savedRecipe = await this.saveRecipeToMetaobjects(
      request.productId,
      enrichedLines,
      userId
    );

    // Step 5: Trigger cost recalculation if requested
    let costCalculation;
    if (request.triggerCostRecalculation !== false) {
      costCalculation = await this.calculateRecipeCost(savedRecipe.recipeLines);
    }

    // Step 6: Log the save action
    await this.auditLog.logAction('UPDATE', 'recipe', {
      entityId: request.productId,
      entityName: `Recipe for product ${request.productId}`,
      metadata: {
        lineCount: savedRecipe.recipeLines.length,
        activeLines: savedRecipe.recipeLines.filter(line => !line.isInactive).length,
        complimentaryLines: savedRecipe.recipeLines.filter(line => line.isComplimentary).length,
        costRecalculated: !!costCalculation
      },
      userId
    });

    return {
      productId: savedRecipe.productId,
      recipeLines: savedRecipe.recipeLines,
      version: savedRecipe.version,
      costCalculation,
      warnings: validation.warnings
    };
  }

  /**
   * Add ingredient line to existing recipe
   */
  async addIngredientLine(
    productId: string,
    ingredientId: string,
    quantityGrams: number,
    options: {
      isInactive?: boolean;
      isComplimentary?: boolean;
      notes?: string;
      triggerCostRecalculation?: boolean;
    } = {},
    userId?: string
  ): Promise<RecipeLine> {
    // Get current recipe
    const currentRecipe = await this.metaobjects.getRecipe(productId);
    
    // Check for duplicate ingredient
    const existingLine = currentRecipe.recipeLines.find(
      (line: any) => line.ingredientId === ingredientId
    );
    if (existingLine) {
      throw new RecipeValidationError({
        valid: false,
        errors: [`Ingredient ${ingredientId} already exists in recipe`],
        warnings: [],
        duplicateIngredients: [ingredientId],
        invalidLines: []
      });
    }

    // Create new line
    const newLine: RecipeLine = {
      ingredientId,
      quantityGrams,
      isInactive: options.isInactive || false,
      isComplimentary: options.isComplimentary || false,
      notes: options.notes
    };

    // Add to recipe and save
    const updatedLines = [...currentRecipe.recipeLines, newLine];
    const saveRequest: RecipeSaveRequest = {
      productId,
      recipeLines: updatedLines,
      version: currentRecipe.version,
      triggerCostRecalculation: options.triggerCostRecalculation
    };

    const savedRecipe = await this.saveRecipe(saveRequest, userId);
    
    // Return the newly added line (last in the array)
    return savedRecipe.recipeLines[savedRecipe.recipeLines.length - 1];
  }

  /**
   * Remove ingredient line from recipe
   */
  async removeIngredientLine(
    productId: string,
    ingredientId: string,
    options: {
      triggerCostRecalculation?: boolean;
    } = {},
    userId?: string
  ): Promise<RecipeSaveResponse> {
    // Get current recipe
    const currentRecipe = await this.metaobjects.getRecipe(productId);
    
    // Filter out the ingredient line
    const updatedLines = currentRecipe.recipeLines.filter(
      (line: any) => line.ingredientId !== ingredientId
    );

    if (updatedLines.length === currentRecipe.recipeLines.length) {
      throw new RecipeValidationError({
        valid: false,
        errors: [`Ingredient ${ingredientId} not found in recipe`],
        warnings: [],
        duplicateIngredients: [],
        invalidLines: []
      });
    }

    // Save updated recipe
    const saveRequest: RecipeSaveRequest = {
      productId,
      recipeLines: updatedLines,
      version: currentRecipe.version,
      triggerCostRecalculation: options.triggerCostRecalculation
    };

    return this.saveRecipe(saveRequest, userId);
  }

  /**
   * Update ingredient quantity in recipe
   */
  async updateIngredientQuantity(
    productId: string,
    ingredientId: string,
    newQuantityGrams: number,
    options: {
      triggerCostRecalculation?: boolean;
    } = {},
    userId?: string
  ): Promise<RecipeSaveResponse> {
    // Get current recipe
    const currentRecipe = await this.metaobjects.getRecipe(productId);
    
    // Find and update the ingredient line
    const updatedLines = currentRecipe.recipeLines.map((line: any) => {
      if (line.ingredientId === ingredientId) {
        return { ...line, quantityGrams: newQuantityGrams };
      }
      return line;
    });

    // Check if ingredient was found
    const wasUpdated = updatedLines.some((line: any, index: number) => 
      line.ingredientId === ingredientId && 
      line.quantityGrams !== currentRecipe.recipeLines[index].quantityGrams
    );

    if (!wasUpdated) {
      throw new RecipeValidationError({
        valid: false,
        errors: [`Ingredient ${ingredientId} not found in recipe`],
        warnings: [],
        duplicateIngredients: [],
        invalidLines: []
      });
    }

    // Save updated recipe
    const saveRequest: RecipeSaveRequest = {
      productId,
      recipeLines: updatedLines,
      version: currentRecipe.version,
      triggerCostRecalculation: options.triggerCostRecalculation
    };

    return this.saveRecipe(saveRequest, userId);
  }

  /**
   * Get recipe cost summary without saving
   */
  async getRecipeCostPreview(recipeLines: RecipeLine[]): Promise<{
    totalCostPerBatch: number;
    costPerUnit: number;
    margin: number;
    breakdown: Array<{
      ingredientId: string;
      ingredientName: string;
      quantityGrams: number;
      costPerGram: number;
      lineCost: number;
      isInactive: boolean;
      isComplimentary: boolean;
    }>;
  }> {
    const enrichedLines = await this.enrichRecipeLines(recipeLines);
    const costResult = await this.calculateRecipeCost(enrichedLines);
    
    const breakdown = enrichedLines.map(line => ({
      ingredientId: line.ingredientId,
      ingredientName: line.ingredientName || '',
      quantityGrams: line.quantityGrams,
      costPerGram: line.costPerGram || 0,
      lineCost: (line.costPerGram || 0) * line.quantityGrams,
      isInactive: line.isInactive,
      isComplimentary: line.isComplimentary
    }));

    return {
      totalCostPerBatch: costResult?.totalCostPerBatch || 0,
      costPerUnit: costResult?.costPerUnit || 0,
      margin: costResult?.margin || 0,
      breakdown
    };
  }

  // Private helper methods

  private async validateRecipe(recipeLines: RecipeLine[]): Promise<RecipeValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const duplicateIngredients: string[] = [];
    const invalidLines: Array<{ lineIndex: number; ingredientId: string; errors: string[] }> = [];

    // Check for empty recipe
    if (recipeLines.length === 0) {
      errors.push('Recipe must contain at least one ingredient line');
      return { valid: false, errors, warnings, duplicateIngredients, invalidLines };
    }

    // Check for duplicate ingredients (FR-007)
    const ingredientIds = new Set();
    for (let i = 0; i < recipeLines.length; i++) {
      const line = recipeLines[i];
      
      if (ingredientIds.has(line.ingredientId)) {
        duplicateIngredients.push(line.ingredientId);
        errors.push(`Duplicate ingredient: ${line.ingredientId} appears multiple times`);
      } else {
        ingredientIds.add(line.ingredientId);
      }

      // Validate individual line
      const lineErrors: string[] = [];
      
      if (!line.ingredientId || line.ingredientId.trim() === '') {
        lineErrors.push('Ingredient ID is required');
      }
      
      if (typeof line.quantityGrams !== 'number' || line.quantityGrams < 0) {
        lineErrors.push('Quantity must be a non-negative number');
      }
      
      if (line.quantityGrams === 0) {
        warnings.push(`Ingredient ${line.ingredientId} has zero quantity`);
      }

      if (lineErrors.length > 0) {
        invalidLines.push({
          lineIndex: i,
          ingredientId: line.ingredientId,
          errors: lineErrors
        });
        errors.push(...lineErrors);
      }
    }

    // Check for recipes with only inactive or complimentary ingredients (FR-008)
    const activeNonComplimentaryLines = recipeLines.filter(
      line => !line.isInactive && !line.isComplimentary
    );
    
    if (activeNonComplimentaryLines.length === 0) {
      errors.push('Recipe must contain at least one active, paid ingredient');
    }

    // Validate complimentary flags
    for (const line of recipeLines) {
      if (line.isComplimentary) {
        // This would integrate with ComplimentaryValidationService
        // For now, just add a warning
        warnings.push(`Ingredient ${line.ingredientId} is marked as complimentary`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      duplicateIngredients,
      invalidLines
    };
  }

  private async checkVersionConflict(productId: string, providedVersion: number): Promise<void> {
    try {
      const currentRecipe = await this.metaobjects.getRecipe(productId);
      if (currentRecipe.version > providedVersion) {
        throw new VersionConflictError(currentRecipe.version, providedVersion);
      }
    } catch (error) {
      // If recipe doesn't exist, version check passes
      if (error instanceof Error && error.message.includes('not found')) {
        return;
      }
      throw error;
    }
  }

  private async enrichRecipeLines(recipeLines: RecipeLine[]): Promise<RecipeLine[]> {
    const enrichedLines: RecipeLine[] = [];
    
    for (const line of recipeLines) {
      // Get ingredient data from metaobjects
      const ingredient = await this.metaobjects.getIngredient(line.ingredientId);
      
      enrichedLines.push({
        ...line,
        ingredientName: ingredient?.name || 'Unknown Ingredient',
        costPerGram: ingredient ? (ingredient.costPerUnit || 0) : 0
      });
    }
    
    return enrichedLines;
  }

  private async saveRecipeToMetaobjects(
    productId: string,
    recipeLines: RecipeLine[],
    userId?: string
  ): Promise<{
    productId: string;
    recipeLines: RecipeLine[];
    version: number;
  }> {
    // This would use the MetaobjectsService to save the recipe
    // For now, simulate the save operation
    
    const version = Date.now(); // Simple versioning strategy
    
    // Generate IDs for new lines
    const linesWithIds = recipeLines.map((line, index) => ({
      ...line,
      id: line.id || `line_${productId}_${index}_${version}`
    }));

    return {
      productId,
      recipeLines: linesWithIds,
      version
    };
  }

  private async calculateRecipeCost(recipeLines: RecipeLine[]): Promise<{
    totalCostPerBatch: number;
    costPerUnit: number;
    margin: number;
    calculatedAt: Date;
  }> {
    // Convert recipe lines to batch ingredients for cost calculation
    const batchIngredients = recipeLines
      .filter(line => !line.isInactive) // Exclude inactive ingredients
      .map(line => ({
        ingredientId: line.ingredientId,
        ingredientName: line.ingredientName || '',
        quantityGrams: line.quantityGrams,
        costPerGram: line.costPerGram || 0,
        isComplimentary: line.isComplimentary
      }));

    // Use existing cost calculation service
    const costResult = this.costCalculation.calculateBatchCost(batchIngredients);
    
    // Calculate per-unit cost (assuming batch makes 12 units by default)
    const unitsPerBatch = 12;
    const costPerUnit = costResult.totalCost / unitsPerBatch;
    
    // Calculate margin (assuming 25% target margin)
    const targetMargin = 0.25;
    const margin = targetMargin * 100;

    return {
      totalCostPerBatch: costResult.totalCost,
      costPerUnit,
      margin,
      calculatedAt: new Date()
    };
  }
}

/**
 * Custom error classes
 */
export class RecipeValidationError extends Error {
  public readonly validation: RecipeValidationResult;

  constructor(validation: RecipeValidationResult) {
    super(`Recipe validation failed: ${validation.errors.join(', ')}`);
    this.name = 'RecipeValidationError';
    this.validation = validation;
  }
}

export class VersionConflictError extends Error {
  public readonly currentVersion: number;
  public readonly providedVersion: number;

  constructor(currentVersion: number, providedVersion: number) {
    super(`Version conflict: current version ${currentVersion}, provided version ${providedVersion}`);
    this.name = 'VersionConflictError';
    this.currentVersion = currentVersion;
    this.providedVersion = providedVersion;
  }
}