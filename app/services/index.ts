// Service barrel exports for better import resolution
export * from './cost-calculation';
export * from './pricing-matrix';
export * from './metaobjects';
export * from './target-margin-persistence';
export * from './audit-log';
export * from './security-guard';
export * from './ingredient-validation';
export * from './category';
export * from './unit-type';
export * from './recipe';

// Re-export service classes with convenient names
export { CostCalculationServiceImpl as CostCalculationService } from './cost-calculation';
export { PricingMatrixService as PricingMatrixService } from './pricing-matrix';
export { MetaobjectsService as MetaobjectsService } from './metaobjects';
export { TargetMarginPersistenceService as TargetMarginPersistenceService } from './target-margin-persistence';
export { IngredientValidationService as IngredientValidationService } from './ingredient-validation';
export { CategoryService as CategoryService } from './category';
export { UnitTypeService as UnitTypeService } from './unit-type';
export { RecipeService as RecipeService } from './recipe';