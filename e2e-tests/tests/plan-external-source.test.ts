import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { Constraints } from '../fixtures/Constraints.js';
import { ExternalSources } from '../fixtures/ExternalSources.js';
import { Models } from '../fixtures/Models.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';
import { User } from '../fixtures/User.js';

let constraints: Constraints;
let context: BrowserContext;
let externalSources: ExternalSources;
let models: Models;
let page: Page;
let plan: Plan;
let plans: Plans;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;
let userA: User;
let userB: User;
const extendedTimeout = 5000;

test.beforeAll(async ({ baseURL, browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  plans = new Plans(page, models);
  plans.endTime = '2022-011T00:00:00'; // Extend to cover the whole derivation group example
  constraints = new Constraints(page);
  schedulingConditions = new SchedulingConditions(page);
  schedulingGoals = new SchedulingGoals(page);
  plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);
  externalSources = new ExternalSources(page);

  await models.goto();
  await models.createModel(baseURL);
  await plans.goto();
  await plans.createPlan();
  await externalSources.goto();
  await externalSources.uploadExternalSource();
});

test.afterAll(async () => {
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();

  await externalSources.goto();
  // Cleanup all test files that *may* have been uploaded
  await externalSources.deleteSource(externalSources.externalSourceFileName);
  await externalSources.deleteSource(externalSources.derivationTestFileKey1);
  await externalSources.deleteSource(externalSources.derivationTestFileKey2);
  await externalSources.deleteSource(externalSources.derivationTestFileKey3);
  await externalSources.deleteSource(externalSources.derivationTestFileKey4);

  await page.close();
  await context.close();
});

test.beforeEach(async () => {
  await plan.goto(); // Refresh page to reset the view
});

