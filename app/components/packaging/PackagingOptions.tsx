/**
 * Packaging Options Component
 * Task 48: Implement packaging options component (FR-009, FR-030)
 * Provides list/add/edit functionality for packaging configurations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  DataTable,
  Button,
  Modal,
  TextField,
  Select,
  InlineStack,
  BlockStack,
  Text,
  Badge,
  Banner,
  Spinner,
  EmptyState,
  ButtonGroup,
  Filters,
  ChoiceList,
  RangeSlider
} from '@shopify/polaris';
import { PlusIcon, EditIcon, DeleteIcon, PackageIcon } from '@shopify/polaris-icons';
import type { MetaobjectPackaging } from '../../services/metaobjects';

export interface PackagingOption {
  id?: string;
  name: string;
  description?: string;
  costPerUnit: number;
  unitType: 'each' | 'weight' | 'volume';
  unitCount?: number;
  costPerPackage?: number;
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
  usageStats?: {
    totalProducts: number;
    activeProducts: number;
    lastUsed?: Date;
    monthlyUsage: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PackagingOptionsProps {
  onPackagingSelect?: (packaging: PackagingOption) => void;
  allowMultiSelect?: boolean;
  selectedIds?: string[];
  showUsageStats?: boolean;
  enableFilters?: boolean;
  enableActions?: boolean;
  compact?: boolean;
}

export interface PackagingFormData {
  name: string;
  description: string;
  costPerUnit: string;
  unitType: 'each' | 'weight' | 'volume';
  unitCount: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
    unit: 'inches' | 'cm';
  };
  weight: {
    value: string;
    unit: 'grams' | 'ounces';
  };
  capacity: {
    value: string;
    unit: 'ml' | 'oz' | 'cups';
  };
  supplierName: string;
  supplierSku: string;
  supplierUrl: string;
  minimumOrderQuantity: string;
  isActive: boolean;
  tags: string;
}

const initialFormData: PackagingFormData = {
  name: '',
  description: '',
  costPerUnit: '',
  unitType: 'each',
  unitCount: '1',
  dimensions: {
    length: '',
    width: '',
    height: '',
    unit: 'inches'
  },
  weight: {
    value: '',
    unit: 'grams'
  },
  capacity: {
    value: '',
    unit: 'ml'
  },
  supplierName: '',
  supplierSku: '',
  supplierUrl: '',
  minimumOrderQuantity: '',
  isActive: true,
  tags: ''
};

/**
 * Main packaging options component
 */
