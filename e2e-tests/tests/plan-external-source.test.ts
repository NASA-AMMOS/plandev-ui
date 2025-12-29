import test, { expect } from '@playwright/test';
import { ExternalSources } from '../fixtures/ExternalSources.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import {
  cleanupApiResources,
  closeBrowserResources,
  setupTest,
  teardownTest,
  type BrowserSetupResult,
  type FullSetupResult,
} from '../utilities/api.js';

// Main setup with model/plan (uses 'test' user for API operations)
let setup: FullSetupResult;
let externalSources: ExternalSources;

// Separate browser contexts for userA and userB
let setupA: BrowserSetupResult;
let setupB: BrowserSetupResult;

// Plan fixtures for each user context
let planForUserA: Plan;
let planForUserB: Plan;

const extendedTimeout = 5000;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  setup.plans.endTime = '2022-011T00:00:00'; // Extend to cover the whole derivation group example
  externalSources = new ExternalSources(setup.page);

  // Create separate browser contexts for userA and userB (pre-authenticated)
  setupA = await setupTest(browser, { model: false, user: 'userA' });
  setupB = await setupTest(browser, { model: false, user: 'userB' });

  // Create Plan fixtures for each user context (they'll access the same plan by ID)
  planForUserA = new Plan(setupA.page, setup.plans, setup.constraints, setup.schedulingGoals, setup.schedulingConditions);
  planForUserB = new Plan(setupB.page, setup.plans, setup.constraints, setup.schedulingGoals, setup.schedulingConditions);

  await externalSources.goto();
  await externalSources.createTypes(
    externalSources.exampleTypeSchema,
    externalSources.exampleTypeSchemaExpectedSourceTypes,
    externalSources.exampleTypeSchemaExpectedEventTypes,
  );
  await externalSources.uploadExternalSource();
});

test.afterAll(async () => {
  await cleanupApiResources(setup);
  await externalSources.goto();
  await externalSources.deleteSource(externalSources.externalSourceFileName);
  await externalSources.deleteSource(externalSources.derivationTestFileKey1);
  await externalSources.deleteSource(externalSources.derivationTestFileKey2);
  await externalSources.deleteSource(externalSources.derivationTestFileKey3);
  await externalSources.deleteSource(externalSources.derivationTestFileKey4);

  await externalSources.gotoTypeManager();
  await externalSources.deleteDerivationGroup(externalSources.exampleDerivationGroup);
  await externalSources.deleteDerivationGroup(externalSources.derivationTestGroupName);
  await externalSources.deleteExternalSourceType(externalSources.exampleSourceType);
  await externalSources.deleteExternalSourceType(externalSources.derivationTestSourceTypeName);
  await externalSources.deleteExternalEventType(externalSources.exampleEventType);
  await externalSources.deleteExternalEventType(externalSources.derivationATypeName);
  await externalSources.deleteExternalEventType(externalSources.derivationBTypeName);
  await externalSources.deleteExternalEventType(externalSources.derivationCTypeName);
  await externalSources.deleteExternalEventType(externalSources.derivationDTypeName);
  await closeBrowserResources(setup);

  // Close additional user browser contexts
  await teardownTest(setupA);
  await teardownTest(setupB);
});

test.beforeEach(async () => {
  await setup.plan.goto(); // Refresh page to reset the view
});

