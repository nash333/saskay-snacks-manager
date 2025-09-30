/**
 * Price History Integration Example
 * Task 51: Implement price history drawer (FR-037, FR-018)
 * Demonstrates integration of price history components
 */

import React, { useState } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  DataTable,
  Badge
} from '@shopify/polaris';
import { 
  PriceHistoryDrawer, 
  PriceHistoryButton, 
  PriceChangeIndicator,
  PriceTrendAnalysis 
} from './index';
import type { PriceHistoryService } from '../../services/price-history';

export interface IngredientWithHistoryProps {
  /** Ingredient data */
  ingredient: {
    id: string;
    name: string;
    currentPrice: number;
    previousPrice?: number;
    costPerUnit: number;
    versionToken: string;
  };
  /** Price history service instance */
  priceHistoryService: PriceHistoryService;
  /** Show trend analysis */
  showTrendAnalysis?: boolean;
}

/**
 * Example ingredient card with integrated price history
 */
export function IngredientWithHistory({
  ingredient,
  priceHistoryService,
  showTrendAnalysis = true
}: IngredientWithHistoryProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between">
            <Text variant="headingMd" as="h3">
              {ingredient.name}
            </Text>
            <InlineStack gap="200">
              <PriceChangeIndicator
                previousPrice={ingredient.previousPrice}
                currentPrice={ingredient.currentPrice}
                showPercentage={true}
                showAbsolute={false}
              />
              <PriceHistoryButton
                ingredientId={ingredient.id}
                ingredientName={ingredient.name}
                onClick={() => setShowHistory(true)}
                priceHistoryService={priceHistoryService}
                showCount={true}
              />
            </InlineStack>
          </InlineStack>

          <InlineStack gap="400">
            <div>
              <Text variant="bodyMd" tone="subdued" as="p">
                Current Price
              </Text>
              <Text variant="headingLg" as="p">
                ${ingredient.currentPrice.toFixed(4)}
              </Text>
            </div>
            
            <div>
              <Text variant="bodyMd" tone="subdued" as="p">
                Cost per Unit
              </Text>
              <Text variant="headingLg" as="p">
                ${ingredient.costPerUnit.toFixed(4)}
              </Text>
            </div>
          </InlineStack>

          {showTrendAnalysis && (
            <PriceTrendAnalysis
              ingredientId={ingredient.id}
              priceHistoryService={priceHistoryService}
              daysBack={90}
              showDetails={false}
            />
          )}
        </BlockStack>
      </Card>

      <PriceHistoryDrawer
        open={showHistory}
        onClose={() => setShowHistory(false)}
        ingredientId={ingredient.id}
        ingredientName={ingredient.name}
        priceHistoryService={priceHistoryService}
        showExport={true}
        showTrendAnalysis={true}
        initialPageSize={20}
      />
    </>
  );
}

/**
 * Example ingredients table with price history integration
 */
export interface IngredientsTableWithHistoryProps {
  /** List of ingredients */
  ingredients: Array<{
    id: string;
    name: string;
    currentPrice: number;
    previousPrice?: number;
    lastUpdated: string;
  }>;
  /** Price history service instance */
  priceHistoryService: PriceHistoryService;
}