export function PackagingOptions({
  onPackagingSelect,
  allowMultiSelect = false,
  selectedIds = [],
  showUsageStats = true,
  enableFilters = true,
  enableActions = true,
  compact = false
}: PackagingOptionsProps) {
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState<PackagingOption | null>(null);
  const [formData, setFormData] = useState<PackagingFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Filters state
  const [nameFilter, setNameFilter] = useState('');
  const [unitTypeFilter, setUnitTypeFilter] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string[]>(['active']);
  const [costRange, setCostRange] = useState<[number, number]>([0, 100]);
  const [supplierFilter, setSupplierFilter] = useState('');

  // Load packaging options
  const loadPackagingOptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for now - would be replaced with actual API call
      const mockData: PackagingOption[] = [
        {
          id: '1',
          name: 'Small Pouch',
          description: 'Resealable small pouch for snacks',
          costPerUnit: 0.15,
          unitType: 'each',
          unitCount: 1,
          costPerPackage: 0.15,
          dimensions: {
            length: 4,
            width: 6,
            height: 0.5,
            unit: 'inches'
          },
          weight: {
            value: 5,
            unit: 'grams'
          },
          capacity: {
            value: 100,
            unit: 'ml'
          },
          supplierInfo: {
            supplierName: 'PackageCorp',
            sku: 'PC-SP-100',
            orderingUrl: 'https://packagecorp.com/small-pouch',
            minimumOrderQuantity: 1000
          },
          isActive: true,
          tags: ['resealable', 'small', 'retail'],
          usageStats: {
            totalProducts: 5,
            activeProducts: 3,
            lastUsed: new Date('2024-01-15'),
            monthlyUsage: 2500
          },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
        },
        {
          id: '2',
          name: 'Medium Box',
          description: 'Cardboard box for bulk packaging',
          costPerUnit: 0.45,
          unitType: 'each',
          unitCount: 1,
          costPerPackage: 0.45,
          dimensions: {
            length: 8,
            width: 6,
            height: 4,
            unit: 'inches'
          },
          weight: {
            value: 25,
            unit: 'grams'
          },
          capacity: {
            value: 500,
            unit: 'ml'
          },
          supplierInfo: {
            supplierName: 'BoxMakers Ltd',
            sku: 'BM-MB-500',
            minimumOrderQuantity: 500
          },
          isActive: true,
          tags: ['cardboard', 'bulk', 'eco-friendly'],
          usageStats: {
            totalProducts: 8,
            activeProducts: 6,
            lastUsed: new Date('2024-01-20'),
            monthlyUsage: 1200
          },
          createdAt: new Date('2023-12-15'),
          updatedAt: new Date('2024-01-20')
        },
        {
          id: '3',
          name: 'Foil Pack',
          description: 'Heat-sealable foil packaging',
          costPerUnit: 0.25,
          unitType: 'each',
          unitCount: 1,
          costPerPackage: 0.25,
          dimensions: {
            length: 5,
            width: 7,
            height: 0.2,
            unit: 'inches'
          },
          weight: {
            value: 3,
            unit: 'grams'
          },
          capacity: {
            value: 150,
            unit: 'ml'
          },
          supplierInfo: {
            supplierName: 'FlexPack Solutions',
            sku: 'FP-FOIL-150',
            orderingUrl: 'https://flexpack.com/foil-packs',
            minimumOrderQuantity: 2000
          },
          isActive: false,
          tags: ['foil', 'heat-seal', 'premium'],
          usageStats: {
            totalProducts: 2,
            activeProducts: 0,
            lastUsed: new Date('2023-11-10'),
            monthlyUsage: 0
          },
          createdAt: new Date('2023-10-01'),
          updatedAt: new Date('2023-11-10')
        }
      ];
      
      setPackagingOptions(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load packaging options');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackagingOptions();
  }, [loadPackagingOptions]);

  // Filter packaging options
  const filteredOptions = packagingOptions.filter(option => {
    // Name filter
    if (nameFilter && !option.name.toLowerCase().includes(nameFilter.toLowerCase())) {
      return false;
    }

    // Unit type filter
    if (unitTypeFilter.length > 0 && !unitTypeFilter.includes(option.unitType)) {
      return false;
    }

    // Active filter
    if (activeFilter.length > 0) {
      if (activeFilter.includes('active') && !option.isActive) return false;
      if (activeFilter.includes('inactive') && option.isActive) return false;
    }

    // Cost range filter
    if (option.costPerUnit < costRange[0] || option.costPerUnit > costRange[1]) {
      return false;
    }

    // Supplier filter
    if (supplierFilter && option.supplierInfo && 
        !option.supplierInfo.supplierName.toLowerCase().includes(supplierFilter.toLowerCase())) {
      return false;
    }

    return true;
  });

  // Clear filters
  const clearAllFilters = () => {
    setNameFilter('');
    setUnitTypeFilter([]);
    setActiveFilter(['active']);
    setCostRange([0, 100]);
    setSupplierFilter('');
  };

  // Handle form submission
  const handleSave = async () => {
    // Validate form
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.costPerUnit || parseFloat(formData.costPerUnit) < 0) {
      errors.costPerUnit = 'Cost per unit must be a positive number';
    }

    if (formData.dimensions.length && (
      !formData.dimensions.width || !formData.dimensions.height ||
      parseFloat(formData.dimensions.length) <= 0 ||
      parseFloat(formData.dimensions.width) <= 0 ||
      parseFloat(formData.dimensions.height) <= 0
    )) {
      errors.dimensions = 'All dimensions must be positive numbers';
    }

    if (formData.minimumOrderQuantity && parseInt(formData.minimumOrderQuantity) < 1) {
      errors.minimumOrderQuantity = 'Minimum order quantity must be at least 1';
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setSaving(true);
      
      // Convert form data to packaging option
      const packagingData: PackagingOption = {
        id: editingPackaging?.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        costPerUnit: parseFloat(formData.costPerUnit),
        unitType: formData.unitType,
        unitCount: parseInt(formData.unitCount) || 1,
        costPerPackage: parseFloat(formData.costPerUnit) * (parseInt(formData.unitCount) || 1),
        dimensions: formData.dimensions.length ? {
          length: parseFloat(formData.dimensions.length),
          width: parseFloat(formData.dimensions.width),
          height: parseFloat(formData.dimensions.height),
          unit: formData.dimensions.unit
        } : undefined,
        weight: formData.weight.value ? {
          value: parseFloat(formData.weight.value),
          unit: formData.weight.unit
        } : undefined,
        capacity: formData.capacity.value ? {
          value: parseFloat(formData.capacity.value),
          unit: formData.capacity.unit
        } : undefined,
        supplierInfo: formData.supplierName ? {
          supplierName: formData.supplierName,
          sku: formData.supplierSku,
          orderingUrl: formData.supplierUrl || undefined,
          minimumOrderQuantity: formData.minimumOrderQuantity ? parseInt(formData.minimumOrderQuantity) : undefined
        } : undefined,
        isActive: formData.isActive,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
        updatedAt: new Date()
      };

      if (!editingPackaging) {
        packagingData.id = `pkg_${Date.now()}`;
        packagingData.createdAt = new Date();
        packagingData.usageStats = {
          totalProducts: 0,
          activeProducts: 0,
          monthlyUsage: 0
        };
      }

      // Mock save - would be replaced with actual API call
      if (editingPackaging) {
        setPackagingOptions(prev => 
          prev.map(option => option.id === editingPackaging.id ? packagingData : option)
        );
      } else {
        setPackagingOptions(prev => [...prev, packagingData]);
      }

      // Close modal and reset form
      setShowModal(false);
      setEditingPackaging(null);
      setFormData(initialFormData);
      setFormErrors({});

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save packaging option');
    } finally {
      setSaving(false);
    }
  };

  // Handle edit
  const handleEdit = (packaging: PackagingOption) => {
    setEditingPackaging(packaging);
    setFormData({
      name: packaging.name,
      description: packaging.description || '',
      costPerUnit: packaging.costPerUnit.toString(),
      unitType: packaging.unitType,
      unitCount: packaging.unitCount?.toString() || '1',
      dimensions: {
        length: packaging.dimensions?.length.toString() || '',
        width: packaging.dimensions?.width.toString() || '',
        height: packaging.dimensions?.height.toString() || '',
        unit: packaging.dimensions?.unit || 'inches'
      },
      weight: {
        value: packaging.weight?.value.toString() || '',
        unit: packaging.weight?.unit || 'grams'
      },
      capacity: {
        value: packaging.capacity?.value.toString() || '',
        unit: packaging.capacity?.unit || 'ml'
      },
      supplierName: packaging.supplierInfo?.supplierName || '',
      supplierSku: packaging.supplierInfo?.sku || '',
      supplierUrl: packaging.supplierInfo?.orderingUrl || '',
      minimumOrderQuantity: packaging.supplierInfo?.minimumOrderQuantity?.toString() || '',
      isActive: packaging.isActive,
      tags: packaging.tags?.join(', ') || ''
    });
    setShowModal(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this packaging option?')) {
      return;
    }

    try {
      // Mock delete - would be replaced with actual API call
      setPackagingOptions(prev => prev.filter(option => option.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete packaging option');
    }
  };

  // Handle add new
  const handleAddNew = () => {
    setEditingPackaging(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowModal(false);
    setEditingPackaging(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  // Prepare table data
  const tableRows = filteredOptions.map(option => [
    option.name,
    option.unitType === 'each' ? 'Each' : option.unitType === 'weight' ? 'By Weight' : 'By Volume',
    `$${option.costPerUnit.toFixed(3)}`,
    option.dimensions ? 
      `${option.dimensions.length}" × ${option.dimensions.width}" × ${option.dimensions.height}"` : 
      '—',
    option.supplierInfo?.supplierName || '—',
    showUsageStats && option.usageStats ? (
      <Text variant="bodyMd" as="span">
        {option.usageStats.activeProducts}/{option.usageStats.totalProducts} products
      </Text>
    ) : '—',
    <Badge tone={option.isActive ? 'success' : 'critical'}>
      {option.isActive ? 'Active' : 'Inactive'}
    </Badge>,
    enableActions ? (
      <ButtonGroup variant="segmented">
        <Button size="micro" onClick={() => handleEdit(option)} icon={EditIcon}>
          Edit
        </Button>
        <Button 
          size="micro" 
          onClick={() => handleDelete(option.id!)} 
          icon={DeleteIcon}
          tone="critical"
        >
          Delete
        </Button>
      </ButtonGroup>
    ) : '—'
  ]);

  const tableHeadings = [
    'Name',
    'Unit Type',
    'Cost per Unit',
    'Dimensions',
    'Supplier',
    ...(showUsageStats ? ['Usage'] : []),
    'Status',
    ...(enableActions ? ['Actions'] : [])
  ];

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Spinner size="large" />
          <Text variant="bodyMd" as="p" tone="subdued">
            Loading packaging options...
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <BlockStack gap="400">
          {/* Header */}
          <InlineStack align="space-between">
            <BlockStack gap="100">
              <Text variant="headingLg" as="h2">
                Packaging Options
              </Text>
              <Text variant="bodyMd" tone="subdued" as="p">
                Manage packaging configurations for cost calculations
              </Text>
            </BlockStack>
            
            {enableActions && (
              <Button variant="primary" onClick={handleAddNew} icon={PlusIcon}>
                Add Packaging
              </Button>
            )}
          </InlineStack>

          {/* Error banner */}
          {error && (
            <Banner tone="critical" onDismiss={() => setError(null)}>
              <Text variant="bodyMd" as="p">
                {error}
              </Text>
            </Banner>
          )}

          {/* Filters */}
          {enableFilters && (
            <Filters
              queryValue={nameFilter}
              queryPlaceholder="Search packaging..."
              onQueryChange={setNameFilter}
              onQueryClear={() => setNameFilter('')}
              onClearAll={clearAllFilters}
              filters={[
                {
                  key: 'unitType',
                  label: 'Unit Type',
                  filter: (
                    <ChoiceList
                      title="Unit Type"
                      titleHidden
                      choices={[
                        { label: 'Each', value: 'each' },
                        { label: 'Weight', value: 'weight' },
                        { label: 'Volume', value: 'volume' }
                      ]}
                      selected={unitTypeFilter}
                      onChange={setUnitTypeFilter}
                      allowMultiple
                    />
                  ),
                  shortcut: true
                },
                {
                  key: 'status',
                  label: 'Status',
                  filter: (
                    <ChoiceList
                      title="Status"
                      titleHidden
                      choices={[
                        { label: 'Active', value: 'active' },
                        { label: 'Inactive', value: 'inactive' }
                      ]}
                      selected={activeFilter}
                      onChange={setActiveFilter}
                      allowMultiple
                    />
                  ),
                  shortcut: true
                },
                {
                  key: 'costRange',
                  label: 'Cost Range',
                  filter: (
                    <RangeSlider
                      label="Cost per unit ($)"
                      value={costRange}
                      onChange={(value) => setCostRange(value as [number, number])}
                      output
                      min={0}
                      max={10}
                      step={0.05}
                    />
                  )
                }
              ]}
              appliedFilters={[
                ...(unitTypeFilter.length > 0 ? [{
                  key: 'unitType',
                  label: `Unit Type: ${unitTypeFilter.join(', ')}`,
                  onRemove: () => setUnitTypeFilter([])
                }] : []),
                ...(activeFilter.length > 0 && !activeFilter.includes('active') ? [{
                  key: 'status',
                  label: `Status: ${activeFilter.join(', ')}`,
                  onRemove: () => setActiveFilter(['active'])
                }] : []),
                ...((costRange[0] > 0 || costRange[1] < 100) ? [{
                  key: 'costRange',
                  label: `Cost: $${costRange[0]}-$${costRange[1]}`,
                  onRemove: () => setCostRange([0, 100])
                }] : [])
              ]}
            />
          )}

          {/* Data table */}
          {filteredOptions.length === 0 ? (
            <EmptyState
              heading="No packaging options found"
              action={{
                content: enableActions ? 'Add packaging' : undefined,
                onAction: enableActions ? handleAddNew : undefined
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <Text variant="bodyMd" as="p">
                {packagingOptions.length === 0 
                  ? 'Add your first packaging option to get started with cost calculations.'
                  : 'Try adjusting your filters to see more results.'
                }
              </Text>
            </EmptyState>
          ) : (
            <DataTable
              columnContentTypes={[
                'text',
                'text',
                'numeric',
                'text',
                'text',
                ...(showUsageStats ? ['text' as const] : []),
                'text',
                ...(enableActions ? ['text' as const] : [])
              ]}
              headings={tableHeadings}
              rows={tableRows}
              sortable={[true, true, true, false, true, false, true, false]}
              defaultSortDirection="ascending"
              initialSortColumnIndex={0}
            />
          )}
        </BlockStack>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={handleModalClose}
        title={editingPackaging ? 'Edit Packaging Option' : 'Add Packaging Option'}
        primaryAction={{
          content: 'Save',
          onAction: handleSave,
          loading: saving
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: handleModalClose
        }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <TextField
                  label="Name"
                  value={formData.name}
                  onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                  error={formErrors.name}
                  autoComplete="off"
                  placeholder="e.g., Small Pouch, Medium Box"
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Unit Type"
                  options={[
                    { label: 'Each (per package)', value: 'each' },
                    { label: 'By Weight', value: 'weight' },
                    { label: 'By Volume', value: 'volume' }
                  ]}
                  value={formData.unitType}
                  onChange={(value) => setFormData(prev => ({ ...prev, unitType: value as any }))}
                />
              </div>
            </InlineStack>

            <TextField
              label="Description"
              value={formData.description}
              onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
              multiline={2}
              autoComplete="off"
              placeholder="Optional description of the packaging"
            />

            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <TextField
                  label="Cost per Unit"
                  type="number"
                  value={formData.costPerUnit}
                  onChange={(value) => setFormData(prev => ({ ...prev, costPerUnit: value }))}
                  error={formErrors.costPerUnit}
                  prefix="$"
                  step={0.001}
                  autoComplete="off"
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Unit Count"
                  type="number"
                  value={formData.unitCount}
                  onChange={(value) => setFormData(prev => ({ ...prev, unitCount: value }))}
                  step={1}
                  autoComplete="off"
                  helpText="Number of units per package"
                />
              </div>
            </InlineStack>

            {/* Dimensions */}
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">
                Dimensions (Optional)
              </Text>
              <InlineStack gap="200">
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Length"
                    type="number"
                    value={formData.dimensions.length}
                    onChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      dimensions: { ...prev.dimensions, length: value } 
                    }))}
                    step={0.1}
                    autoComplete="off"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Width"
                    type="number"
                    value={formData.dimensions.width}
                    onChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      dimensions: { ...prev.dimensions, width: value } 
                    }))}
                    step={0.1}
                    autoComplete="off"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Height"
                    type="number"
                    value={formData.dimensions.height}
                    onChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      dimensions: { ...prev.dimensions, height: value } 
                    }))}
                    step={0.1}
                    autoComplete="off"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Unit"
                    options={[
                      { label: 'Inches', value: 'inches' },
                      { label: 'Centimeters', value: 'cm' }
                    ]}
                    value={formData.dimensions.unit}
                    onChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      dimensions: { ...prev.dimensions, unit: value as any } 
                    }))}
                  />
                </div>
              </InlineStack>
              {formErrors.dimensions && (
                <Text tone="critical" as="p">
                  {formErrors.dimensions}
                </Text>
              )}
            </BlockStack>

            {/* Weight and Capacity */}
            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">
                    Weight (Optional)
                  </Text>
                  <InlineStack gap="200">
                    <div style={{ flex: 2 }}>
                      <TextField
                        label="Weight"
                        type="number"
                        value={formData.weight.value}
                        onChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          weight: { ...prev.weight, value } 
                        }))}
                        step={0.1}
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Select
                        label="Unit"
                        options={[
                          { label: 'Grams', value: 'grams' },
                          { label: 'Ounces', value: 'ounces' }
                        ]}
                        value={formData.weight.unit}
                        onChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          weight: { ...prev.weight, unit: value as any } 
                        }))}
                      />
                    </div>
                  </InlineStack>
                </BlockStack>
              </div>

              <div style={{ flex: 1 }}>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">
                    Capacity (Optional)
                  </Text>
                  <InlineStack gap="200">
                    <div style={{ flex: 2 }}>
                      <TextField
                        label="Capacity"
                        type="number"
                        value={formData.capacity.value}
                        onChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          capacity: { ...prev.capacity, value } 
                        }))}
                        step={0.1}
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Select
                        label="Unit"
                        options={[
                          { label: 'ml', value: 'ml' },
                          { label: 'oz', value: 'oz' },
                          { label: 'cups', value: 'cups' }
                        ]}
                        value={formData.capacity.unit}
                        onChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          capacity: { ...prev.capacity, unit: value as any } 
                        }))}
                      />
                    </div>
                  </InlineStack>
                </BlockStack>
              </div>
            </InlineStack>

            {/* Supplier Information */}
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">
                Supplier Information (Optional)
              </Text>
              <InlineStack gap="400">
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Supplier Name"
                    value={formData.supplierName}
                    onChange={(value) => setFormData(prev => ({ ...prev, supplierName: value }))}
                    autoComplete="off"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="SKU"
                    value={formData.supplierSku}
                    onChange={(value) => setFormData(prev => ({ ...prev, supplierSku: value }))}
                    autoComplete="off"
                  />
                </div>
              </InlineStack>

              <InlineStack gap="400">
                <div style={{ flex: 2 }}>
                  <TextField
                    label="Ordering URL"
                    value={formData.supplierUrl}
                    onChange={(value) => setFormData(prev => ({ ...prev, supplierUrl: value }))}
                    autoComplete="off"
                    placeholder="https://..."
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Min Order Qty"
                    type="number"
                    value={formData.minimumOrderQuantity}
                    onChange={(value) => setFormData(prev => ({ ...prev, minimumOrderQuantity: value }))}
                    error={formErrors.minimumOrderQuantity}
                    step={1}
                    autoComplete="off"
                  />
                </div>
              </InlineStack>
            </BlockStack>

            {/* Tags and Status */}
            <InlineStack gap="400">
              <div style={{ flex: 2 }}>
                <TextField
                  label="Tags"
                  value={formData.tags}
                  onChange={(value) => setFormData(prev => ({ ...prev, tags: value }))}
                  autoComplete="off"
                  placeholder="e.g., resealable, premium, eco-friendly"
                  helpText="Comma-separated tags for organization"
                />
              </div>
              <div style={{ flex: 1, paddingTop: '1.5rem' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    style={{ marginRight: '8px' }}
                  />
                  Active packaging option
                </label>
              </div>
            </InlineStack>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </>
  );
}