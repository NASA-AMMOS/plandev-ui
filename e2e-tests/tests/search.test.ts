import test, { expect } from '@playwright/test';
import { Search } from '../fixtures/Search.js';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;
let search: Search;

// We run `addActivity` via the API so the search has known data without depending on
// the timeline drag UI, and we filter every assertion by the unique plan name so other
// tests sharing the same backend can't pollute the result set.
const ACTIVITY_NAMES = {
  bake: 'searchTest_BakeBananaBread',
  grow1: 'searchTest_GrowBanana_alpha',
  grow2: 'searchTest_GrowBanana_beta',
  pick: 'searchTest_PickBanana',
};

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);

  await setup.api.createActivityDirective({
    anchor_id: null,
    anchored_to_start: true,
    arguments: { quantity: 5 },
    metadata: {},
    name: ACTIVITY_NAMES.grow1,
    plan_id: setup.planId,
    start_offset: '01:00:00',
    type: 'GrowBanana',
  });
  await setup.api.createActivityDirective({
    anchor_id: null,
    anchored_to_start: true,
    arguments: { quantity: 7 },
    metadata: {},
    name: ACTIVITY_NAMES.grow2,
    plan_id: setup.planId,
    start_offset: '02:00:00',
    type: 'GrowBanana',
  });
  await setup.api.createActivityDirective({
    anchor_id: null,
    anchored_to_start: true,
    arguments: { quantity: 1 },
    metadata: {},
    name: ACTIVITY_NAMES.pick,
    plan_id: setup.planId,
    start_offset: '03:00:00',
    type: 'PickBanana',
  });
  await setup.api.createActivityDirective({
    anchor_id: null,
    anchored_to_start: true,
    arguments: { tbButter: 2, tbSugar: 1, temperature: 350 },
    metadata: {},
    name: ACTIVITY_NAMES.bake,
    plan_id: setup.planId,
    start_offset: '04:00:00',
    type: 'BakeBananaBread',
  });

  search = new Search(setup.page);
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Activity Search', () => {
  test('Should render the search page with empty results state', async () => {
    await search.goto();
    await expect(search.searchButton).toBeVisible();
    await expect(search.clearFiltersButton).toBeVisible();
    await expect(search.panelHeader).toBeVisible();
    await expect(search.noResultsOverlay).toBeVisible();
  });

  test('Should return all 4 activities for the test plan when filtering by plan name', async () => {
    await search.goto();
    await search.planNameInput.fill(setup.planName);
    await search.submitAndWait();

    await expect(search.resultsCountLabel).toContainText('of 4');
    await expect(search.resultsRows).toHaveCount(4);
    for (const name of Object.values(ACTIVITY_NAMES)) {
      await expect(search.resultsGrid.getByText(name, { exact: true })).toBeVisible();
    }
  });

  test('Should filter by activity name substring', async () => {
    await search.goto();
    await search.planNameInput.fill(setup.planName);
    await search.activityNameInput.fill('GrowBanana');
    await search.submitAndWait();

    await expect(search.resultsRows).toHaveCount(2);
    await expect(search.resultsGrid.getByText(ACTIVITY_NAMES.grow1, { exact: true })).toBeVisible();
    await expect(search.resultsGrid.getByText(ACTIVITY_NAMES.grow2, { exact: true })).toBeVisible();
  });

  test('Should filter by argument value (numeric)', async () => {
    await search.goto();
    await search.planNameInput.fill(setup.planName);
    await search.argumentValueInput.fill('7');
    await search.submitAndWait();

    await expect(search.resultsRows).toHaveCount(1);
    await expect(search.resultsGrid.getByText(ACTIVITY_NAMES.grow2, { exact: true })).toBeVisible();
  });

  test('Should filter by start_offset range', async () => {
    await search.goto();
    await search.planNameInput.fill(setup.planName);
    await search.startOffsetMinInput.fill('02:00:00');
    await search.startOffsetMaxInput.fill('03:00:00');
    await search.submitAndWait();

    await expect(search.resultsRows).toHaveCount(2);
    await expect(search.resultsGrid.getByText(ACTIVITY_NAMES.grow2, { exact: true })).toBeVisible();
    await expect(search.resultsGrid.getByText(ACTIVITY_NAMES.pick, { exact: true })).toBeVisible();
  });

  test('Should not show pagination controls when total results fit in one page', async () => {
    await search.goto();
    await search.planNameInput.fill(setup.planName);
    await search.submitAndWait();

    await expect(search.paginationFirstButton).toBeHidden();
    await expect(search.paginationNextButton).toBeHidden();
  });

  test('Should clear all filters and reset results', async () => {
    await search.goto();
    await search.planNameInput.fill(setup.planName);
    await search.activityNameInput.fill('GrowBanana');
    await search.submitAndWait();
    await expect(search.resultsRows).toHaveCount(2);

    await search.clearFilters();

    await expect(search.planNameInput).toHaveValue('');
    await expect(search.activityNameInput).toHaveValue('');
    await expect(search.noResultsOverlay).toBeVisible();
    // `goto($page.url.pathname, ...)` is async — wait for the URL to drop its query.
    await expect(search.page).toHaveURL(/\/search$/);
  });

  test('Should reflect form state in the URL after a search', async () => {
    await search.goto();
    await search.planNameInput.fill(setup.planName);
    await search.activityNameInput.fill('GrowBanana');
    await search.submitAndWait();

    const url = new URL(search.page.url());
    expect(url.searchParams.get('planName')).toEqual(setup.planName);
    expect(url.searchParams.get('actName')).toEqual('GrowBanana');
  });

  test('Should populate the form and run a search when navigating with deep-link params', async () => {
    await search.gotoWithParams({
      actName: 'GrowBanana',
      planName: setup.planName,
    });
    // The deep-link path auto-runs a search on mount; wait for it to complete.
    await expect(search.resultsPanel).toHaveAttribute('data-search-run-id', /^[1-9]\d*$/);

    await expect(search.planNameInput).toHaveValue(setup.planName);
    await expect(search.activityNameInput).toHaveValue('GrowBanana');
    await expect(search.resultsRows).toHaveCount(2);
  });

  test('Should open the activity in a new tab when the per-row "Open in plan" button is clicked', async () => {
    await search.goto();
    await search.planNameInput.fill(setup.planName);
    await search.activityNameInput.fill(ACTIVITY_NAMES.pick);
    await search.submitAndWait();
    await expect(search.resultsRows).toHaveCount(1);

    const [popup] = await Promise.all([
      search.page.waitForEvent('popup'),
      search.clickOpenInPlanForRow(ACTIVITY_NAMES.pick),
    ]);

    await popup.waitForLoadState('domcontentloaded');
    expect(popup.url()).toContain(`/plans/${setup.planId}`);
    expect(popup.url()).toContain('activityId=');
    await popup.close();
  });

  test('Should render Model, Model ID, and Absolute Start Time columns by default', async () => {
    await search.goto();
    await search.planNameInput.fill(setup.planName);
    await search.submitAndWait();

    await expect(search.columnHeader('Model')).toBeVisible();
    await expect(search.columnHeader('Model ID')).toBeVisible();
    await expect(search.columnHeader('Absolute Start Time')).toBeVisible();
  });

  test('Should filter by union of activity types via deep-link multi-select', async () => {
    // Multi-type filter is array-valued and serialized comma-joined into the URL.
    // Use the deep-link path to exercise the _in clause without driving the multi-select dropdown UI.
    await search.gotoWithParams({
      actType: 'GrowBanana,PickBanana',
      planName: setup.planName,
    });
    await expect(search.resultsPanel).toHaveAttribute('data-search-run-id', /^[1-9]\d*$/);

    await expect(search.resultsRows).toHaveCount(3);
    await expect(search.resultsGrid.getByText(ACTIVITY_NAMES.grow1, { exact: true })).toBeVisible();
    await expect(search.resultsGrid.getByText(ACTIVITY_NAMES.grow2, { exact: true })).toBeVisible();
    await expect(search.resultsGrid.getByText(ACTIVITY_NAMES.pick, { exact: true })).toBeVisible();
    await expect(search.resultsGrid.getByText(ACTIVITY_NAMES.bake, { exact: true })).toBeHidden();
  });

  test('Should filter by argument value when typed as a JSON array (subset containment)', async () => {
    await search.goto();
    await search.planNameInput.fill(setup.planName);
    await search.argumentValueInput.fill('[5]');
    await search.submitAndWait();

    // Type `[5]` would match an arg whose value is a superset like `[1, 2, 5]`.
    // No activity in this test plan has an array-valued arg, so this should
    // return zero rows — the assertion is that the query doesn't error.
    await expect(search.noResultsOverlay).toBeVisible();
  });
});
