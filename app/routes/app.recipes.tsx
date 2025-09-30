import { useCallback, useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Toast,
  Frame,
  Text,
  Banner
} from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  RecipeList,
  RecipeForm,
  type Recipe,
  type RecipeFormData
} from "../components/recipes";
import { MetaobjectsService } from "../services/metaobjects";
import { RecipeService } from "../services/recipe";

function createRecipeServices(graphqlClient: any) {
  const metaobjectsService = new MetaobjectsService(graphqlClient);
  const recipeService = new RecipeService(metaobjectsService);
  return { metaobjectsService, recipeService };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const metaobjectsService = new MetaobjectsService(admin.graphql);
  const recipeDefinitionExists = await metaobjectsService.ensureMetaobjectDefinitionExists('recipe');

  try {
    const { recipeService } = createRecipeServices(admin.graphql);
    const recipes = await recipeService.listRecipes(false);
    return json({ recipes, setupRequired: !recipeDefinitionExists });
  } catch (error) {
    console.error('Loader error (recipes):', error);
    return json({ recipes: [], setupRequired: !recipeDefinitionExists, error: 'Failed to load recipes' });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get('action') as string;

  try {
    const { recipeService } = createRecipeServices(admin.graphql);

    switch (actionType) {
      case 'create': {
        const recipeData = JSON.parse(formData.get('recipeData') as string) as RecipeFormData;

        const input = {
          name: recipeData.name,
          description: recipeData.description,
          ingredients: recipeData.ingredients.map(i => ({
            ingredientGid: i.id,
            quantityNeeded: i.quantity,
            unitTypeGid: i.unit
          }))
        };

        const result = await recipeService.createRecipe(input);
        return json({ success: true, message: 'Recipe created', recipe: result });
      }

      case 'update': {
        const recipeGid = formData.get('recipeGid') as string;
        const recipeData = JSON.parse(formData.get('recipeData') as string) as RecipeFormData;

        const input = {
          name: recipeData.name,
          description: recipeData.description,
          ingredients: recipeData.ingredients.map(i => ({
            ingredientGid: i.id,
            quantityNeeded: i.quantity,
            unitTypeGid: i.unit
          }))
        };

        const result = await recipeService.updateRecipe(recipeGid, input);
        return json({ success: true, message: 'Recipe updated', recipe: result });
      }

      case 'delete': {
        const recipeGid = formData.get('recipeGid') as string;
        await recipeService.deleteRecipe(recipeGid);
        return json({ success: true, message: 'Recipe deleted' });
      }

      default:
        return json({ success: false, message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Action error (recipes):', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return json({ success: false, message: errorMessage });
  }
};

export default function RecipesPage() {
  const loaderData = useLoaderData<typeof loader>();
  const { recipes, setupRequired } = loaderData;
  const loaderError = 'error' in loaderData ? (loaderData as any).error : undefined;

  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isLoading = navigation.state === 'loading' || navigation.state === 'submitting';

  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        setToastMessage(actionData.message);
        setShowCreateModal(false);
        setShowEditModal(false);
        setEditingRecipe(null);
      } else {
        setToastMessage(actionData.message);
      }
    }
  }, [actionData]);

  const handleCreateRecipe = useCallback((data: RecipeFormData) => {
    const formData = new FormData();
    formData.append('action', 'create');
    formData.append('recipeData', JSON.stringify(data));
    submit(formData, { method: 'post' });
  }, [submit]);

  const handleEditRecipe = useCallback((recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowEditModal(true);
  }, []);

  const handleUpdateRecipe = useCallback((data: RecipeFormData) => {
    if (!editingRecipe) return;
    const formData = new FormData();
    formData.append('action', 'update');
    formData.append('recipeGid', (editingRecipe as any).id || '');
    formData.append('recipeData', JSON.stringify(data));
    submit(formData, { method: 'post' });
  }, [editingRecipe, submit]);

  const handleDeleteRecipe = useCallback((recipe: Recipe) => {
    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('recipeGid', (recipe as any).id || '');
    submit(formData, { method: 'post' });
  }, [submit]);

  const dismissToast = useCallback(() => setToastMessage(null), []);

  const toastMarkup = toastMessage ? (
    <Toast content={toastMessage} onDismiss={dismissToast} />
  ) : null;

  return (
    <Frame>
      <Page
        title="Recipe Management"
        primaryAction={{ content: 'Add Recipe', icon: PlusIcon, onAction: () => setShowCreateModal(true) }}
      >
        <TitleBar title="Recipes" />

        {setupRequired && (
          <Banner
            status="warning"
            title="Setup Required"
            action={{ content: 'Go to Configuration', url: '/app/config' }}
          >
            <Text as="p">
              The recipe metaobject definitions need to be set up before you can manage recipes.
            </Text>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            {loaderError ? (
              <Card>
                <Text as="p" variant="bodyMd" tone="critical">{loaderError}</Text>
              </Card>
            ) : (
              <RecipeList
                recipes={recipes as any}
                loading={isLoading}
                onEdit={handleEditRecipe}
                onDelete={handleDeleteRecipe}
                onCreate={() => setShowCreateModal(true)}
              />
            )}
          </Layout.Section>
        </Layout>

        {toastMarkup}
      </Page>
    </Frame>
  );
}
