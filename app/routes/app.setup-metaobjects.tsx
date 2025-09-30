import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { Page, Card, Button, Text, Banner, Layout } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { setupMetaobjectsWithAuth } from "../../scripts/setup-metaobjects";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const result = await setupMetaobjectsWithAuth(request);
    return json(result);
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed'
    });
  }
};

export default function SetupMetaobjectsPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'submitting';

  return (
    <Page title="Setup Metaobjects">
      <TitleBar title="Setup Metaobjects" />

      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Shopify Metaobject Setup
            </Text>
            <Text as="p" variant="bodyMd">
              This will create the required metaobject definitions in your Shopify store:
            </Text>
            <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
              <li><strong>Ingredient</strong> - Food ingredients with cost tracking</li>
              <li><strong>Category</strong> - Ingredient categories (Baking, Dairy, etc.)</li>
              <li><strong>Unit Type</strong> - Units of measure (grams, milliliters, pounds)</li>
              <li><strong>Recipe</strong> - Recipes referencing ingredients and quantities</li>
              <li><strong>Packaging</strong> - Product packaging options</li>
              <li><strong>Price History</strong> - Historical price changes</li>
            </ul>

            {actionData?.success === false && (
              <Banner status="critical" title="Setup Failed">
                <Text as="p">{'error' in actionData ? actionData.error : 'Setup failed'}</Text>
              </Banner>
            )}

            {actionData?.success === true && (
              <Banner status="success" title="Setup Complete">
                <Text as="p">All metaobject definitions have been created successfully!</Text>
              </Banner>
            )}

            <div style={{ marginTop: '20px' }}>
              <Form method="post">
                <Button
                  submit
                  primary
                  loading={isLoading}
                  disabled={actionData?.success === true}
                >
                  {isLoading ? 'Setting up...' : 'Setup Metaobjects'}
                </Button>
              </Form>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section secondary>
          <Card>
            <Text as="h3" variant="headingMd">
              What this does
            </Text>
            <Text as="p" variant="bodyMd">
              This setup process creates the custom data structures (metaobjects)
              that the ingredients application needs to store data in your Shopify store.
            </Text>
            <Text as="p" variant="bodyMd">
              After running this setup, you'll be able to:
            </Text>
            <ul style={{ marginLeft: '20px' }}>
              <li>Create and manage ingredients</li>
              <li>Track ingredient costs and changes</li>
              <li>Manage packaging options</li>
              <li>View price history</li>
            </ul>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}