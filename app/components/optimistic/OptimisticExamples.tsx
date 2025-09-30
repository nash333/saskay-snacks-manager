/**
 * Example Usage of Optimistic UI
 * Task 45: Implement optimistic update + rollback
 * Demonstrates how to integrate optimistic UI into existing components
 */

import React, { useState } from 'react';
import { Card, TextField, Button, InlineStack, BlockStack, Text } from '@shopify/polaris';
import { useOptimistic } from '../../hooks/useOptimistic';
import { OptimisticItemIndicator } from './OptimisticIndicator';
import type { OptimisticUIService } from '../../services/optimistic-ui';

export interface IngredientFormData {
  id: string;
  name: string;
  currentPrice: number;
  unit: string;
  supplier: string;
}

export interface OptimisticIngredientFormProps {
  ingredient: IngredientFormData;
  optimisticService: OptimisticUIService;
  onSave?: (ingredient: IngredientFormData) => Promise<void>;
}

/**
 * Example ingredient form with optimistic UI integration
 */
export function OptimisticIngredientForm({
  ingredient,
  optimisticService,
  onSave
}: OptimisticIngredientFormProps) {
  const {
    data: currentData,
    isOptimistic,
    hasChanges,
    update,
    commit,
    rollback,
    error
  } = useOptimistic(optimisticService, ingredient.id, ingredient, {
    autoCommit: false, // Manual commit for this example
    onCommit: () => {
      console.log('Ingredient saved successfully!');
    },
    onRollback: () => {
      console.log('Changes reverted');
    },
    onError: (err) => {
      console.error('Optimistic operation failed:', err);
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange = async (field: keyof IngredientFormData, value: string | number) => {
    const updatedData = {
      ...currentData,
      [field]: value
    };

    await update(updatedData);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // First commit optimistic changes
      const success = await commit();
      
      if (success && onSave) {
        // Then trigger the external save callback if provided
        await onSave(currentData);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = async () => {
    await rollback();
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h3">
          Edit Ingredient {isOptimistic && '(Editing)'}
        </Text>

        {/* Show optimistic indicator when there are unsaved changes */}
        <OptimisticItemIndicator
          isOptimistic={isOptimistic}
          onCommit={commit}
          onRollback={rollback}
          inline={true}
        />

        {/* Error display */}
        {error && (
          <div style={{ color: 'red', fontSize: '14px' }}>
            Error: {error.message}
          </div>
        )}

        <TextField
          label="Name"
          value={currentData.name}
          onChange={(value) => handleFieldChange('name', value)}
          disabled={isSubmitting}
          autoComplete="off"
        />

        <TextField
          label="Current Price"
          type="number"
          value={currentData.currentPrice.toString()}
          onChange={(value) => handleFieldChange('currentPrice', parseFloat(value) || 0)}
          disabled={isSubmitting}
          prefix="$"
          autoComplete="off"
        />

        <TextField
          label="Unit"
          value={currentData.unit}
          onChange={(value) => handleFieldChange('unit', value)}
          disabled={isSubmitting}
          autoComplete="off"
        />

        <TextField
          label="Supplier"
          value={currentData.supplier}
          onChange={(value) => handleFieldChange('supplier', value)}
          disabled={isSubmitting}
          autoComplete="off"
        />

        <InlineStack gap="200">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges || isSubmitting}
            loading={isSubmitting}
          >
            Save Changes
          </Button>
          
          <Button
            onClick={handleDiscard}
            disabled={!hasChanges || isSubmitting}
            variant="tertiary"
          >
            Discard Changes
          </Button>

          {hasChanges && (
            <Text variant="bodySm" tone="subdued" as="span">
              {isOptimistic ? 'Unsaved changes' : 'No changes'}
            </Text>
          )}
        </InlineStack>

        {/* Debug info */}
        <details style={{ fontSize: '12px', color: '#666' }}>
          <summary>Debug Info</summary>
          <pre>{JSON.stringify({
            isOptimistic,
            hasChanges,
            error: error?.message || null,
            originalData: ingredient,
            currentData: currentData
          }, null, 2)}</pre>
        </details>
      </BlockStack>
    </Card>
  );
}

/**
 * Example batch form with multiple ingredients
 */
export interface OptimisticBatchFormProps {
  ingredients: IngredientFormData[];
  optimisticService: OptimisticUIService;
  onBatchSave?: (ingredients: IngredientFormData[]) => Promise<void>;
}

export function OptimisticBatchForm({
  ingredients,
  optimisticService,
  onBatchSave
}: OptimisticBatchFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create individual optimistic hooks for each ingredient
  const ingredientHooks = ingredients.map(ingredient => 
    useOptimistic(optimisticService, ingredient.id, ingredient, {
      autoCommit: false
    })
  );

  const hasAnyChanges = ingredientHooks.some(hook => hook.hasChanges);
  const hasAnyErrors = ingredientHooks.some(hook => hook.error);

  const handleBatchSave = async () => {
    setIsSubmitting(true);
    try {
      // Commit all optimistic changes
      const commitResults = await Promise.all(
        ingredientHooks.map(hook => hook.commit())
      );

      const allSuccessful = commitResults.every(result => result);

      if (allSuccessful && onBatchSave) {
        const updatedIngredients = ingredientHooks.map(hook => hook.data);
        await onBatchSave(updatedIngredients);
      }
    } catch (err) {
      console.error('Batch save failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchDiscard = async () => {
    await Promise.all(
      ingredientHooks.map(hook => hook.rollback())
    );
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingLg" as="h2">
          Batch Edit Ingredients
        </Text>

        {hasAnyChanges && (
          <OptimisticItemIndicator
            isOptimistic={true}
            showActions={false}
            inline={true}
          />
        )}

        {hasAnyErrors && (
          <div style={{ color: 'red', fontSize: '14px' }}>
            Some items have errors. Please check individual forms.
          </div>
        )}

        <BlockStack gap="400">
          {ingredientHooks.map((hook, index) => (
            <OptimisticIngredientForm
              key={ingredients[index].id}
              ingredient={ingredients[index]}
              optimisticService={optimisticService}
            />
          ))}
        </BlockStack>

        <InlineStack gap="200">
          <Button
            variant="primary"
            onClick={handleBatchSave}
            disabled={!hasAnyChanges || isSubmitting}
            loading={isSubmitting}
          >
            Save All Changes
          </Button>
          
          <Button
            onClick={handleBatchDiscard}
            disabled={!hasAnyChanges || isSubmitting}
            variant="tertiary"
          >
            Discard All Changes
          </Button>

          <Text variant="bodySm" tone="subdued" as="span">
            {hasAnyChanges ? 
              `${ingredientHooks.filter(h => h.hasChanges).length} items with changes` :
              'No changes'
            }
          </Text>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}

/**
 * Demo component showing optimistic UI in action
 */
export function OptimisticUIDemo({ optimisticService }: { optimisticService: OptimisticUIService }) {
  const sampleIngredients: IngredientFormData[] = [
    {
      id: 'ing1',
      name: 'Flour',
      currentPrice: 2.50,
      unit: 'kg',
      supplier: 'Local Mill'
    },
    {
      id: 'ing2',
      name: 'Sugar',
      currentPrice: 1.80,
      unit: 'kg',
      supplier: 'Sweet Co'
    }
  ];

  const handleSave = async (ingredient: IngredientFormData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Saved ingredient:', ingredient);
  };

  const handleBatchSave = async (ingredients: IngredientFormData[]) => {
    // Simulate batch API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Batch saved ingredients:', ingredients);
  };

  return (
    <BlockStack gap="600">
      <Text variant="headingXl" as="h1">
        Optimistic UI Demo
      </Text>

      <Text variant="bodyLg" as="p">
        This demo shows how optimistic UI works. Make changes to the forms below and see how the UI
        responds immediately, with the ability to commit or rollback changes.
      </Text>

      <OptimisticIngredientForm
        ingredient={sampleIngredients[0]}
        optimisticService={optimisticService}
        onSave={handleSave}
      />

      <OptimisticBatchForm
        ingredients={sampleIngredients}
        optimisticService={optimisticService}
        onBatchSave={handleBatchSave}
      />
    </BlockStack>
  );
}