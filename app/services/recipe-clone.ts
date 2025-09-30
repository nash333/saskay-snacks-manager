/**
 * Recipe Clone Service (Task 28)
 * Implements recipe clone action retaining inactive & complimentary indicators (FR-025)
 */

export interface RecipeCloneRequest {
  sourceProductId: string;
  targetProductId: string;
  cloneInactive?: boolean;
  cloneComplimentary?: boolean;
  newRecipeName?: string;
}

export interface RecipeCloneResponse {
  targetProductId: string;
  clonedLines: Array<{
    id: string;
    ingredientId: string;
    ingredientName: string;
    quantityGrams: number;
    isInactive: boolean;
    isComplimentary: boolean;
    notes?: string;
  }>;
  version: number;
  sourceInfo: {
    sourceProductId: string;
    clonedAt: Date;
    originalLineCount: number;
    filteredLineCount: number;
  };
}

export interface CloneOptions {
  preserveQuantities?: boolean;
  scaleQuantities?: number; // Multiplier for scaling recipe up/down
  excludeIngredients?: string[]; // Ingredient IDs to exclude from clone
  transformInactiveToActive?: boolean; // Convert inactive ingredients to active
  transformComplimentaryToPaid?: boolean; // Convert complimentary to paid
}

/**
 * Recipe Clone Service
 */
export class RecipeCloneService {
  private metaobjects: any;
  private auditLog: any;
  private recipeSave: any;

  constructor(
    metaobjectsService: any,
    auditLogService: any,
    recipeSaveService: any
  ) {
    this.metaobjects = metaobjectsService;
    this.auditLog = auditLogService;
    this.recipeSave = recipeSaveService;
  }

  /**
   * Clone recipe from source product to target product
   */
  async cloneRecipe(
    request: RecipeCloneRequest,
    options: CloneOptions = {},
    userId?: string
  ): Promise<RecipeCloneResponse> {
    // Step 1: Get source recipe
    const sourceRecipe = await this.getSourceRecipe(request.sourceProductId);
    
    // Step 2: Filter recipe lines based on clone preferences
    const filteredLines = this.filterRecipeLines(
      sourceRecipe.recipeLines,
      request.cloneInactive !== false, // Default to true
      request.cloneComplimentary !== false, // Default to true
      options
    );

    // Step 3: Transform lines if needed
    const transformedLines = this.transformRecipeLines(filteredLines, options);

    // Step 4: Scale quantities if requested
    const scaledLines = this.scaleRecipeLines(transformedLines, options.scaleQuantities || 1);

    // Step 5: Create new recipe lines with new IDs
    const newRecipeLines = this.createNewRecipeLines(scaledLines, request.targetProductId);

    // Step 6: Save cloned recipe to target product
    const savedRecipe = await this.recipeSave.saveRecipe({
      productId: request.targetProductId,
      recipeLines: newRecipeLines,
      triggerCostRecalculation: true
    }, userId);

    // Step 7: Log the clone action
    await this.auditLog.logAction('CLONE', 'recipe', {
      entityId: request.targetProductId,
      entityName: `Recipe cloned to ${request.targetProductId}`,
      metadata: {
        sourceProductId: request.sourceProductId,
        originalLineCount: sourceRecipe.recipeLines.length,
        clonedLineCount: newRecipeLines.length,
        cloneInactive: request.cloneInactive,
        cloneComplimentary: request.cloneComplimentary,
        scaleQuantities: options.scaleQuantities
      },
      userId
    });

    return {
      targetProductId: request.targetProductId,
      clonedLines: savedRecipe.recipeLines.map((line: any) => ({
        id: line.id,
        ingredientId: line.ingredientId,
        ingredientName: line.ingredientName || '',
        quantityGrams: line.quantityGrams,
        isInactive: line.isInactive,
        isComplimentary: line.isComplimentary,
        notes: line.notes
      })),
      version: savedRecipe.version,
      sourceInfo: {
        sourceProductId: request.sourceProductId,
        clonedAt: new Date(),
        originalLineCount: sourceRecipe.recipeLines.length,
        filteredLineCount: newRecipeLines.length
      }
    };
  }

