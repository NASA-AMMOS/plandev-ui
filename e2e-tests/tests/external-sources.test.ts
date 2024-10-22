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
  await page.close();
  await context.close();
});

test.beforeEach(async () => {
  await externalSources.goto(); // Refresh page to reset the view
});

test.describe.serial('External Sources', () => {
  test('Uploading an external source', async () => {
    await externalSources.uploadExternalSource();
    await expect(
      externalSources.externalSourcesTable.getByRole('gridcell', {
        name: 'ExampleExternalSource:example',
      }),
    ).toBeVisible();
  });

  test('Upload button should be enabled after entering a filepath', async () => {
    await externalSources.fillInputFile(externalSources.externalSourceFilePath);
    await expect(externalSources.uploadButton).toBeVisible();
  });

  test('External event form should be shown when an event is selected', async () => {
    await externalSources.selectEvent('ExampleEvent:1/sc/sc1:1');
    await expect(externalSources.inputFile).not.toBeVisible();
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

  // TODO: Metadata will be implemented in a future batch of work!
  // test('Selected external source should show metadata in a collapsible', async () => {
  //   await externalSources.selectSource();
  //   await externalSources.viewEventSourceMetadata.click();
  //   await expect(page.getByText('0', { exact: true })).toBeVisible();
  //   await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
  //   await expect(page.getByText('version')).toBeVisible();
  // });

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

  test('Deleting an external source', async () => {
    await externalSources.deleteSource(externalSources.externalSourceFileName);
    await expect(page.getByText('External Source Deleted')).toBeVisible();
    await expect(externalSources.inputFile).toBeVisible();
    await expect(externalSources.externalEventSelectedForm).not.toBeVisible();
    await expect(externalSources.externalSourceSelectedForm).not.toBeVisible();
  });
});

test.describe.serial('External Source Error Handling', () => {
  test('Duplicate keys is handled gracefully', async () => {
    await externalSources.uploadExternalSource();
    await externalSources.deselectSourceButton.click();
    await externalSources.uploadExternalSource();
    await expect(page.getByLabel('Uniqueness violation.')).toBeVisible();
    await expect(page.getByText('External Source Create Failed')).toBeVisible();
    await expect(page.getByRole('gridcell', { name: externalSources.externalSourceFileName })).toHaveCount(1);
    await externalSources.deleteSource(externalSources.externalSourceFileName);
    await expect(page.getByText('External Source Deleted')).toBeVisible();
  });

  test("Invalid 'source' field is handled gracefully", async () => {
    await externalSources.fillInputFile(externalSources.externalSourceFilePathMissingField);
    await expect(page.getByLabel('External Source has Invalid')).toBeVisible();
  });

  test('Syntax error is handled gracefully', async () => {
    await externalSources.fillInputFile(externalSources.externalSourceFilePathSyntaxError);
    await expect(page.getByLabel('External Source has Invalid Format')).toBeVisible();
  });
});
