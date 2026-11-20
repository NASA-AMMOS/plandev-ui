import test, { expect } from '@playwright/test';
import { ExternalSources } from '../fixtures/ExternalSources';
import { cleanupApiResources, closeBrowserResources, setupTest, type ModelSetupResult } from '../utilities/api.js';
import {
  buildExternalSourceFixture,
  cleanupExternalSourceFixtures,
  EMPTY_ATTR_SOURCE_FILE,
  EXAMPLE_SCHEMA_FILE,
  EXAMPLE_SOURCE_FILE,
  NO_ATTR_SOURCE_FILE,
  seedExternalSourceFixture,
  sourceUploadFile,
  type ExternalSourceFixture,
} from '../utilities/external-sources.js';

let setup: ModelSetupResult;
let externalSources: ExternalSources;

// Each fixture is a fresh namespace of source/event types, derivation group and source, built per
// setup execution. `example`, `emptyAttr` and `noAttr` are uploaded and deleted through the UI by the
// tests below; `duplicate` is seeded through the API as the prerequisite for the duplicate-key test.
let example: ExternalSourceFixture;
let emptyAttr: ExternalSourceFixture;
let noAttr: ExternalSourceFixture;
let duplicate: ExternalSourceFixture;

test.beforeAll(async ({ browser }) => {
  example = buildExternalSourceFixture(EXAMPLE_SOURCE_FILE, EXAMPLE_SCHEMA_FILE);
  emptyAttr = buildExternalSourceFixture(EMPTY_ATTR_SOURCE_FILE);
  noAttr = buildExternalSourceFixture(NO_ATTR_SOURCE_FILE);
  duplicate = buildExternalSourceFixture(EXAMPLE_SOURCE_FILE, EXAMPLE_SCHEMA_FILE);

  setup = await setupTest(browser, { plan: false });
  externalSources = new ExternalSources(setup.page);
  await externalSources.goto();
});

test.afterAll(async () => {
  await cleanupApiResources(setup);
  try {
    // Only this file's own records; anything the UI tests already deleted is a no-op.
    await cleanupExternalSourceFixtures(setup.api, [example, emptyAttr, noAttr, duplicate]);
  } finally {
    await closeBrowserResources(setup);
  }
});

const exampleEventKey = () => example.sourceJson.events[0].key;

test.beforeEach(async () => {
  await externalSources.goto(); // Refresh page to reset the view
});