  /**
   * Preview clone operation without saving
   */
  async previewRecipeClone(
    request: RecipeCloneRequest,
    options: CloneOptions = {}
  ): Promise<{
    sourceRecipe: {
      productId: string;
      lineCount: number;
      activeLines: number;
      inactiveLines: number;
      complimentaryLines: number;
    };
    clonePreview: {
      targetProductId: string;
      linesToClone: number;
      activeLines: number;
      inactiveLines: number;
      complimentaryLines: number;
      excludedLines: number;
      transformedLines: number;
    };
    lines: Array<{
      ingredientId: string;
      ingredientName: string;
      originalQuantity: number;
      newQuantity: number;
      isInactive: boolean;
      isComplimentary: boolean;
      willBeCloned: boolean;
      transformations: string[];
    }>;
  }> {
    // Get source recipe
    const sourceRecipe = await this.getSourceRecipe(request.sourceProductId);
    
    // Analyze source recipe
    const sourceAnalysis = this.analyzeRecipe(sourceRecipe.recipeLines);
    
    // Filter and transform preview
    const filteredLines = this.filterRecipeLines(
      sourceRecipe.recipeLines,
      request.cloneInactive !== false,
      request.cloneComplimentary !== false,
      options
    );

    const transformedLines = this.transformRecipeLines(filteredLines, options);
    const scaledLines = this.scaleRecipeLines(transformedLines, options.scaleQuantities || 1);
    
    // Create preview data
    const cloneAnalysis = this.analyzeRecipe(scaledLines);
    
    const previewLines = sourceRecipe.recipeLines.map((line: any) => {
      const willBeCloned = this.shouldCloneLine(
        line,
        request.cloneInactive !== false,
        request.cloneComplimentary !== false,
        options
      );
      
      const transformations: string[] = [];
      if (options.transformInactiveToActive && line.isInactive) {
        transformations.push('Inactive → Active');
      }
      if (options.transformComplimentaryToPaid && line.isComplimentary) {
        transformations.push('Complimentary → Paid');
      }
      if (options.scaleQuantities && options.scaleQuantities !== 1) {
        transformations.push(`Scaled by ${options.scaleQuantities}x`);
      }

      return {
        ingredientId: line.ingredientId,
        ingredientName: line.ingredientName || '',
        originalQuantity: line.quantityGrams,
        newQuantity: willBeCloned ? line.quantityGrams * (options.scaleQuantities || 1) : 0,
        isInactive: line.isInactive,
        isComplimentary: line.isComplimentary,
        willBeCloned,
        transformations
      };
    });

    return {
      sourceRecipe: {
        productId: request.sourceProductId,
        lineCount: sourceAnalysis.total,
        activeLines: sourceAnalysis.active,
        inactiveLines: sourceAnalysis.inactive,
        complimentaryLines: sourceAnalysis.complimentary
      },
      clonePreview: {
        targetProductId: request.targetProductId,
        linesToClone: cloneAnalysis.total,
        activeLines: cloneAnalysis.active,
        inactiveLines: cloneAnalysis.inactive,
        complimentaryLines: cloneAnalysis.complimentary,
        excludedLines: sourceAnalysis.total - cloneAnalysis.total,
        transformedLines: scaledLines.filter((line: any, index: number) => 
          this.hasTransformations(line, sourceRecipe.recipeLines[index], options)
        ).length
      },
      lines: previewLines
    };
  }

