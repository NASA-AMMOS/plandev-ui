import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { ExternalSources } from '../fixtures/ExternalSources';

let page: Page;
let context: BrowserContext;
let externalSources: ExternalSources;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
  externalSources = new ExternalSources(page);
  await externalSources.goto();
});

test.afterAll(async () => {
  await externalSources.goto();
  await externalSources.deleteSource(externalSources.externalSourceFileName);
  await externalSources.gotoTypeManager();
  await externalSources.deleteDerivationGroup(externalSources.exampleDerivationGroup);
  await externalSources.deleteExternalSourceType(externalSources.exampleSourceType);
  await externalSources.deleteExternalEventType(externalSources.exampleEventType);
  await page.close();
  await context.close();
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
    await page.click('text="Attributes"');
    const parameter = page.locator('.parameter').filter({ hasText: 'optional' }).first();
    parameter.hover();
    const parameterInfo = parameter.getByRole('contentinfo');
    await parameterInfo.hover();
    await expect(
      page.getByRole('contentinfo').locator('div').filter({ hasText: 'Required false' }).first(),
    ).toBeVisible();
  });

  test('External source form should be shown when a source is selected', async () => {
    await externalSources.selectSource();
    await expect(page.locator('.external-source-header-title-value')).toBeVisible();
    await expect(externalSources.externalEventSelectedForm).not.toBeVisible();
    await expect(externalSources.inputFile).not.toBeVisible();
  });

  test('External source deselection should be shown when an event is selected', async () => {
    await externalSources.selectSource();
    await expect(page.getByLabel('Deselect source')).toBeVisible();
  });

  test('External event deselection should be shown when a source is selected', async () => {
    await externalSources.selectEvent('ExampleEvent:1/sc/sc1:1');
    await expect(page.getByLabel('Deselect event')).toBeVisible();
  });

  test('External source upload form should be shown when no source or event is selected and no source has been set to upload', async () => {
    await expect(externalSources.inputFile).toBeVisible();
    await expect(externalSources.externalEventSelectedForm).not.toBeVisible();
    await expect(externalSources.externalSourceSelectedForm).not.toBeVisible();
  });

  test('Selected external source should show event types in a collapsible', async () => {
    await externalSources.selectSource();
    await externalSources.viewContainedEventTypes.click();
    await expect(page.locator('div').filter({ hasText: 'ExampleEvent' }).first()).toBeVisible();
  });

  test('External event table should be accessible while a source is selected', async () => {
    await externalSources.selectSource();
    await expect(externalSources.externalEventTableHeaderEventType).toBeVisible();
    await expect(externalSources.externalEventTableHeaderDuration).toBeVisible();
  });

  test('Upload external source with empty attributes', async () => {
    await externalSources.uploadExternalSource(externalSources.externalSourceEmptyAttributeFilePath, false);
    await externalSources.gotoTypeManager();

    const externalSourceTypeTable = await externalSources.page.locator('.external-source-type-table');
    const externalEventTypeTable = await externalSources.page.locator('.external-event-type-table');

    const sourceType = await externalSourceTypeTable.getByRole('gridcell').filter({ hasText: 'Empty External Source' });
    await sourceType.click();
    await expect(page.locator('text="Attribute Schema - Properties"')).toBeVisible();
    const sourceTypeAttributes = await page.locator('text="Attribute Schema - Properties"');
    await sourceTypeAttributes.click();
    await expect(page.locator('.parameter')).toHaveCount(0);
    const eventType = await externalEventTypeTable.getByRole('gridcell').filter({ hasText: 'EmptyEvent' });
    await eventType.click();
    await expect(page.locator('text="Attribute Schema - Properties"')).toBeVisible();
    const eventTypeAttributes = await page.locator('text="Attribute Schema - Properties"');
    await eventTypeAttributes.click();
    await expect(page.locator('.parameter')).toHaveCount(0);

    await externalSources.goto();
  });

  test('Upload external source with no attributes field', async () => {
    await externalSources.uploadExternalSource(externalSources.externalSourceNoAttributeFilePath, false);

    await externalSources.gotoTypeManager();

    const externalSourceTypeTable = await externalSources.page.locator('.external-source-type-table');
    const externalEventTypeTable = await externalSources.page.locator('.external-event-type-table');

    const sourceType = await externalSourceTypeTable.getByRole('gridcell').filter({ hasText: 'NoAttrSource' });
    await sourceType.click();
    await expect(page.locator('text="Attribute Schema - Properties"')).toBeVisible();
    const sourceTypeAttributes = await page.locator('text="Attribute Schema - Properties"');
    await sourceTypeAttributes.click();
    await expect(page.locator('.parameter')).toHaveCount(0);
    const eventType = await externalEventTypeTable.getByRole('gridcell').filter({ hasText: 'NoAttrEvent' });
    await eventType.click();
    await expect(page.locator('text="Attribute Schema - Properties"')).toBeVisible();
    const eventTypeAttributes = await page.locator('text="Attribute Schema - Properties"');
    await eventTypeAttributes.click();
    await expect(page.locator('.parameter')).toHaveCount(0);

    await externalSources.goto();
  });

  test('Deleting all external sources', async () => {
    await expect(externalSources.externalSourcesTable).toBeVisible();
    await externalSources.deleteSource(externalSources.externalSourceFileName);
    await externalSources.deleteSource(externalSources.externalSourceNoAttributeKey);
    await externalSources.deleteSource(externalSources.externalSourceEmptyAttributeKey);
    await expect(page.getByText('External Source Deleted Successfully')).toBeVisible();
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
    await externalSources.uploadExternalSource(externalSources.externalSourceFilePath, false);
    await expect(page.getByLabel('Uniqueness violation.')).toBeVisible();
    await externalSources.waitForToast('External Source Create Failed');
    await expect(page.getByRole('gridcell', { name: externalSources.externalSourceFileName })).toHaveCount(1);
    await externalSources.deleteSource(externalSources.externalSourceFileName);
    await expect(page.getByText('External Source Deleted Successfully')).toBeVisible();
  });
});