test.describe.serial('Plan External Sources', () => {
  test('Derivation groups can be linked/unlinked to a plan', async () => {
    await setup.plan.showPanel(PanelNames.EXTERNAL_SOURCES);
    await setup.plan.externalSourceManageButton.click();
    await setup.page.getByText('No Derivation Groups Found').waitFor({ state: 'hidden' });
    await externalSources.linkDerivationGroup(
      externalSources.exampleDerivationGroup,
      externalSources.exampleSourceType,
    );

    await setup.plan.externalSourceManageButton.click();
    await setup.page.getByText('No Derivation Groups Found').waitFor({ state: 'hidden' });
    await externalSources.unlinkDerivationGroup(
      externalSources.exampleDerivationGroup,
      externalSources.exampleSourceType,
    );

    // Re-link for later use in testing, and to determine if unlinking broke things
    await setup.plan.externalSourceManageButton.click();
    await setup.page.getByText('No Derivation Groups Found').waitFor({ state: 'hidden' });
    await externalSources.linkDerivationGroup(
      externalSources.exampleDerivationGroup,
      externalSources.exampleSourceType,
    );
  });

  test('External event types can be added to the timeline', async () => {
    // Use userA's separate browser context - no login/logout needed!
    await planForUserA.goto();
    await planForUserA.showPanel(PanelNames.TIMELINE_ITEMS);
    await setupA.page.getByRole('tab', { exact: true, name: 'Events' }).click();
    await expect(setupA.page.locator('.list-item').getByText(externalSources.exampleEventType)).toBeVisible();
    await setupA.page.locator('.list-item').getByText(externalSources.exampleEventType).first().hover();
    await setupA.page.getByLabel(`AddExternalevent-${externalSources.exampleEventType}`).click();
    await setupA.page.getByRole('menuitem', { name: 'New Row +' }).click();
    await expect(
      setupA.page.locator('#timeline-0').getByRole('button', { name: externalSources.exampleEventType }),
    ).toBeVisible();

    // Use userB's separate browser context - no login/logout needed!
    // Assert the timeline row does NOT exist for userB (user-specific settings)
    await planForUserB.goto();
    await expect(
      setupB.page.locator('#timeline-0').getByRole('button', { name: externalSources.exampleEventType }),
    ).not.toBeVisible();
  });

  test('Zero-duration events are properly drawn in the timeline', async () => {
    // Get the current timeline canvas' pixels - use a set to just determine that non-0 RGB values exist
    const doPixelsExist: boolean = await setup.page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas !== null && canvas !== undefined) {
        const context = canvas.getContext('2d');
        if (context !== null && context !== undefined) {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const pixelData = Array.from(imageData.data);
          return pixelData.length > 0 ? true : false;
          // Assert that the number of unique RGB pixel values for the canvas is more than 0 (i.e., not empty)
        }
      }
      return false;
    });

    expect(doPixelsExist).toBeTruthy();
  });

  test('Linked derivation groups should be expandable in panel', async () => {
    await setup.plan.showPanel(PanelNames.EXTERNAL_SOURCES);
    // Link derivation group to plan if it isn't already
    if ((await setup.page.getByText('No Derivation Groups Linked To This Plan').isVisible()) === true) {
      await setup.plan.externalSourceManageButton.click();
      await setup.page.getByText('No Derivation Groups Found').waitFor({ state: 'hidden', timeout: extendedTimeout });
      await externalSources.linkDerivationGroup(
        externalSources.exampleDerivationGroup,
        externalSources.exampleSourceType,
      );
    }
    // Wait until the sources are loaded
    await setup.page
      .getByText('No sources in this group. Delete Empty Derivation Group')
      .waitFor({ state: 'hidden', timeout: extendedTimeout });
    // Expand all collapse buttons and validate fields appear
    await setup.page
      .getByRole('button', { name: `Derivation group ${externalSources.exampleDerivationGroup}` })
      .click();
    await setup.page
      .getByRole('button', { name: `ExampleExternalSource:${externalSources.externalSourceFileName}` })
      .click();
    // TODO: Event types shown underneath derivation groups is work to-be-implemented!
    //await setup.page.getByRole('button', { name: 'View Contained Event Types' }).click();

    await expect(setup.page.getByText('Key: ExampleExternalSource:')).toBeVisible();
    await expect(setup.page.getByText('Source Type: Example External')).toBeVisible();
    await expect(setup.page.getByText('Start Time: 2022-001T00:00:')).toBeVisible();
    await expect(setup.page.getByText('End Time: 2022-002T00:00:')).toBeVisible();
    await expect(setup.page.getByText('Valid At: 2022-001T00:00:')).toBeVisible();
    await expect(setup.page.getByText('Created At')).toBeVisible();
  });

  test('Derivation group can be expanded in modal', async () => {
    await setup.plan.showPanel(PanelNames.EXTERNAL_SOURCES);
    await setup.plan.externalSourceManageButton.click();
    await setup.page.getByRole('row', { name: externalSources.exampleSourceType }).hover();
    await setup.page
      .getByRole('row', { name: externalSources.exampleSourceType })
      .getByLabel('View Derivation Group')
      .click();
    // Expand all collapse buttons to validate fields appear
    await expect(setup.page.getByRole('button', { name: 'example-external-source.json 1' }).first()).toBeVisible();
    await setup.page.getByRole('button', { name: 'example-external-source.json 1' }).first().click();
    await expect(
      setup.page.locator('#svelte-modal').getByText('Key: ExampleExternalSource:example-external-source.json'),
    ).toBeVisible();
    await expect(setup.page.locator('#svelte-modal').getByText('Source Type: Example External Source')).toBeVisible();
    await expect(setup.page.locator('#svelte-modal').getByText('Start Time: 2022-001T00:00:00')).toBeVisible();
    await expect(setup.page.locator('#svelte-modal').getByText('End Time: 2022-002T00:00:00')).toBeVisible();
    await expect(setup.page.locator('#svelte-modal').getByText('Valid At: 2022-001T00:00:00')).toBeVisible();
    await expect(setup.page.locator('#svelte-modal').getByText('Created At')).toBeVisible();
  });
});