  /**
   * Clone recipe with automatic ingredient substitution
   */
  async cloneRecipeWithSubstitutions(
    request: RecipeCloneRequest,
    substitutions: Array<{
      originalIngredientId: string;
      newIngredientId: string;
      quantityMultiplier?: number;
    }>,
    options: CloneOptions = {},
    userId?: string
  ): Promise<RecipeCloneResponse> {
    // Get source recipe
    const sourceRecipe = await this.getSourceRecipe(request.sourceProductId);
    
    // Apply substitutions
    const substitutedLines = await this.applyIngredientSubstitutions(
      sourceRecipe.recipeLines,
      substitutions
    );

    // Continue with normal clone process
    const cloneRequest = { ...request };
    const modifiedOptions = { ...options };

    // Use the recipe save service with substituted lines
    const savedRecipe = await this.recipeSave.saveRecipe({
      productId: request.targetProductId,  
      recipeLines: substitutedLines,
      triggerCostRecalculation: true
    }, userId);

    // Log substitution details
    await this.auditLog.logAction('CLONE_WITH_SUBSTITUTIONS', 'recipe', {
      entityId: request.targetProductId,
      entityName: `Recipe cloned with substitutions to ${request.targetProductId}`,
      metadata: {
        sourceProductId: request.sourceProductId,
        substitutions: substitutions,
        originalLineCount: sourceRecipe.recipeLines.length,
        finalLineCount: savedRecipe.recipeLines.length
      },
      userId
    });

    return {
      targetProductId: request.targetProductId,
      clonedLines: savedRecipe.recipeLines,
      version: savedRecipe.version,
      sourceInfo: {
        sourceProductId: request.sourceProductId,
        clonedAt: new Date(),
        originalLineCount: sourceRecipe.recipeLines.length,
        filteredLineCount: savedRecipe.recipeLines.length
      }
    };
  }

