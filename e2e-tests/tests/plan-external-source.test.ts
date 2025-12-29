import test, { expect } from '@playwright/test';
import { ExternalSources } from '../fixtures/ExternalSources.js';
import { PanelNames } from '../fixtures/Plan.js';
import { User } from '../fixtures/User.js';
import { cleanupApiResources, closeBrowserResources, setupTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;
let externalSources: ExternalSources;
let userA: User;
let userB: User;
const extendedTimeout = 5000;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  setup.plans.endTime = '2022-011T00:00:00'; // Extend to cover the whole derivation group example
  externalSources = new ExternalSources(setup.page);

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

  test('External event types can be added to the timeline', async ({ baseURL }) => {
    /// Setup test users
    await setup.models.goto();
    userA = new User(setup.page, 'userA');
    userB = new User(setup.page, 'userB');

    await userB.logout(baseURL);
    await userA.login(baseURL);

    await setup.plan.goto();
    await setup.plan.showPanel(PanelNames.TIMELINE_ITEMS);
    await setup.page.getByRole('tab', { exact: true, name: 'Events' }).click();
    await expect(setup.page.locator('.list-item').getByText(externalSources.exampleEventType)).toBeVisible();
    await setup.page.locator('.list-item').getByText(externalSources.exampleEventType).first().hover();
    await setup.page.getByLabel(`AddExternalevent-${externalSources.exampleEventType}`).click();
    await setup.page.getByRole('menuitem', { name: 'New Row +' }).click();
    await expect(
      setup.page.locator('#timeline-0').getByRole('button', { name: externalSources.exampleEventType }),
    ).toBeVisible();

    // Logout and switch to userB, assert the row does NOT exist anymore
    await userA.logout(baseURL);
    await userB.login(baseURL);
    await setup.plan.goto();
    await expect(
      setup.page.locator('#timeline-0').getByRole('button', { name: externalSources.exampleEventType }),
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
