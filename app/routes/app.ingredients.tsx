import { useCallback, useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Modal,
  Toast,
  Frame,
  Text,
  InlineStack,
  Banner
} from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  IngredientSearch,
  IngredientList,
  IngredientForm,
  type Ingredient,
  type IngredientFormData
} from "../components/ingredients";
import type { IngredientSearchCriteria } from "../services/ingredient-search";
import { MetaobjectsService, type MetaobjectIngredient } from "../services/metaobjects";
import { IngredientSearchServiceImpl, type IngredientSearchService } from "../services/ingredient-search";
import { AuditLogService } from "../services/audit-log";

// Create service instances with proper GraphQL client
function createIngredientServices(graphqlClient: any): {
  metaobjectsService: MetaobjectsService;
  searchService: IngredientSearchService;
} {
  const metaobjectsService = new MetaobjectsService(graphqlClient);
  const auditLogService = new AuditLogService(metaobjectsService);
  const searchService = new IngredientSearchServiceImpl({
    metaobjectsService,
    auditLogService
  });

  return { metaobjectsService, searchService };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  // Check if metaobjects are set up
  const metaobjectsService = new MetaobjectsService(admin.graphql);
  const ingredientDefinitionExists = await metaobjectsService.ensureMetaobjectDefinitionExists('ingredient');

  // Parse search parameters
  const query = url.searchParams.get('query') || undefined;
  const category = url.searchParams.get('category') || undefined;
  const supplier = url.searchParams.get('supplier') || undefined;
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const sortBy = (url.searchParams.get('sortBy') as any) || 'name';
  const sortOrder = (url.searchParams.get('sortOrder') as any) || 'asc';

  const allergens = url.searchParams.get('allergens')?.split(',').filter(Boolean) || undefined;
  const excludeAllergens = url.searchParams.get('excludeAllergens')?.split(',').filter(Boolean) || undefined;
  const isActive = url.searchParams.get('isActive') === 'true' ? true : undefined;

  const costMin = url.searchParams.get('costMin');
  const costMax = url.searchParams.get('costMax');
  const costRange = (costMin || costMax) ? {
    min: costMin ? parseFloat(costMin) : undefined,
    max: costMax ? parseFloat(costMax) : undefined
  } : undefined;

  try {
    // Create services with authenticated GraphQL client
    const { metaobjectsService, searchService } = createIngredientServices(admin.graphql);

    const criteria: IngredientSearchCriteria = {
      query,
      category,
      supplier,
      allergens,
      excludeAllergens,
      isActive,
      costRange,
      sortBy,
      sortOrder,
      limit: limit,
      offset: (page - 1) * limit
    };

    // Get search results using real service
    const searchResult = await searchService.searchIngredients(criteria);

    // Get filter options
    const [categories, suppliers, allergensList, unitTypes] = await Promise.all([
      searchService.getCategories(),
      searchService.getSuppliers(),
      searchService.getAllergens(),
      searchService.getUnitTypes()
    ]);

    return json({
      searchResult,
      categories: categories || [],
      suppliers: suppliers || [],
      allergens: allergensList || [],
      unitTypes: unitTypes || [],
      currentCriteria: criteria,
      currentPage: page,
      setupRequired: !ingredientDefinitionExists
    });
  } catch (error) {
    console.error('Loader error:', error);
    return json({
      searchResult: { ingredients: [], total: 0, offset: 0, limit: 20 },
      categories: [],
      suppliers: [],
      allergens: [],
      unitTypes: [],
      currentCriteria: {},
      currentPage: 1,
      setupRequired: true,
      error: 'Failed to load ingredients'
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get('action') as string;

  try {
    // Create services with authenticated GraphQL client
    const { metaobjectsService } = createIngredientServices(admin.graphql);

    switch (actionType) {
      case 'create': {
        const ingredientData = JSON.parse(formData.get('ingredientData') as string) as IngredientFormData;

        // Transform form data to MetaobjectIngredient format
        const metaobjectData: Omit<MetaobjectIngredient, 'id' | 'gid' | 'createdAt' | 'updatedAt'> = {
          name: ingredientData.name,
          category: ingredientData.category,
          supplier: ingredientData.supplier,
          costPerUnit: parseFloat(ingredientData.cost_per_unit),
          unitType: ingredientData.unit_type as 'weight' | 'volume' | 'each',
          allergens: ingredientData.allergens,
          isActive: ingredientData.is_active,
          isComplimentary: parseFloat(ingredientData.cost_per_unit) === 0,
          notes: ingredientData.notes,
          versionToken: new Date().toISOString()
        };

        const result = await metaobjectsService.createIngredient(metaobjectData);
        return json({ success: true, message: 'Ingredient created successfully', ingredient: result });
      }

      case 'update': {
        const ingredientId = formData.get('ingredientId') as string;
        const ingredientData = JSON.parse(formData.get('ingredientData') as string) as IngredientFormData;

        // Transform form data to MetaobjectIngredient format
        const metaobjectData: Partial<MetaobjectIngredient> = {
          name: ingredientData.name,
          category: ingredientData.category,
          supplier: ingredientData.supplier,
          costPerUnit: parseFloat(ingredientData.cost_per_unit),
          unitType: ingredientData.unit_type as 'weight' | 'volume' | 'each',
          allergens: ingredientData.allergens,
          isActive: ingredientData.is_active,
          isComplimentary: parseFloat(ingredientData.cost_per_unit) === 0,
          notes: ingredientData.notes,
          versionToken: new Date().toISOString()
        };

        const result = await metaobjectsService.updateIngredient(ingredientId, metaobjectData);
        return json({ success: true, message: 'Ingredient updated successfully', ingredient: result });
      }

      case 'delete': {
        const ingredientIds = JSON.parse(formData.get('ingredientIds') as string) as string[];

        // Soft delete ingredients
        const results = await Promise.allSettled(
          ingredientIds.map(id => metaobjectsService.softDeleteIngredient(id))
        );

        const successCount = results.filter(result => result.status === 'fulfilled').length;
        const failureCount = results.filter(result => result.status === 'rejected').length;

        if (failureCount > 0) {
          return json({
            success: false,
            message: `${successCount} ingredient(s) deleted successfully, ${failureCount} failed`
          });
        }

        return json({
          success: true,
          message: `${successCount} ingredient(s) deleted successfully`
        });
      }

      case 'export': {
        const ingredientIds = JSON.parse(formData.get('ingredientIds') as string) as string[];

        // For now, return placeholder - would need to implement export service
        return json({ success: true, message: 'Export functionality not yet implemented' });
      }

      default:
        return json({ success: false, message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return json({ success: false, message: errorMessage });
  }
};

export default function IngredientsPage() {
  const loaderData = useLoaderData<typeof loader>();
  const {
    searchResult,
    categories,
    suppliers,
    allergens,
    unitTypes,
    currentCriteria,
    currentPage,
    setupRequired
  } = loaderData;
  const loaderError = 'error' in loaderData ? (loaderData as any).error : undefined;
  
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingIngredients, setDeletingIngredients] = useState<Ingredient[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const isLoading = navigation.state === 'loading' || navigation.state === 'submitting';

  // Handle action results
  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        setToastMessage(actionData.message);
        setShowCreateModal(false);
        setShowEditModal(false);
        setShowDeleteConfirm(false);
        setEditingIngredient(null);
        setDeletingIngredients([]);
      } else {
        setToastMessage(actionData.message);
      }
    }
  }, [actionData]);

  const handleSearch = useCallback((criteria: IngredientSearchCriteria) => {
    const params = new URLSearchParams();
    
    if (criteria.query) params.set('query', criteria.query);
    if (criteria.category) params.set('category', criteria.category);
    if (criteria.supplier) params.set('supplier', criteria.supplier);
    if (criteria.allergens?.length) params.set('allergens', criteria.allergens.join(','));
    if (criteria.excludeAllergens?.length) params.set('excludeAllergens', criteria.excludeAllergens.join(','));
    if (criteria.isActive !== undefined) params.set('isActive', criteria.isActive.toString());
    if (criteria.costRange?.min !== undefined) params.set('costMin', criteria.costRange.min.toString());
    if (criteria.costRange?.max !== undefined) params.set('costMax', criteria.costRange.max.toString());
    if (criteria.sortBy) params.set('sortBy', criteria.sortBy);
    if (criteria.sortOrder) params.set('sortOrder', criteria.sortOrder);
    
    params.set('page', '1'); // Reset to first page on new search
    
    window.location.search = params.toString();
  }, []);

  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', page.toString());
    window.location.search = params.toString();
  }, []);

  const handleCreateIngredient = useCallback(async (data: IngredientFormData) => {
    const formData = new FormData();
    formData.append('action', 'create');
    formData.append('ingredientData', JSON.stringify(data));
    submit(formData, { method: 'post' });
  }, [submit]);

  const handleEditIngredient = useCallback((ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setShowEditModal(true);
  }, []);

  const handleUpdateIngredient = useCallback(async (data: IngredientFormData) => {
    if (!editingIngredient) return;
    
    const formData = new FormData();
    formData.append('action', 'update');
    formData.append('ingredientId', editingIngredient?.id || '');
    formData.append('ingredientData', JSON.stringify(data));
    submit(formData, { method: 'post' });
  }, [editingIngredient, submit]);

  const handleDeleteIngredients = useCallback((ingredients: Ingredient[]) => {
    setDeletingIngredients(ingredients);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('ingredientIds', JSON.stringify(deletingIngredients.map(ing => ing.id)));
    submit(formData, { method: 'post' });
  }, [deletingIngredients, submit]);

  const handleExportIngredients = useCallback((ingredients: Ingredient[]) => {
    const formData = new FormData();
    formData.append('action', 'export');
    formData.append('ingredientIds', JSON.stringify(ingredients.map(ing => ing.id)));
    submit(formData, { method: 'post' });
  }, [submit]);

  const dismissToast = useCallback(() => setToastMessage(null), []);

  const toastMarkup = toastMessage ? (
    <Toast content={toastMessage} onDismiss={dismissToast} />
  ) : null;

  return (
    <Frame>
      <Page
        title="Ingredient Management"
        primaryAction={{
          content: 'Add Ingredient',
          icon: PlusIcon,
          onAction: () => setShowCreateModal(true)
        }}
      >
        <TitleBar title="Ingredients" />

        {setupRequired && (
          <Banner
            status="warning"
            title="Setup Required"
            action={{ content: 'Go to Configuration', url: '/app/config' }}
          >
            <Text as="p">
              The ingredient metaobject definitions need to be set up before you can manage ingredients.
              Please visit the Configuration page to run the setup process.
            </Text>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <IngredientSearch
                onSearch={handleSearch}
                categories={categories as string[]}
                suppliers={suppliers as string[]}
                allergens={allergens as string[]}
                unitTypes={unitTypes as string[]}
                isLoading={isLoading}
                initialCriteria={currentCriteria}
              />
            </Card>
          </Layout.Section>

          <Layout.Section>
            {loaderError ? (
              <Card>
                <Text as="p" variant="bodyMd" tone="critical">
                  {loaderError}
                </Text>
              </Card>
            ) : (
              <IngredientList
                result={searchResult as any}
                onEdit={handleEditIngredient}
                onDelete={handleDeleteIngredients}
                onExport={handleExportIngredients}
                onPageChange={handlePageChange}
                currentPage={currentPage}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                isLoading={isLoading}
              />
            )}
          </Layout.Section>
        </Layout>

        {/* Create Modal */}
        <Modal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Add New Ingredient"
        >
          <Modal.Section>
            <IngredientForm
              categories={categories as string[]}
              suppliers={suppliers as string[]}
              unitTypes={unitTypes as string[]}
              availableAllergens={allergens as string[]}
              onSubmit={handleCreateIngredient}
              onCancel={() => setShowCreateModal(false)}
              isLoading={isLoading}
              mode="create"
            />
          </Modal.Section>
        </Modal>

        {/* Edit Modal */}
        <Modal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Edit ${editingIngredient?.name || 'Ingredient'}`}
        >
          <Modal.Section>
            {editingIngredient && (
              <IngredientForm
                initialData={editingIngredient as any}
                categories={categories as string[]}
                suppliers={suppliers as string[]}
                unitTypes={unitTypes as string[]}
                availableAllergens={allergens as string[]}
                onSubmit={handleUpdateIngredient}
                onCancel={() => setShowEditModal(false)}
                isLoading={isLoading}
                mode="edit"
              />
            )}
          </Modal.Section>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Confirm Deletion"
          primaryAction={{
            content: 'Delete',
            onAction: handleConfirmDelete,
            destructive: true,
            loading: isLoading
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setShowDeleteConfirm(false)
            }
          ]}
        >
          <Modal.Section>
            <Text as="p" variant="bodyMd">
              Are you sure you want to delete {deletingIngredients.length} ingredient{deletingIngredients.length !== 1 ? 's' : ''}?
              This action cannot be undone.
            </Text>
            {deletingIngredients.length > 0 && (
              <Card background="bg-surface-secondary">
                <Text as="p" variant="bodyMd" fontWeight="semibold">Ingredients to delete:</Text>
                {deletingIngredients.map(ingredient => (
                  <Text key={ingredient.id} as="p" variant="bodyMd">
                    • {ingredient.name}
                  </Text>
                ))}
              </Card>
            )}
          </Modal.Section>
        </Modal>

        {toastMarkup}
      </Page>
    </Frame>
  );
}