test.describe.serial('External Sources', () => {
  test('Uploading an external source', async () => {
    await externalSources.createTypes(example);
    await externalSources.uploadExternalSource(sourceUploadFile(example));
  });

  test('External event form should be shown when an event is selected', async () => {
    await externalSources.selectEvent(exampleEventKey(), example.sourceKey);
    await expect(externalSources.inputFile).not.toBeVisible();
  });

  test('Optional argument should be marked in external event form', async () => {
    await externalSources.selectEvent(exampleEventKey(), example.sourceKey);
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
    await externalSources.selectSource(example.sourceKey);
    await expect(setup.page.locator('.external-source-header-title-value')).toBeVisible();
    await expect(externalSources.externalEventSelectedForm).not.toBeVisible();
    await expect(externalSources.inputFile).not.toBeVisible();
  });

  test('External source deselection should be shown when an event is selected', async () => {
    await externalSources.selectSource(example.sourceKey);
    await expect(setup.page.getByLabel('Deselect source')).toBeVisible();
  });

  test('External event deselection should be shown when a source is selected', async () => {
    await externalSources.selectEvent(exampleEventKey(), example.sourceKey);
    await expect(setup.page.getByLabel('Deselect event')).toBeVisible();
  });

  test('External source upload form should be shown when no source or event is selected and no source has been set to upload', async () => {
    await expect(externalSources.inputFile).toBeVisible();
    await expect(externalSources.externalEventSelectedForm).not.toBeVisible();
    await expect(externalSources.externalSourceSelectedForm).not.toBeVisible();
  });

  test('Selected external source should show event types in a collapsible', async () => {
    await externalSources.selectSource(example.sourceKey);
    await externalSources.viewContainedEventTypes.click();
    await expect(setup.page.locator('div').filter({ hasText: example.eventTypes[0] }).first()).toBeVisible();
  });

  test('External event table should be accessible while a source is selected', async () => {
    await externalSources.selectSource(example.sourceKey);
    await expect(externalSources.externalEventTableHeaderEventType).toBeVisible();
    await expect(externalSources.externalEventTableHeaderDuration).toBeVisible();
  });

  test('Upload external source with empty attributes', async () => {
    await externalSources.uploadExternalSource(sourceUploadFile(emptyAttr));
    await externalSources.gotoTypeManager();

    const externalSourceTypeTable = externalSources.page.locator('.external-source-type-table');
    const externalEventTypeTable = externalSources.page.locator('.external-event-type-table');

    const sourceType = externalSourceTypeTable.getByRole('gridcell').filter({ hasText: emptyAttr.sourceType });
    await sourceType.click();
    await expect(externalSources.page.locator('text="Attribute Schema - Properties"')).toBeVisible();
    const sourceTypeAttributes = externalSources.page.locator('text="Attribute Schema - Properties"');
    await sourceTypeAttributes.click();
    await expect(externalSources.page.locator('.parameter')).toHaveCount(0);
    const eventType = externalEventTypeTable.getByRole('gridcell').filter({ hasText: emptyAttr.eventTypes[0] });
    await eventType.click();
    await expect(externalSources.page.locator('text="Attribute Schema - Properties"')).toBeVisible();
    const eventTypeAttributes = externalSources.page.locator('text="Attribute Schema - Properties"');
    await eventTypeAttributes.click();
    await expect(externalSources.page.locator('.parameter')).toHaveCount(0);

    await externalSources.goto();
  });

  test('Upload external source with no attributes field', async () => {
    await externalSources.uploadExternalSource(sourceUploadFile(noAttr));

    await externalSources.gotoTypeManager();

    const externalSourceTypeTable = externalSources.page.locator('.external-source-type-table');
    const externalEventTypeTable = externalSources.page.locator('.external-event-type-table');

    const sourceType = externalSourceTypeTable.getByRole('gridcell').filter({ hasText: noAttr.sourceType });
    await sourceType.click();
    await expect(externalSources.page.locator('text="Attribute Schema - Properties"')).toBeVisible();
    const sourceTypeAttributes = externalSources.page.locator('text="Attribute Schema - Properties"');
    await sourceTypeAttributes.click();
    await expect(externalSources.page.locator('.parameter')).toHaveCount(0);
    const eventType = externalEventTypeTable.getByRole('gridcell').filter({ hasText: noAttr.eventTypes[0] });
    await eventType.click();
    await expect(externalSources.page.locator('text="Attribute Schema - Properties"')).toBeVisible();
    const eventTypeAttributes = externalSources.page.locator('text="Attribute Schema - Properties"');
    await eventTypeAttributes.click();
    await expect(externalSources.page.locator('.parameter')).toHaveCount(0);

    await externalSources.goto();
  });

  test('Deleting all external sources', async () => {
    await expect(externalSources.externalSourcesTable).toBeVisible();
    await externalSources.deleteSource(example.sourceKey);
    await externalSources.deleteSource(noAttr.sourceKey);
    await externalSources.deleteSource(emptyAttr.sourceKey);
    // deleteSource waits for each source's row to disappear, so deletion is already confirmed. Don't
    // assert the "Deleted Successfully" toast here — it's fired per-delete and auto-dismisses, so by
    // this point (after three deletes) it's gone. The state assertions below verify the empty state.
    await expect(externalSources.inputFile).toBeVisible();
    await expect(externalSources.externalEventSelectedForm).not.toBeVisible();
    await expect(externalSources.externalSourceSelectedForm).not.toBeVisible();
    await externalSources.gotoTypeManager();
    const fixtures = [example, emptyAttr, noAttr];
    for (const { derivationGroup } of fixtures) {
      await externalSources.deleteDerivationGroup(derivationGroup);
    }
    for (const { sourceType } of fixtures) {
      await externalSources.deleteExternalSourceType(sourceType);
    }
    for (const { eventTypes } of fixtures) {
      for (const eventType of eventTypes) {
        await externalSources.deleteExternalEventType(eventType);
      }
    }
  });
});

test.describe.serial('External Source Error Handling', () => {
  test.beforeAll(async () => {
    await seedExternalSourceFixture(setup.api, duplicate);
  });

  test('Duplicate keys are handled gracefully', async () => {
    // The source already exists (seeded above), so uploading the same key again must fail.
    await externalSources.uploadExternalSource(sourceUploadFile(duplicate), false);
    await expect(setup.page.getByLabel('Uniqueness violation.')).toBeVisible({ timeout: 10000 });
    await externalSources.waitForToast('External Source Create Failed');
    await expect(setup.page.getByRole('gridcell', { name: duplicate.fileName })).toHaveCount(1);
  });
});
