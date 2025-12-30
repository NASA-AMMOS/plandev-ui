import test, { expect } from '@playwright/test';
import { ExternalSources } from '../fixtures/ExternalSources';
import { cleanupApiResources, closeBrowserResources, setupTest, type ModelSetupResult } from '../utilities/api.js';

let setup: ModelSetupResult;
let externalSources: ExternalSources;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser, { plan: false });
  externalSources = new ExternalSources(setup.page);
  await externalSources.goto();
});

test.afterAll(async () => {
  await cleanupApiResources(setup);

  // Use API for faster cleanup of external sources artifacts
  // Order matters: sources -> derivation groups -> source types -> event types
  try {
    // Delete sources (grouped by derivation group)
    await setup.api.deleteExternalSources(externalSources.exampleDerivationGroup, [externalSources.externalSourceKey]);
    await setup.api.deleteExternalSources(externalSources.exampleEmptyDerivationGroup, [
      externalSources.externalSourceEmptyAttributeKey,
    ]);
    await setup.api.deleteExternalSources(externalSources.noAttrDerivationGroup, [
      externalSources.externalSourceNoAttributeKey,
    ]);

    // Delete derivation groups
    await setup.api.deleteDerivationGroups([
      externalSources.exampleDerivationGroup,
      externalSources.exampleEmptyDerivationGroup,
      externalSources.noAttrDerivationGroup,
    ]);

    // Delete source types
    await setup.api.deleteExternalSourceTypes([
      externalSources.exampleSourceType,
      externalSources.exampleEmptySourceType,
      externalSources.noAttrSourceType,
    ]);

    // Delete event types
    await setup.api.deleteExternalEventTypes([
      externalSources.exampleEventType,
      externalSources.exampleEmptyEventType,
      externalSources.noAttrEventType,
    ]);
  } catch {
    // Ignore cleanup errors - resources may not exist or have dependencies
  }

  await closeBrowserResources(setup);
});

test.beforeEach(async () => {
  await externalSources.goto(); // Refresh page to reset the view
});

