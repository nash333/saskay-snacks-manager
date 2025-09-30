/**
 * Ingredient Validation Service (T019)
 * Validates ingredient data before create/update operations
 *
 * Validation Rules:
 * - Unique name constraint (application-level)
 * - Category/unit type reference validation (must exist and be active)
 * - Business rules (cost_per_unit >= 0, quantity_on_hand >= 0, valid SKU format)
 * - Field length and format constraints
 */

import { MetaobjectsService } from './metaobjects';

export interface IngredientValidationInput {
  name?: string;
  categoryGid?: string;
  unitTypeGid?: string;
  costPerUnit?: number;
  quantityOnHand?: number;
  sku?: string;
  supplierName?: string;
  description?: string;
  notes?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export class IngredientValidationService {
  private metaobjectsService: MetaobjectsService;

  constructor(metaobjectsService: MetaobjectsService) {
    this.metaobjectsService = metaobjectsService;
  }

  /**
   * Comprehensive validation for ingredient create/update
   */
  async validate(
    input: IngredientValidationInput,
    existingIngredientGid?: string
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Validate all fields
    const fieldValidationErrors = this.validateFields(input);
    errors.push(...fieldValidationErrors);

    // Validate business rules
    const businessRuleErrors = this.validateBusinessRules(input);
    errors.push(...businessRuleErrors);

    // Validate references (async)
    if (input.categoryGid || input.unitTypeGid) {
      const referenceErrors = await this.validateReferences(input);
      errors.push(...referenceErrors);
    }

    // Validate unique name (async)
    if (input.name) {
      const uniqueNameErrors = await this.validateUniqueName(input.name, existingIngredientGid);
      errors.push(...uniqueNameErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate field formats and lengths
   */
  private validateFields(input: IngredientValidationInput): ValidationError[] {
    const errors: ValidationError[] = [];

    // Name validation
    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        errors.push({
          field: 'name',
          message: 'Name is required',
          code: 'REQUIRED_FIELD'
        });
      } else if (input.name.length > 255) {
        errors.push({
          field: 'name',
          message: 'Name must not exceed 255 characters',
          code: 'MAX_LENGTH_EXCEEDED'
        });
      }
    }

    // SKU validation
    if (input.sku !== undefined && input.sku.length > 0) {
      const skuRegex = /^[a-zA-Z0-9-]+$/;
      if (!skuRegex.test(input.sku)) {
        errors.push({
          field: 'sku',
          message: 'Invalid SKU format: must be alphanumeric with hyphens only',
          code: 'INVALID_FORMAT'
        });
      }
      if (input.sku.length > 50) {
        errors.push({
          field: 'sku',
          message: 'SKU must not exceed 50 characters',
          code: 'MAX_LENGTH_EXCEEDED'
        });
      }
    }

    // Supplier name validation
    if (input.supplierName !== undefined && input.supplierName.length > 255) {
      errors.push({
        field: 'supplierName',
        message: 'Supplier name must not exceed 255 characters',
        code: 'MAX_LENGTH_EXCEEDED'
      });
    }

    // Description validation
    if (input.description !== undefined && input.description.length > 1000) {
      errors.push({
        field: 'description',
        message: 'Description must not exceed 1000 characters',
        code: 'MAX_LENGTH_EXCEEDED'
      });
    }

    // Notes validation
    if (input.notes !== undefined && input.notes.length > 2000) {
      errors.push({
        field: 'notes',
        message: 'Notes must not exceed 2000 characters',
        code: 'MAX_LENGTH_EXCEEDED'
      });
    }

    return errors;
  }

  /**
   * Validate business rules (cost, quantity, etc.)
   */
  private validateBusinessRules(input: IngredientValidationInput): ValidationError[] {
    const errors: ValidationError[] = [];

    // Cost per unit validation
    if (input.costPerUnit !== undefined) {
      if (input.costPerUnit < 0) {
        errors.push({
          field: 'costPerUnit',
          message: 'cost_per_unit must be >= 0',
          code: 'INVALID_VALUE'
        });
      }
      if (!Number.isFinite(input.costPerUnit)) {
        errors.push({
          field: 'costPerUnit',
          message: 'cost_per_unit must be a valid number',
          code: 'INVALID_TYPE'
        });
      }
    }

    // Quantity on hand validation
    if (input.quantityOnHand !== undefined) {
      if (input.quantityOnHand < 0) {
        errors.push({
          field: 'quantityOnHand',
          message: 'quantity_on_hand must be >= 0',
          code: 'INVALID_VALUE'
        });
      }
      if (!Number.isFinite(input.quantityOnHand)) {
        errors.push({
          field: 'quantityOnHand',
          message: 'quantity_on_hand must be a valid number',
          code: 'INVALID_TYPE'
        });
      }
    }

    return errors;
  }

  /**
   * Validate category and unit type references
   */
  async validateReferences(input: IngredientValidationInput): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Validate category reference
    if (input.categoryGid) {
      try {
        const category = await this.metaobjectsService.getCategoryByGid(input.categoryGid);

        if (!category) {
          errors.push({
            field: 'categoryGid',
            message: 'Invalid category reference: category does not exist',
            code: 'INVALID_REFERENCE'
          });
        } else if (!category.isActive) {
          errors.push({
            field: 'categoryGid',
            message: 'Category is inactive',
            code: 'INACTIVE_REFERENCE'
          });
        }
      } catch (error) {
        errors.push({
          field: 'categoryGid',
          message: `Failed to validate category reference: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'VALIDATION_ERROR'
        });
      }
    }

    // Validate unit type reference
    if (input.unitTypeGid) {
      try {
        const unitType = await this.metaobjectsService.getUnitTypeByGid(input.unitTypeGid);

        if (!unitType) {
          errors.push({
            field: 'unitTypeGid',
            message: 'Invalid unit type reference: unit type does not exist',
            code: 'INVALID_REFERENCE'
          });
        } else if (!unitType.isActive) {
          errors.push({
            field: 'unitTypeGid',
            message: 'Unit type is inactive',
            code: 'INACTIVE_REFERENCE'
          });
        }
      } catch (error) {
        errors.push({
          field: 'unitTypeGid',
          message: `Failed to validate unit type reference: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'VALIDATION_ERROR'
        });
      }
    }

    return errors;
  }

  /**
   * Validate unique name constraint (application-level)
   */
  async validateUniqueName(
    name: string,
    existingIngredientGid?: string
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      // Query all ingredients with this name
      const ingredients = await this.metaobjectsService.listIngredients({
        first: 250,
        filter: { includeInactive: true }
      });

      // Check for duplicates
      const duplicates = ingredients.edges.filter(edge => {
        const ingredient = edge.node;
        const isSameName = ingredient.name.toLowerCase() === name.toLowerCase();
        const isDifferentIngredient = ingredient.gid !== existingIngredientGid;
        return isSameName && isDifferentIngredient;
      });

      if (duplicates.length > 0) {
        errors.push({
          field: 'name',
          message: `Ingredient name "${name}" already exists`,
          code: 'DUPLICATE_NAME'
        });
      }
    } catch (error) {
      errors.push({
        field: 'name',
        message: `Failed to validate unique name: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'VALIDATION_ERROR'
      });
    }

    return errors;
  }

  /**
   * Quick validation for individual fields (useful for real-time UI validation)
   */
  validateField(fieldName: string, value: any): ValidationError | null {
    const input: any = { [fieldName]: value };

    const fieldErrors = this.validateFields(input);
    const businessErrors = this.validateBusinessRules(input);

    const allErrors = [...fieldErrors, ...businessErrors];
    return allErrors.length > 0 ? allErrors[0] : null;
  }

  /**
   * Helper: Format validation errors for user display
   */
  static formatErrors(errors: ValidationError[]): string {
    if (errors.length === 0) return '';

    if (errors.length === 1) {
      return errors[0].message;
    }

    return 'Validation errors:\n' + errors.map(e => `- ${e.field}: ${e.message}`).join('\n');
  }

  /**
   * Helper: Group errors by field
   */
  static groupErrorsByField(errors: ValidationError[]): Record<string, ValidationError[]> {
    return errors.reduce((acc, error) => {
      if (!acc[error.field]) {
        acc[error.field] = [];
      }
      acc[error.field].push(error);
      return acc;
    }, {} as Record<string, ValidationError[]>);
  }
}