export function IngredientsTableWithHistory({
  ingredients,
  priceHistoryService
}: IngredientsTableWithHistoryProps) {
  const [selectedIngredient, setSelectedIngredient] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Create table data with price history buttons
  const tableData = ingredients.map(ingredient => [
    <Text variant="bodyMd" as="span" key={`name-${ingredient.id}`}>
      {ingredient.name}
    </Text>,
    <Text variant="bodyMd" as="span" key={`price-${ingredient.id}`}>
      ${ingredient.currentPrice.toFixed(4)}
    </Text>,
    <PriceChangeIndicator
      key={`change-${ingredient.id}`}
      previousPrice={ingredient.previousPrice}
      currentPrice={ingredient.currentPrice}
      showPercentage={true}
    />,
    <Text variant="bodyMd" tone="subdued" as="span" key={`updated-${ingredient.id}`}>
      {new Date(ingredient.lastUpdated).toLocaleDateString()}
    </Text>,
    <Button
      key={`history-${ingredient.id}`}
      size="slim"
      onClick={() => setSelectedIngredient({ id: ingredient.id, name: ingredient.name })}
    >
      View History
    </Button>
  ]);

  const tableHeaders = ['Ingredient', 'Current Price', 'Change', 'Last Updated', 'History'];

  return (
    <>
      <Card>
        <BlockStack gap="300">
          <Text variant="headingLg" as="h2">
            Ingredients with Price History
          </Text>
          
          <DataTable
            columnContentTypes={['text', 'numeric', 'text', 'text', 'text']}
            headings={tableHeaders}
            rows={tableData}
            footerContent={
              <Text variant="bodyMd" tone="subdued" as="p">
                {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} with tracked price history
              </Text>
            }
          />
        </BlockStack>
      </Card>

      {selectedIngredient && (
        <PriceHistoryDrawer
          open={!!selectedIngredient}
          onClose={() => setSelectedIngredient(null)}
          ingredientId={selectedIngredient.id}
          ingredientName={selectedIngredient.name}
          priceHistoryService={priceHistoryService}
          showExport={true}
          showTrendAnalysis={true}
          initialPageSize={20}
        />
      )}
    </>
  );
}

/**
 * Price History Dashboard
 */
export interface PriceHistoryDashboardProps {
  /** Price history service instance */
  priceHistoryService: PriceHistoryService;
  /** Recent ingredients data */
  recentIngredients?: Array<{
    id: string;
    name: string;
    currentPrice: number;
    changePercent: number;
  }>;
}

export function PriceHistoryDashboard({
  priceHistoryService,
  recentIngredients = []
}: PriceHistoryDashboardProps) {
  const [selectedIngredient, setSelectedIngredient] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Get top price changes
  const significantChanges = recentIngredients
    .filter(ing => Math.abs(ing.changePercent) > 5)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 5);

  return (
    <BlockStack gap="400">
      <Text variant="headingLg" as="h2">
        Price History Dashboard
      </Text>

      {/* Significant Price Changes */}
      {significantChanges.length > 0 && (
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h3">
              Significant Price Changes (&gt;5%)
            </Text>
            
            <BlockStack gap="200">
              {significantChanges.map(ingredient => (
                <InlineStack key={ingredient.id} align="space-between">
                  <Text variant="bodyMd" as="span">
                    {ingredient.name}
                  </Text>
                  <InlineStack gap="200">
                    <Badge 
                      tone={ingredient.changePercent > 0 ? 'critical' : 'success'}
                      size="small"
                    >
                      {`${ingredient.changePercent > 0 ? '+' : ''}${ingredient.changePercent.toFixed(1)}%`}
                    </Badge>
                    <Button
                      size="slim"
                      onClick={() => setSelectedIngredient({ 
                        id: ingredient.id, 
                        name: ingredient.name 
                      })}
                    >
                      View History
                    </Button>
                  </InlineStack>
                </InlineStack>
              ))}
            </BlockStack>
          </BlockStack>
        </Card>
      )}

      {/* Recent Ingredients with Trend Analysis */}
      {recentIngredients.slice(0, 3).map(ingredient => (
        <PriceTrendAnalysis
          key={ingredient.id}
          ingredientId={ingredient.id}
          priceHistoryService={priceHistoryService}
          daysBack={30}
          showDetails={true}
        />
      ))}

      {/* Price History Modal */}
      {selectedIngredient && (
        <PriceHistoryDrawer
          open={!!selectedIngredient}
          onClose={() => setSelectedIngredient(null)}
          ingredientId={selectedIngredient.id}
          ingredientName={selectedIngredient.name}
          priceHistoryService={priceHistoryService}
          showExport={true}
          showTrendAnalysis={true}
          initialPageSize={50}
        />
      )}
    </BlockStack>
  );
}