test.describe.serial('External Sources', () => {
  test('Uploading an external source', async () => {
    await externalSources.createTypes(
      externalSources.exampleTypeSchema,
      externalSources.exampleTypeSchemaExpectedSourceTypes,
      externalSources.exampleTypeSchemaExpectedEventTypes,
    );
    await externalSources.uploadExternalSource();
  });

  test('External event form should be shown when an event is selected', async () => {
    await externalSources.selectEvent('ExampleEvent:1/sc/sc1:1');
    await expect(externalSources.inputFile).not.toBeVisible();
  });

  test('Optional argument should be marked in external event form', async () => {
    await externalSources.selectEvent('ExampleEvent:1/sc/sc1:1');
    await setup.page.click('text="Attributes"');
    const parameter = setup.page.locator('.parameter').filter({ hasText: 'optional' }).first();
    await parameter.hover();
    const parameterInfo = parameter.getByRole('contentinfo');
    await parameterInfo.hover();
    await expect(
      setup.page.getByRole('contentinfo').locator('div').filter({ hasText: 'Required false' }).first(),
    ).toBeVisible();
  });

  test('External source form should be shown when a source is selected', async () => {
    await externalSources.selectSource();
    await expect(setup.page.locator('.external-source-header-title-value')).toBeVisible();
    await expect(externalSources.externalEventSelectedForm).not.toBeVisible();
    await expect(externalSources.inputFile).not.toBeVisible();
  });

  test('External source deselection should be shown when an event is selected', async () => {
    await externalSources.selectSource();
    await expect(setup.page.getByLabel('Deselect source')).toBeVisible();
  });

  test('External event deselection should be shown when a source is selected', async () => {
    await externalSources.selectEvent('ExampleEvent:1/sc/sc1:1');
    await expect(setup.page.getByLabel('Deselect event')).toBeVisible();
  });

  test('External source upload form should be shown when no source or event is selected and no source has been set to upload', async () => {
    await expect(externalSources.inputFile).toBeVisible();
    await expect(externalSources.externalEventSelectedForm).not.toBeVisible();
    await expect(externalSources.externalSourceSelectedForm).not.toBeVisible();
  });

  test('Selected external source should show event types in a collapsible', async () => {
    await externalSources.selectSource();
    await externalSources.viewContainedEventTypes.click();
    await expect(setup.page.locator('div').filter({ hasText: 'ExampleEvent' }).first()).toBeVisible();
  });

  test('External event table should be accessible while a source is selected', async () => {
    await externalSources.selectSource();
    await expect(externalSources.externalEventTableHeaderEventType).toBeVisible();
    await expect(externalSources.externalEventTableHeaderDuration).toBeVisible();
  });

  test('Upload external source with empty attributes', async () => {
    await externalSources.uploadExternalSource(externalSources.externalSourceEmptyAttributeFilePath, false);
    await externalSources.gotoTypeManager();

    const externalSourceTypeTable = externalSources.page.locator('.external-source-type-table');
    const externalEventTypeTable = externalSources.page.locator('.external-event-type-table');

    const sourceType = externalSourceTypeTable.getByRole('gridcell').filter({ hasText: 'Empty External Source' });
    await sourceType.click();
    await expect(externalSources.page.locator('text="Attribute Schema - Properties"')).toBeVisible();
    const sourceTypeAttributes = externalSources.page.locator('text="Attribute Schema - Properties"');
    await sourceTypeAttributes.click();
    await expect(externalSources.page.locator('.parameter')).toHaveCount(0);
    const eventType = externalEventTypeTable.getByRole('gridcell').filter({ hasText: 'EmptyEvent' });
    await eventType.click();
    await expect(externalSources.page.locator('text="Attribute Schema - Properties"')).toBeVisible();
    const eventTypeAttributes = externalSources.page.locator('text="Attribute Schema - Properties"');
    await eventTypeAttributes.click();
    await expect(externalSources.page.locator('.parameter')).toHaveCount(0);

    await externalSources.goto();
  });

  test('Upload external source with no attributes field', async () => {
    await externalSources.uploadExternalSource(externalSources.externalSourceNoAttributeFilePath, false);

    await externalSources.gotoTypeManager();

    const externalSourceTypeTable = externalSources.page.locator('.external-source-type-table');
    const externalEventTypeTable = externalSources.page.locator('.external-event-type-table');

    const sourceType = externalSourceTypeTable.getByRole('gridcell').filter({ hasText: 'NoAttrSource' });
    await sourceType.click();
    await expect(externalSources.page.locator('text="Attribute Schema - Properties"')).toBeVisible();
    const sourceTypeAttributes = externalSources.page.locator('text="Attribute Schema - Properties"');
    await sourceTypeAttributes.click();
    await expect(externalSources.page.locator('.parameter')).toHaveCount(0);
    const eventType = externalEventTypeTable.getByRole('gridcell').filter({ hasText: 'NoAttrEvent' });
    await eventType.click();
    await expect(externalSources.page.locator('text="Attribute Schema - Properties"')).toBeVisible();
    const eventTypeAttributes = externalSources.page.locator('text="Attribute Schema - Properties"');
    await eventTypeAttributes.click();
    await expect(externalSources.page.locator('.parameter')).toHaveCount(0);

    await externalSources.goto();
  });

  test('Deleting all external sources', async () => {
    await expect(externalSources.externalSourcesTable).toBeVisible();
    await externalSources.deleteSource(externalSources.externalSourceFileName);
    await externalSources.deleteSource(externalSources.externalSourceNoAttributeKey);
    await externalSources.deleteSource(externalSources.externalSourceEmptyAttributeKey);
    await expect(setup.page.getByText('External Source Deleted Successfully')).toBeVisible();
    await expect(externalSources.inputFile).toBeVisible();
    await expect(externalSources.externalEventSelectedForm).not.toBeVisible();
    await expect(externalSources.externalSourceSelectedForm).not.toBeVisible();
    await externalSources.gotoTypeManager();
    await externalSources.deleteDerivationGroup(externalSources.exampleDerivationGroup);
    await externalSources.deleteDerivationGroup(externalSources.exampleEmptyDerivationGroup);
    await externalSources.deleteExternalSourceType(externalSources.exampleSourceType);
    await externalSources.deleteExternalSourceType(externalSources.exampleEmptySourceType);
    await externalSources.deleteExternalEventType(externalSources.exampleEventType);
    await externalSources.deleteExternalEventType(externalSources.exampleEmptyEventType);
  });
});

test.describe.serial('External Source Error Handling', () => {
  test('Duplicate keys is handled gracefully', async () => {
    await externalSources.createTypes(
      externalSources.exampleTypeSchema,
      externalSources.exampleTypeSchemaExpectedSourceTypes,
      externalSources.exampleTypeSchemaExpectedEventTypes,
    );
    await externalSources.uploadExternalSource(externalSources.externalSourceFilePath, true);
    await expect(externalSources.externalSourcesTable).toBeVisible();
    await expect(
      externalSources.externalSourcesTable.getByRole('gridcell', { name: externalSources.externalSourceFileName }),
    ).toBeVisible();
    await externalSources.uploadExternalSource(externalSources.externalSourceFilePath, false, false);
    await expect(setup.page.getByLabel('Uniqueness violation.')).toBeVisible({ timeout: 10000 });
    await externalSources.waitForToast('External Source Create Failed');
    await expect(setup.page.getByRole('gridcell', { name: externalSources.externalSourceFileName })).toHaveCount(1);
    await externalSources.deleteSource(externalSources.externalSourceFileName);
    await expect(setup.page.getByText('External Source Deleted Successfully')).toBeVisible();
  });
});
