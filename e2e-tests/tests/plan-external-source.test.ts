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
import { anyCanvasHasContent } from '../utilities/canvas.js';
import {
  buildExternalSourceFixture,
  cleanupExternalSourceFixtures,
  EXAMPLE_SCHEMA_FILE,
  EXAMPLE_SOURCE_FILE,
  seedExternalSourceFixture,
  type ExternalSourceFixture,
} from '../utilities/external-sources.js';

// Main setup with model/plan (uses 'test' user for API operations)
let setup: FullSetupResult;
let externalSources: ExternalSources;

// This execution's own source/event types, derivation group and source (see external-sources.ts).
let example: ExternalSourceFixture;

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
  planForUserA = new Plan(
    setupA.page,
    setup.plans,
    setup.constraints,
    setup.schedulingGoals,
    setup.schedulingConditions,
  );
  planForUserB = new Plan(
    setupB.page,
    setup.plans,
    setup.constraints,
    setup.schedulingGoals,
    setup.schedulingConditions,
  );

  // Prerequisite data goes in through the API; the tests below exercise the plan UI on top of it.
  example = buildExternalSourceFixture(EXAMPLE_SOURCE_FILE, EXAMPLE_SCHEMA_FILE);
  await seedExternalSourceFixture(setup.api, example);
});

test.afterAll(async () => {
  // Clean up plan and model first
  await cleanupApiResources(setup);

  try {
    await cleanupExternalSourceFixtures(setup.api, [example]);
  } finally {
    await closeBrowserResources(setup);

    // Close additional user browser contexts
    await teardownTest(setupA);
    await teardownTest(setupB);
  }
});

test.beforeEach(async () => {
  await setup.plan.goto(); // Refresh page to reset the view
});

test.describe.serial('Plan External Sources', () => {
  test('Derivation groups can be linked/unlinked to a plan', async () => {
    await setup.plan.showPanel(PanelNames.EXTERNAL_SOURCES);
    await setup.plan.externalSourceManageButton.click();
    await setup.page.getByText('No Derivation Groups Found').waitFor({ state: 'hidden' });
    await externalSources.linkDerivationGroup(example.derivationGroup, example.sourceType);

    await setup.plan.externalSourceManageButton.click();
    await setup.page.getByText('No Derivation Groups Found').waitFor({ state: 'hidden' });
    await externalSources.unlinkDerivationGroup(example.derivationGroup, example.sourceType);

    // Re-link to determine if unlinking broke things
    await setup.plan.externalSourceManageButton.click();
    await setup.page.getByText('No Derivation Groups Found').waitFor({ state: 'hidden' });
    await externalSources.linkDerivationGroup(example.derivationGroup, example.sourceType);
  });
});

test.describe.serial('Plan External Sources (linked)', () => {
  // Linking is a prerequisite here, not the behavior under test, so it goes through the API.
  test.beforeAll(async () => {
    await setup.api.createPlanDerivationGroup(setup.planId, example.derivationGroup);
  });

  test('External event types can be added to the timeline', async () => {
    // Use userA's separate browser context - no login/logout needed!
    await planForUserA.goto();
    await planForUserA.showPanel(PanelNames.TIMELINE_ITEMS);
    await setupA.page.getByRole('tab', { exact: true, name: 'Events' }).click();
    await expect(setupA.page.locator('.list-item').getByText(example.eventTypes[0])).toBeVisible();
    await setupA.page.locator('.list-item').getByText(example.eventTypes[0]).first().hover();
    await setupA.page.getByLabel(`FilterExternalevent-${example.eventTypes[0]}`).click();
    await setupA.page.getByRole('menuitem', { name: 'New Row +' }).click();
    await expect(setupA.page.locator('#timeline-0').getByRole('button', { name: example.eventTypes[0] })).toBeVisible();

    // Use userB's separate browser context - no login/logout needed!
    // Assert the timeline row does NOT exist for userB (user-specific settings)
    await planForUserB.goto();
    await expect(
      setupB.page.locator('#timeline-0').getByRole('button', { name: example.eventTypes[0] }),
    ).not.toBeVisible();
  });

  test('Zero-duration events are properly drawn in the timeline', async () => {
    await expect
      .poll(() => anyCanvasHasContent(setup.page, '[data-component-name="TimelinePanel"] canvas'), { timeout: 10000 })
      .toBe(true);
  });

  test('Linked derivation groups should be expandable in panel', async () => {
    await setup.plan.showPanel(PanelNames.EXTERNAL_SOURCES);
    // Wait until the sources are loaded
    await setup.page
      .getByText('No sources in this group. Delete Empty Derivation Group')
      .waitFor({ state: 'hidden', timeout: extendedTimeout });
    // Expand all collapse buttons and validate fields appear
    await setup.page.getByRole('button', { name: `Derivation group ${example.derivationGroup}` }).click();
    await setup.page.getByRole('button', { name: example.sourceKey }).click();
    // TODO: Event types shown underneath derivation groups is work to-be-implemented!
    //await setup.page.getByRole('button', { name: 'View Contained Event Types' }).click();

    await expect(setup.page.getByText(`Key: ${example.sourceKey}`)).toBeVisible();
    await expect(setup.page.getByText(`Source Type: ${example.sourceType}`)).toBeVisible();
    await expect(setup.page.getByText('Start Time: 2022-001T00:00:00')).toBeVisible();
    await expect(setup.page.getByText('End Time: 2022-002T00:00:00')).toBeVisible();
    await expect(setup.page.getByText('Valid At: 2022-001T00:00:00')).toBeVisible();
    await expect(setup.page.getByText('Created At')).toBeVisible();
  });

  test('Derivation group can be expanded in modal', async () => {
    await setup.plan.showPanel(PanelNames.EXTERNAL_SOURCES);
    await setup.plan.externalSourceManageButton.click();
    await setup.page.getByRole('row', { name: example.derivationGroup }).hover();
    await setup.page.getByRole('row', { name: example.derivationGroup }).getByLabel('View Derivation Group').click();
    // Expand all collapse buttons to validate fields appear
    await expect(setup.page.getByRole('button', { name: `${example.sourceKey} 1` }).first()).toBeVisible();
    await setup.page
      .getByRole('button', { name: `${example.sourceKey} 1` })
      .first()
      .click();
    await expect(setup.page.locator('#svelte-modal').getByText(`Key: ${example.sourceKey}`)).toBeVisible();
    await expect(setup.page.locator('#svelte-modal').getByText(`Source Type: ${example.sourceType}`)).toBeVisible();
    await expect(setup.page.locator('#svelte-modal').getByText('Start Time: 2022-001T00:00:00')).toBeVisible();
    await expect(setup.page.locator('#svelte-modal').getByText('End Time: 2022-002T00:00:00')).toBeVisible();
    await expect(setup.page.locator('#svelte-modal').getByText('Valid At: 2022-001T00:00:00')).toBeVisible();
    await expect(setup.page.locator('#svelte-modal').getByText('Created At')).toBeVisible();
  });
});