  /**
   * Bulk clone recipe to multiple target products
   */
  async bulkCloneRecipe(
    sourceProductId: string,
    targetProductIds: string[],
    options: {
      cloneSettings: RecipeCloneRequest;
      cloneOptions: CloneOptions;
      batchSize?: number;
    },
    userId?: string
  ): Promise<{
    successful: RecipeCloneResponse[];
    failed: Array<{
      targetProductId: string;
      error: string;
    }>;
    summary: {
      totalAttempted: number;
      successful: number;
      failed: number;
    };
  }> {
    const successful: RecipeCloneResponse[] = [];
    const failed: Array<{ targetProductId: string; error: string }> = [];
    const batchSize = options.batchSize || 5;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < targetProductIds.length; i += batchSize) {
      const batch = targetProductIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (targetId) => {
        try {
          const cloneRequest: RecipeCloneRequest = {
            ...options.cloneSettings,
            sourceProductId,
            targetProductId: targetId
          };
          
          const result = await this.cloneRecipe(cloneRequest, options.cloneOptions, userId);
          successful.push(result);
          return { success: true, result };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failed.push({ targetProductId: targetId, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      });

      // Wait for batch to complete before proceeding
      await Promise.all(batchPromises);
    }

    return {
      successful,
      failed,
      summary: {
        totalAttempted: targetProductIds.length,
        successful: successful.length,
        failed: failed.length
      }
    };
  }

  // Private helper methods

  private async getSourceRecipe(productId: string): Promise<{
    productId: string;
    recipeLines: any[];
    version: number;
  }> {
    try {
      const recipe = await this.metaobjects.getRecipe(productId);
      if (!recipe || !recipe.recipeLines || recipe.recipeLines.length === 0) {
        throw new Error(`No recipe found for product ${productId}`);
      }
      return recipe;
    } catch (error) {
      throw new Error(`Failed to get source recipe: ${error}`);
    }
  }

  private filterRecipeLines(
    lines: any[],
    includeInactive: boolean,
    includeComplimentary: boolean,
    options: CloneOptions
  ): any[] {
    return lines.filter((line: any) => {
      // Filter by inactive status
      if (line.isInactive && !includeInactive) {
        return false;
      }

      // Filter by complimentary status  
      if (line.isComplimentary && !includeComplimentary) {
        return false;
      }

      // Filter by excluded ingredients
      if (options.excludeIngredients?.includes(line.ingredientId)) {
        return false;
      }

      return true;
    });
  }

  private transformRecipeLines(lines: any[], options: CloneOptions): any[] {
    return lines.map((line: any) => {
      const transformedLine = { ...line };

      // Transform inactive to active
      if (options.transformInactiveToActive && line.isInactive) {
        transformedLine.isInactive = false;
      }

      // Transform complimentary to paid
      if (options.transformComplimentaryToPaid && line.isComplimentary) {
        transformedLine.isComplimentary = false;
      }

      return transformedLine;
    });
  }

  private scaleRecipeLines(lines: any[], scaleFactor: number): any[] {
    if (scaleFactor === 1) return lines;

    return lines.map((line: any) => ({
      ...line,
      quantityGrams: line.quantityGrams * scaleFactor
    }));
  }

  private createNewRecipeLines(lines: any[], targetProductId: string): any[] {
    const timestamp = Date.now();
    
    return lines.map((line: any, index: number) => ({
      ...line,
      id: undefined, // Remove old ID to force new ID generation
      notes: line.notes ? `${line.notes} (cloned)` : 'Cloned from recipe'
    }));
  }

  private analyzeRecipe(lines: any[]): {
    total: number;
    active: number;
    inactive: number;
    complimentary: number;
    paid: number;
  } {
    return {
      total: lines.length,
      active: lines.filter((line: any) => !line.isInactive).length,
      inactive: lines.filter((line: any) => line.isInactive).length,
      complimentary: lines.filter((line: any) => line.isComplimentary).length,
      paid: lines.filter((line: any) => !line.isComplimentary).length
    };
  }

  private shouldCloneLine(
    line: any,
    includeInactive: boolean,
    includeComplimentary: boolean,
    options: CloneOptions
  ): boolean {
    // Same logic as filterRecipeLines but for single line evaluation
    if (line.isInactive && !includeInactive) return false;
    if (line.isComplimentary && !includeComplimentary) return false;
    if (options.excludeIngredients?.includes(line.ingredientId)) return false;
    return true;
  }

  private hasTransformations(
    newLine: any,
    originalLine: any,
    options: CloneOptions
  ): boolean {
    if (options.transformInactiveToActive && originalLine.isInactive && !newLine.isInactive) {
      return true;
    }
    if (options.transformComplimentaryToPaid && originalLine.isComplimentary && !newLine.isComplimentary) {
      return true;
    }
    if (options.scaleQuantities && options.scaleQuantities !== 1) {
      return true;
    }
    return false;
  }

  private async applyIngredientSubstitutions(
    lines: any[],
    substitutions: Array<{
      originalIngredientId: string;
      newIngredientId: string;
      quantityMultiplier?: number;
    }>
  ): Promise<any[]> {
    const substitutionMap = new Map(
      substitutions.map(sub => [sub.originalIngredientId, sub])
    );

  const substitutedLines: any[] = [];
    
    for (const line of lines) {
      const substitution = substitutionMap.get(line.ingredientId);
      
      if (substitution) {
        // Get new ingredient details
        const newIngredient = await this.metaobjects.getIngredient(substitution.newIngredientId);
        
        substitutedLines.push({
          ...line,
          ingredientId: substitution.newIngredientId,
          ingredientName: newIngredient?.name || 'Unknown Ingredient',
          quantityGrams: line.quantityGrams * (substitution.quantityMultiplier || 1),
          notes: `${line.notes || ''} (substituted from ${line.ingredientId})`.trim()
        });
      } else {
        // Keep original line
        substitutedLines.push({ ...line });
      }
    }
    
    return substitutedLines;
  }
}

/**
 * Custom error classes
 */
export class RecipeCloneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecipeCloneError';
  }
}