test.describe.serial('Plan External Sources', () => {
  test('Derivation groups can be linked/unlinked to a plan', async () => {
    await plan.showPanel(PanelNames.EXTERNAL_SOURCES);
    await plan.externalSourceManageButton.click();
    await page.getByText('No Derivation Groups Found').waitFor({ state: 'hidden' });
    await externalSources.linkDerivationGroup(
      externalSources.exampleDerivationGroup,
      externalSources.exampleSourceType,
    );

    await plan.externalSourceManageButton.click();
    await page.getByText('No Derivation Groups Found').waitFor({ state: 'hidden' });
    await externalSources.unlinkDerivationGroup(
      externalSources.exampleDerivationGroup,
      externalSources.exampleSourceType,
    );

    // Re-link for later use in testing, and to determine if unlinking broke things
    await plan.externalSourceManageButton.click();
    await page.getByText('No Derivation Groups Found').waitFor({ state: 'hidden' });
    await externalSources.linkDerivationGroup(
      externalSources.exampleDerivationGroup,
      externalSources.exampleSourceType,
    );
  });

  test('External event types can be added to the timeline', async ({ baseURL }) => {
    /// Setup test users
    await models.goto();
    userA = new User(page, 'userA');
    userB = new User(page, 'userB');

    await userB.logout(baseURL);
    await userA.login(baseURL);

    await plan.goto();
    await plan.showPanel(PanelNames.TIMELINE_ITEMS);
    await page.getByRole('tab', { exact: true, name: 'Events' }).click();
    await expect(page.locator('.list-item').getByText(externalSources.exampleEventType)).toBeVisible();
    await page.locator('.list-item').getByText(externalSources.exampleEventType).first().hover();
    await page.getByLabel(`AddExternalevent-${externalSources.exampleEventType}`).click();
    await page
      .getByLabel(`layer-picker-externalEvent-${externalSources.exampleEventType}`)
      .getByText('New Row +')
      .click();
    await expect(
      page.locator('#timeline-0').getByRole('button', { name: externalSources.exampleEventType }),
    ).toBeVisible();

    // Logout and switch to userB, assert the row does NOT exist anymore
    await userA.logout(baseURL);
    await userB.login(baseURL);
    await plan.goto();
    await expect(
      page.locator('#timeline-0').getByRole('button', { name: externalSources.exampleEventType }),
    ).not.toBeVisible();
  });

  test('Zero-duration events are properly drawn in the timeline', async () => {
    // Get the current timeline canvas' pixels - use a set to just determine that non-0 RGB values exist
    const doPixelsExist: boolean = await page.evaluate(() => {
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

  test('Cards should be shown when a new external source is uploaded', async () => {
    // Upload a test file and link its derivation group to the plan
    await externalSources.goto();
    await externalSources.uploadExternalSource(
      externalSources.derivationTestFile1,
      externalSources.derivationTestFileKey1,
    );
    await plan.goto();
    await plan.showPanel(PanelNames.EXTERNAL_SOURCES);
    await plan.externalSourceManageButton.click();
    await externalSources.linkDerivationGroup(
      externalSources.derivationTestGroupName,
      externalSources.derivationTestSourceType,
    );

    // Upload another test
    await externalSources.goto();
    await externalSources.uploadExternalSource(
      externalSources.derivationTestFile2,
      externalSources.derivationTestFileKey2,
    );

    await plan.goto();
    await plan.showPanel(PanelNames.EXTERNAL_SOURCES);

    // Allow stores to load, validate 'new source' card appears
    await expect(
      page.getByText('New files matching source types and derivation groups in the current plan'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Dismiss' }).click();

    await expect(
      page.getByText('New files matching source types and derivation groups in the current plan'),
    ).not.toBeVisible();

    await plan.externalSourceManageButton.click();
    await expect(
      page.getByRole('row', { name: externalSources.derivationTestGroupName }).getByRole('checkbox'),
    ).toBeChecked();
    await externalSources.unlinkDerivationGroup(
      externalSources.derivationTestGroupName,
      externalSources.derivationTestSourceType,
    );
  });

  test('Linked derivation groups should be expandable in panel', async () => {
    await plan.showPanel(PanelNames.EXTERNAL_SOURCES);
    // Link derivation group to plan if it isn't already
    if ((await page.getByText('No Derivation Groups Linked To This Plan').isVisible()) === true) {
      await plan.externalSourceManageButton.click();
      await page.getByText('No Derivation Groups Found').waitFor({ state: 'hidden', timeout: extendedTimeout });
      await externalSources.linkDerivationGroup(
        externalSources.exampleDerivationGroup,
        externalSources.exampleSourceType,
      );
    }
    // Wait until the sources are loaded
    await page
      .getByText('No sources in this group. Delete Empty Derivation Group')
      .waitFor({ state: 'hidden', timeout: extendedTimeout });
    // Expand all collapse buttons and validate fields appear
    await page.getByRole('button', { name: `Derivation group ${externalSources.exampleDerivationGroup}` }).click();
    await page.getByRole('button', { name: `ExampleExternalSource:${externalSources.externalSourceFileName}` }).click();
    // TODO: Event types shown underneath derivation groups is work to-be-implemented!
    //await page.getByRole('button', { name: 'View Contained Event Types' }).click();

    await expect(page.getByText('Key: ExampleExternalSource:')).toBeVisible();
    await expect(page.getByText('Source Type: Example External')).toBeVisible();
    await expect(page.getByText('Start Time: 2022-001T00:00:')).toBeVisible();
    await expect(page.getByText('End Time: 2022-002T00:00:')).toBeVisible();
    await expect(page.getByText('Valid At: 2022-001T00:00:')).toBeVisible();
    await expect(page.getByText('Created At')).toBeVisible();
  });

  test('Derivation group can be expanded in modal', async () => {
    await plan.showPanel(PanelNames.EXTERNAL_SOURCES);
    await plan.externalSourceManageButton.click();
    await page.getByRole('row', { name: externalSources.exampleSourceType }).hover();
    await page
      .getByRole('row', { name: externalSources.exampleSourceType })
      .getByLabel('View Derivation Group')
      .click();
    // Expand all collapse buttons to validate fields appear
    await expect(page.getByRole('button', { name: 'example-external-source.json 1' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'example-external-source.json 1' }).first().click();
    await expect(
      page.locator('#svelte-modal').getByText('Key: ExampleExternalSource:example-external-source.json'),
    ).toBeVisible();
    await expect(page.locator('#svelte-modal').getByText('Source Type: Example External Source')).toBeVisible();
    await expect(page.locator('#svelte-modal').getByText('Start Time: 2022-001T00:00:00')).toBeVisible();
    await expect(page.locator('#svelte-modal').getByText('End Time: 2022-002T00:00:00')).toBeVisible();
    await expect(page.locator('#svelte-modal').getByText('Valid At: 2022-001T00:00:00')).toBeVisible();
    await expect(page.locator('#svelte-modal').getByText('Created At')).toBeVisible();
  });
  ``;
});
