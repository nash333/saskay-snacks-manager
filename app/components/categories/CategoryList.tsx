/**
 * CategoryList Component - Feature 003
 *
 * Displays list of ingredient categories with:
 * - Create/Edit/Delete actions
 * - Deletion blocking warning (if category in use)
 * - Soft delete support (show/hide deleted)
 * - Inline editing
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  DataTable,
  Button,
  Badge,
  InlineStack,
  Modal,
  TextField,
  Banner,
  Text,
  BlockStack
} from '@shopify/polaris';
import { DeleteIcon, EditIcon } from '@shopify/polaris-icons';

export interface Category {
  gid: string;
  name: string;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryDeletionError {
  message: string;
  affectedIngredients: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  totalCount: number;
  hasMore: boolean;
}

interface CategoryListProps {
  categories: Category[];
  onCreateCategory: (name: string) => Promise<void>;
  onUpdateCategory: (gid: string, name: string) => Promise<void>;
  onDeleteCategory: (gid: string) => Promise<void>;
  onRestoreCategory: (gid: string) => Promise<void>;
  isLoading?: boolean;
  showDeleted?: boolean;
  deletionError?: CategoryDeletionError | null;
}

export function CategoryList({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onRestoreCategory,
  isLoading = false,
  showDeleted = false,
  deletionError = null
}: CategoryListProps) {
  const [createModalActive, setCreateModalActive] = useState(false);
  const [editModalActive, setEditModalActive] = useState(false);
  const [deleteModalActive, setDeleteModalActive] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const handleOpenCreate = useCallback(() => {
    setNewCategoryName('');
    setCreateModalActive(true);
  }, []);

  const handleCreateCategory = useCallback(async () => {
    if (newCategoryName.trim()) {
      await onCreateCategory(newCategoryName.trim());
      setCreateModalActive(false);
      setNewCategoryName('');
    }
  }, [newCategoryName, onCreateCategory]);

  const handleOpenEdit = useCallback((category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setEditModalActive(true);
  }, []);

  const handleUpdateCategory = useCallback(async () => {
    if (editingCategory && newCategoryName.trim()) {
      await onUpdateCategory(editingCategory.gid, newCategoryName.trim());
      setEditModalActive(false);
      setEditingCategory(null);
      setNewCategoryName('');
    }
  }, [editingCategory, newCategoryName, onUpdateCategory]);

  const handleOpenDelete = useCallback((category: Category) => {
    setDeletingCategory(category);
    setDeleteModalActive(true);
  }, []);

  const handleDeleteCategory = useCallback(async () => {
    if (deletingCategory) {
      await onDeleteCategory(deletingCategory.gid);
      // Modal will close in parent component if deletion succeeds
    }
  }, [deletingCategory, onDeleteCategory]);

  const handleRestoreCategory = useCallback(async (category: Category) => {
    await onRestoreCategory(category.gid);
  }, [onRestoreCategory]);

  const visibleCategories = showDeleted
    ? categories
    : categories.filter(cat => cat.isActive);

  const rows = visibleCategories.map(category => [
    category.name,
    category.isActive ? (
      <Badge tone="success">Active</Badge>
    ) : (
      <Badge>Deleted</Badge>
    ),
    <InlineStack gap="200">
      {category.isActive ? (
        <>
          <Button
            size="slim"
            icon={EditIcon}
            onClick={() => handleOpenEdit(category)}
            disabled={isLoading}
          >
            Edit
          </Button>
          <Button
            size="slim"
            icon={DeleteIcon}
            onClick={() => handleOpenDelete(category)}
            disabled={isLoading}
            tone="critical"
          >
            Delete
          </Button>
        </>
      ) : (
        <Button
          size="slim"
          onClick={() => handleRestoreCategory(category)}
          disabled={isLoading}
        >
          Restore
        </Button>
      )}
    </InlineStack>
  ]);

  return (
    <>
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text variant="headingMd" as="h2">
              Ingredient Categories
            </Text>
            <Button variant="primary" onClick={handleOpenCreate} disabled={isLoading}>
              Create Category
            </Button>
          </InlineStack>

          <DataTable
            columnContentTypes={['text', 'text', 'text']}
            headings={['Name', 'Status', 'Actions']}
            rows={rows}
          />
        </BlockStack>
      </Card>

      {/* Create Category Modal */}
      <Modal
        open={createModalActive}
        onClose={() => setCreateModalActive(false)}
        title="Create New Category"
        primaryAction={{
          content: 'Create',
          onAction: handleCreateCategory,
          disabled: !newCategoryName.trim() || isLoading
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setCreateModalActive(false)
          }
        ]}
      >
        <Modal.Section>
          <TextField
            label="Category Name"
            value={newCategoryName}
            onChange={setNewCategoryName}
            autoComplete="off"
            helpText="Enter a unique category name (e.g., 'Grains & Flour')"
          />
        </Modal.Section>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        open={editModalActive}
        onClose={() => setEditModalActive(false)}
        title="Edit Category"
        primaryAction={{
          content: 'Save',
          onAction: handleUpdateCategory,
          disabled: !newCategoryName.trim() || isLoading
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setEditModalActive(false)
          }
        ]}
      >
        <Modal.Section>
          <TextField
            label="Category Name"
            value={newCategoryName}
            onChange={setNewCategoryName}
            autoComplete="off"
          />
        </Modal.Section>
      </Modal>

      {/* Delete Category Modal */}
      <Modal
        open={deleteModalActive}
        onClose={() => setDeleteModalActive(false)}
        title="Delete Category"
        primaryAction={{
          content: 'Delete',
          onAction: handleDeleteCategory,
          destructive: true,
          disabled: isLoading
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setDeleteModalActive(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {deletionError ? (
              <>
                <Banner tone="critical">
                  <Text as="p" fontWeight="bold">
                    {deletionError.message}
                  </Text>
                </Banner>

                <Text as="p">
                  This category is currently used by the following ingredients:
                </Text>

                <BlockStack gap="200">
                  {deletionError.affectedIngredients.map(ingredient => (
                    <Text as="p" key={ingredient.id}>
                      • {ingredient.name}
                    </Text>
                  ))}
                  {deletionError.hasMore && (
                    <Text as="p" tone="subdued">
                      ...and {deletionError.totalCount - deletionError.affectedIngredients.length} more
                    </Text>
                  )}
                </BlockStack>

                <Text as="p">
                  To delete this category, first update or remove these ingredients.
                </Text>
              </>
            ) : (
              <Text as="p">
                Are you sure you want to delete "{deletingCategory?.name}"? This action will soft delete the category.
              </Text>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </>
  );
}