/**
 * UnitTypeList Component - Feature 003
 *
 * Displays list of ingredient unit types with:
 * - Create/Edit/Delete actions
 * - Type category grouping (weight/volume/each)
 * - Deletion blocking warning (if unit type in use)
 * - Abbreviation display
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
  Select,
  Banner,
  Text,
  BlockStack,
  Tabs
} from '@shopify/polaris';
import { DeleteIcon, EditIcon } from '@shopify/polaris-icons';

export interface UnitType {
  gid: string;
  name: string;
  abbreviation?: string;
  typeCategory: 'weight' | 'volume' | 'each';
  isActive: boolean;
  deletedAt?: string | null;
}

export interface UnitTypeDeletionError {
  message: string;
  affectedIngredients: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  totalCount: number;
  hasMore: boolean;
}

interface UnitTypeListProps {
  unitTypes: UnitType[];
  onCreateUnitType: (data: { name: string; abbreviation?: string; typeCategory: 'weight' | 'volume' | 'each' }) => Promise<void>;
  onUpdateUnitType: (gid: string, data: { name?: string; abbreviation?: string; typeCategory?: 'weight' | 'volume' | 'each' }) => Promise<void>;
  onDeleteUnitType: (gid: string) => Promise<void>;
  onRestoreUnitType: (gid: string) => Promise<void>;
  isLoading?: boolean;
  showDeleted?: boolean;
  deletionError?: UnitTypeDeletionError | null;
}

export function UnitTypeList({
  unitTypes,
  onCreateUnitType,
  onUpdateUnitType,
  onDeleteUnitType,
  onRestoreUnitType,
  isLoading = false,
  showDeleted = false,
  deletionError = null
}: UnitTypeListProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [createModalActive, setCreateModalActive] = useState(false);
  const [editModalActive, setEditModalActive] = useState(false);
  const [deleteModalActive, setDeleteModalActive] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    typeCategory: 'weight' as 'weight' | 'volume' | 'each'
  });

  const [editingUnitType, setEditingUnitType] = useState<UnitType | null>(null);
  const [deletingUnitType, setDeletingUnitType] = useState<UnitType | null>(null);

  const tabs = [
    { id: 'all', content: 'All', badge: unitTypes.filter(ut => showDeleted || ut.isActive).length.toString() },
    { id: 'weight', content: 'Weight', badge: unitTypes.filter(ut => ut.typeCategory === 'weight' && (showDeleted || ut.isActive)).length.toString() },
    { id: 'volume', content: 'Volume', badge: unitTypes.filter(ut => ut.typeCategory === 'volume' && (showDeleted || ut.isActive)).length.toString() },
    { id: 'each', content: 'Count', badge: unitTypes.filter(ut => ut.typeCategory === 'each' && (showDeleted || ut.isActive)).length.toString() }
  ];

  const handleOpenCreate = useCallback(() => {
    setFormData({
      name: '',
      abbreviation: '',
      typeCategory: selectedTab === 1 ? 'weight' : selectedTab === 2 ? 'volume' : selectedTab === 3 ? 'each' : 'weight'
    });
    setCreateModalActive(true);
  }, [selectedTab]);

  const handleCreateUnitType = useCallback(async () => {
    if (formData.name.trim()) {
      await onCreateUnitType({
        name: formData.name.trim(),
        abbreviation: formData.abbreviation.trim() || undefined,
        typeCategory: formData.typeCategory
      });
      setCreateModalActive(false);
      setFormData({ name: '', abbreviation: '', typeCategory: 'weight' });
    }
  }, [formData, onCreateUnitType]);

  const handleOpenEdit = useCallback((unitType: UnitType) => {
    setEditingUnitType(unitType);
    setFormData({
      name: unitType.name,
      abbreviation: unitType.abbreviation || '',
      typeCategory: unitType.typeCategory
    });
    setEditModalActive(true);
  }, []);

  const handleUpdateUnitType = useCallback(async () => {
    if (editingUnitType && formData.name.trim()) {
      await onUpdateUnitType(editingUnitType.gid, {
        name: formData.name.trim(),
        abbreviation: formData.abbreviation.trim() || undefined,
        typeCategory: formData.typeCategory
      });
      setEditModalActive(false);
      setEditingUnitType(null);
      setFormData({ name: '', abbreviation: '', typeCategory: 'weight' });
    }
  }, [editingUnitType, formData, onUpdateUnitType]);

  const handleOpenDelete = useCallback((unitType: UnitType) => {
    setDeletingUnitType(unitType);
    setDeleteModalActive(true);
  }, []);

  const handleDeleteUnitType = useCallback(async () => {
    if (deletingUnitType) {
      await onDeleteUnitType(deletingUnitType.gid);
    }
  }, [deletingUnitType, onDeleteUnitType]);

  const handleRestoreUnitType = useCallback(async (unitType: UnitType) => {
    await onRestoreUnitType(unitType.gid);
  }, [onRestoreUnitType]);

  // Filter unit types based on selected tab
  const getFilteredUnitTypes = () => {
    let filtered = showDeleted ? unitTypes : unitTypes.filter(ut => ut.isActive);

    if (selectedTab === 1) filtered = filtered.filter(ut => ut.typeCategory === 'weight');
    else if (selectedTab === 2) filtered = filtered.filter(ut => ut.typeCategory === 'volume');
    else if (selectedTab === 3) filtered = filtered.filter(ut => ut.typeCategory === 'each');

    return filtered;
  };

  const visibleUnitTypes = getFilteredUnitTypes();

  const rows = visibleUnitTypes.map(unitType => [
    unitType.name,
    unitType.abbreviation || '—',
    <Badge>{unitType.typeCategory}</Badge>,
    unitType.isActive ? (
      <Badge tone="success">Active</Badge>
    ) : (
      <Badge>Deleted</Badge>
    ),
    <InlineStack gap="200">
      {unitType.isActive ? (
        <>
          <Button
            size="slim"
            icon={EditIcon}
            onClick={() => handleOpenEdit(unitType)}
            disabled={isLoading}
          >
            Edit
          </Button>
          <Button
            size="slim"
            icon={DeleteIcon}
            onClick={() => handleOpenDelete(unitType)}
            disabled={isLoading}
            tone="critical"
          >
            Delete
          </Button>
        </>
      ) : (
        <Button
          size="slim"
          onClick={() => handleRestoreUnitType(unitType)}
          disabled={isLoading}
        >
          Restore
        </Button>
      )}
    </InlineStack>
  ]);

  const typeCategoryOptions = [
    { label: 'Weight', value: 'weight' },
    { label: 'Volume', value: 'volume' },
    { label: 'Count (Each)', value: 'each' }
  ];

  return (
    <>
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text variant="headingMd" as="h2">
              Unit Types
            </Text>
            <Button variant="primary" onClick={handleOpenCreate} disabled={isLoading}>
              Create Unit Type
            </Button>
          </InlineStack>

          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text', 'text']}
              headings={['Name', 'Abbreviation', 'Category', 'Status', 'Actions']}
              rows={rows}
            />
          </Tabs>
        </BlockStack>
      </Card>

      {/* Create Modal */}
      <Modal
        open={createModalActive}
        onClose={() => setCreateModalActive(false)}
        title="Create New Unit Type"
        primaryAction={{
          content: 'Create',
          onAction: handleCreateUnitType,
          disabled: !formData.name.trim() || isLoading
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setCreateModalActive(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Unit Type Name"
              value={formData.name}
              onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
              autoComplete="off"
              helpText="e.g., 'grams', 'milliliters', 'pieces'"
            />

            <TextField
              label="Abbreviation (optional)"
              value={formData.abbreviation}
              onChange={(value) => setFormData(prev => ({ ...prev, abbreviation: value }))}
              autoComplete="off"
              helpText="e.g., 'g', 'mL', 'pcs'"
            />

            <Select
              label="Type Category"
              options={typeCategoryOptions}
              value={formData.typeCategory}
              onChange={(value) => setFormData(prev => ({ ...prev, typeCategory: value as 'weight' | 'volume' | 'each' }))}
              helpText="Classification for this unit type"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editModalActive}
        onClose={() => setEditModalActive(false)}
        title="Edit Unit Type"
        primaryAction={{
          content: 'Save',
          onAction: handleUpdateUnitType,
          disabled: !formData.name.trim() || isLoading
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setEditModalActive(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Unit Type Name"
              value={formData.name}
              onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
              autoComplete="off"
            />

            <TextField
              label="Abbreviation (optional)"
              value={formData.abbreviation}
              onChange={(value) => setFormData(prev => ({ ...prev, abbreviation: value }))}
              autoComplete="off"
            />

            <Select
              label="Type Category"
              options={typeCategoryOptions}
              value={formData.typeCategory}
              onChange={(value) => setFormData(prev => ({ ...prev, typeCategory: value as 'weight' | 'volume' | 'each' }))}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModalActive}
        onClose={() => setDeleteModalActive(false)}
        title="Delete Unit Type"
        primaryAction={{
          content: 'Delete',
          onAction: handleDeleteUnitType,
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
                  This unit type is currently used by the following ingredients:
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
                  To delete this unit type, first update or remove these ingredients.
                </Text>
              </>
            ) : (
              <Text as="p">
                Are you sure you want to delete "{deletingUnitType?.name}"? This action will soft delete the unit type.
              </Text>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </>
  );
}