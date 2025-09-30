import React from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Banner,
  InlineStack,
  Badge,
  Divider,
  BlockStack,
  Checkbox
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { setupMetaobjectsWithAuth, createSampleData } from "../../scripts/setup-metaobjects";
import { authenticate } from "../shopify.server";
import { MetaobjectsService } from "../services/metaobjects";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const metaobjectsService = new MetaobjectsService(admin.graphql);

  // Check which metaobject definitions exist
  const [ingredientExists, packagingExists, priceHistoryExists] = await Promise.all([
    metaobjectsService.ensureMetaobjectDefinitionExists('ingredient'),
    metaobjectsService.ensureMetaobjectDefinitionExists('packaging'),
    metaobjectsService.ensureMetaobjectDefinitionExists('price_history')
  ]);

  return json({
    metaobjectStatus: {
      ingredient: ingredientExists,
      packaging: packagingExists,
      priceHistory: priceHistoryExists,
      allReady: ingredientExists && packagingExists && priceHistoryExists
    }
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const actionType = formData.get('action') as string;

  try {
    switch (actionType) {
      case 'setup-metaobjects': {
        const result = await setupMetaobjectsWithAuth(request);
        return json(result);
      }

      case 'create-sample-data': {
        const cleanFirst = formData.get('cleanFirst') === 'true';
        const result = await createSampleData(request, cleanFirst);
        return json(result);
      }

      default:
        return json({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Action failed'
    });
  }
};

export default function ConfigPage() {
  const { metaobjectStatus } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [cleanFirst, setCleanFirst] = React.useState(true);

  const isLoading = navigation.state === 'submitting';
  const isSetupLoading = navigation.formData?.get('action') === 'setup-metaobjects';

  const getStatusBadge = (exists: boolean) => {
    return exists ? (
      <Badge status="success">Ready</Badge>
    ) : (
      <Badge status="critical">Not Setup</Badge>
    );
  };

  return (
    <Page title="Configuration">
      <TitleBar title="App Configuration" />

      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Setup & Configuration
              </Text>

              <Text as="p" variant="bodyMd">
                Configure your Saskay Snacks Manager app settings and ensure all required
                components are properly set up.
              </Text>

              {actionData?.success === false && (
                <Banner status="critical" title="Setup Failed">
                  <Text as="p">{'error' in actionData ? actionData.error : 'Setup failed'}</Text>
                </Banner>
              )}

              {actionData?.success === true && 'definitions' in actionData && (
                <Banner status="success" title="Setup Complete">
                  <Text as="p">Metaobject definitions have been created successfully!</Text>
                </Banner>
              )}

              {actionData?.success === true && 'count' in actionData && (
                <Banner status="success" title="Sample Data Created">
                  <BlockStack gap="200">
                    {actionData.deleted > 0 && (
                      <Text as="p">🗑️ Deleted {actionData.deleted} existing ingredient{actionData.deleted !== 1 ? 's' : ''}</Text>
                    )}
                    <Text as="p">✅ Created {actionData.count} sample ingredient{actionData.count !== 1 ? 's' : ''} successfully!</Text>
                  </BlockStack>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Shopify Metaobjects Setup
              </Text>

              <Text as="p" variant="bodyMd">
                The app requires custom data structures (metaobjects) in your Shopify store
                to function properly. Check the status below and run setup if needed.
              </Text>

              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">Ingredient Definition</Text>
                  {getStatusBadge(metaobjectStatus.ingredient)}
                </InlineStack>

                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">Packaging Definition</Text>
                  {getStatusBadge(metaobjectStatus.packaging)}
                </InlineStack>

                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">Price History Definition</Text>
                  {getStatusBadge(metaobjectStatus.priceHistory)}
                </InlineStack>
              </BlockStack>

              <Divider />

              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    Overall Status
                  </Text>
                  {metaobjectStatus.allReady ? (
                    <Badge status="success">All Ready</Badge>
                  ) : (
                    <Badge status="attention">Setup Required</Badge>
                  )}
                </InlineStack>

                {!metaobjectStatus.allReady && (
                  <Form method="post">
                    <input type="hidden" name="action" value="setup-metaobjects" />
                    <Button
                      submit
                      primary
                      loading={isSetupLoading}
                      disabled={isLoading}
                    >
                      {isSetupLoading ? 'Setting up...' : 'Run Metaobjects Setup'}
                    </Button>
                  </Form>
                )}

                {metaobjectStatus.allReady && (
                  <BlockStack gap="300">
                    <Text as="p" variant="bodyMd" tone="success">
                      ✅ All metaobject definitions are configured correctly.
                      Your app is ready to manage ingredients!
                    </Text>

                    <Form method="post">
                      <BlockStack gap="300">
                        <input type="hidden" name="action" value="create-sample-data" />
                        <input type="hidden" name="cleanFirst" value={cleanFirst ? 'true' : 'false'} />

                        <Checkbox
                          label="Delete existing ingredients first"
                          checked={cleanFirst}
                          onChange={setCleanFirst}
                          helpText="Recommended if you have empty or test data"
                        />

                        <Button
                          submit
                          loading={navigation.formData?.get('action') === 'create-sample-data'}
                          disabled={isLoading}
                        >
                          {navigation.formData?.get('action') === 'create-sample-data'
                            ? 'Creating...'
                            : 'Create Sample Ingredients'}
                        </Button>
                      </BlockStack>
                    </Form>
                  </BlockStack>
                )}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section secondary>
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                What does setup do?
              </Text>

              <Text as="p" variant="bodyMd">
                The setup process creates three custom data structures in your Shopify store:
              </Text>

              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  <strong>Ingredient:</strong> Stores food ingredient data including name,
                  category, supplier, cost per unit, allergens, and activity status.
                </Text>

                <Text as="p" variant="bodyMd">
                  <strong>Packaging:</strong> Manages product packaging options with
                  unit counts and costs for bulk purchasing.
                </Text>

                <Text as="p" variant="bodyMd">
                  <strong>Price History:</strong> Tracks historical price changes for
                  ingredients with timestamps and change reasons.
                </Text>
              </BlockStack>

              <Divider />

              <Text as="h4" variant="headingSm">
                App Features
              </Text>

              <Text as="p" variant="bodyMd">
                Once setup is complete, you can:
              </Text>

              <ul style={{ marginLeft: '20px' }}>
                <li>Create and manage ingredients</li>
                <li>Track ingredient costs and price changes</li>
                <li>Manage packaging options</li>
                <li>Search and filter ingredients</li>
                <li>Export ingredient data</li>
                <li>View detailed price history</li>
              </ul>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section secondary>
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Troubleshooting
              </Text>

              <Text as="p" variant="bodyMd">
                If you encounter issues:
              </Text>

              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  <strong>Setup fails:</strong> Ensure your app has the required permissions
                  (write_metaobjects, read_metaobjects) in the Partner Dashboard.
                </Text>

                <Text as="p" variant="bodyMd">
                  <strong>Ingredients not saving:</strong> Run the setup again if any
                  metaobject definitions are missing.
                </Text>

                <Text as="p" variant="bodyMd">
                  <strong>Data not loading:</strong> Check that all three metaobject
                  definitions show "Ready" status above.
                </Text>
              </BlockStack>

              <Text as="p" variant="bodyMd">
                For additional support, check the browser console for detailed error messages.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}