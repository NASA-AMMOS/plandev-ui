import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';

let constraints: Constraints;
let context: BrowserContext;
let models: Models;
let page: Page;
let plan: Plan;
let plans: Plans;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;

test.beforeAll(async ({ baseURL, browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  plans = new Plans(page, models);
  constraints = new Constraints(page);
  schedulingConditions = new SchedulingConditions(page);
  schedulingGoals = new SchedulingGoals(page);
  plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);

  await models.goto();
  await models.createModel(baseURL);
  await plans.goto();
  await plans.createPlan();
  await plan.goto();
});

test.afterAll(async () => {
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await page.close();
  await context.close();
});

test.describe.serial('Timeline View Editing', () => {
  const newActivityStartTime: string = '2022-005T00:00:00.000';
  const rowName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

  test('Add an activity to the parent plan', async () => {
    await plan.showPanel(PanelNames.TIMELINE_ITEMS);
    await plan.addActivity('PickBanana');
    await plan.addActivity('PeelBanana');
  });

  test('Change the start time of the activity', async () => {
    await page.getByRole('gridcell', { name: 'PickBanana' }).first().click();
    await plan.showPanel(PanelNames.SELECTED_ACTIVITY);
    await page.locator('input[name="start-time"]').first().click();
    await page.locator('input[name="start-time"]').first().fill(newActivityStartTime);
    await page.locator('input[name="start-time"]').first().press('Enter');
  });

  test('Add a vertical guide', async () => {
    await plan.showPanel(PanelNames.TIMELINE_EDITOR);
    const existingGuideCount = await page.locator('.guide').count();
    await page.getByRole('button', { name: 'New Vertical Guide' }).click();
    const newGuideCount = await page.locator('.guide').count();
    expect(newGuideCount - existingGuideCount).toEqual(1);
  });

  test('Remove a vertical guide', async () => {
    const existingGuideCount = await page.locator('.guide').count();
    await page.getByRole('button', { name: 'Delete Guide' }).last().click();
    const newGuideCount = await page.locator('.guide').count();
    expect(newGuideCount - existingGuideCount).toEqual(-1);
  });

  test('Add a row', async () => {
    const existingRowCount = await page.locator('.timeline-row').count();
    await page.getByRole('button', { exact: true, name: 'New Row' }).click();
    const newRowCount = await page.locator('.timeline-row').count();
    expect(newRowCount - existingRowCount).toEqual(1);
  });

  test('Delete a row', async () => {
    const existingRowCount = await page.locator('.timeline-row').count();

    // Click on delete button of last row
    await page.locator('.timeline-row').last().locator("button[aria-label='Delete Row']").click();

    // Confirm deletion of row in modal
    await page.locator('#svelte-modal').getByRole('button', { name: 'Delete' }).click();

    const newRowCount = await page.locator('.timeline-row').count();
    expect(newRowCount - existingRowCount).toEqual(-1);
  });

  test('Edit a row', async () => {
    // Create a new row
    await page.getByRole('button', { exact: true, name: 'New Row' }).click();

    // Click on edit button of last row
    await page.locator('.timeline-row').last().locator("button[aria-label='Edit Row']").click();

    // Look for back button indicating that the row editor is active
    expect(page.locator('.section-back-button ').first()).toBeDefined();

    // Give the row a name
    await page.locator('input[name="name"]').first().fill(rowName);
    await page.locator('input[name="name"]').first().blur();
  });

  test('Add an activity layer', async () => {
    const activityLayerEditor = page.getByLabel('Activity Layer-editor');
    const existingLayerCount = await activityLayerEditor.locator('.timeline-layer-editor').count();

    // Add an activity layer
    await activityLayerEditor.getByRole('button', { name: 'New Activity Layer' }).click();
    const newLayerCount = await activityLayerEditor.locator('.timeline-layer-editor').count();
    expect(newLayerCount - existingLayerCount).toEqual(1);

    // Expect the activity layer to include all activities
    expect(await activityLayerEditor.locator('.timeline-layer-editor').first()).toHaveText('Activity Layer');
  });

  test('Edit an activity layer', async () => {
    const activityLayerEditor = page.getByLabel('Activity Layer-editor');

    // Open the activity filter builder
    await activityLayerEditor
      .locator('.timeline-layer-editor')
      .first()
      .getByLabel('Toggle activity filter builder modal')
      .click();

    // Expect that the modal is present
    const modal = activityLayerEditor.getByRole('dialog');
    expect(modal).toBeDefined();

    // Expect that layer name is showing in the name input
    expect(modal.locator('input[name="layer-name"]')).toHaveValue('Activity Layer');

    // Expect that the resulting types list is not empty
    const resultingTypesList = modal.locator('.resulting-types-list');
    const allActivityTypesCount = await resultingTypesList.locator('.activity-type-result').count();
    expect(allActivityTypesCount).toBeGreaterThan(0);

    // Expect that manually selecting types cause the types to appear in the resulting types list
    await modal.locator("input[name='manual-types-filter-input']").click();
    expect(await modal.locator('.manual-types-menu').first()).toBeDefined();
    await modal.getByRole('menuitem', { name: 'ChangeProducer' }).click();
    await modal.getByRole('menuitem', { name: 'ControllableDurationActivity' }).click();
    await page.keyboard.press('Escape');

    expect(await resultingTypesList.getByText('ChangeProducer')).toBeDefined();
    expect(await resultingTypesList.getByText('ControllableDurationActivity')).toBeDefined();

    // Expect that dynamic types can be added
    await modal.getByLabel('dynamic-types').getByRole('button', { name: 'Add Filter' }).click();
    expect(await modal.getByLabel('dynamic-types').getByRole('listitem').count()).toBe(1);
    await modal.getByLabel('dynamic-types').getByRole('listitem').locator("input[name='filter-value']").fill('banana');
    expect(await resultingTypesList.locator('.activity-type-result').count()).toEqual(11);

    // Expect that other filters can be added
    await modal.getByLabel('other-filters').getByRole('button', { name: 'Add Filter' }).click();
    expect(await modal.getByLabel('other-filters').getByRole('listitem').count()).toBe(1);
    // Select parameter field
    await modal.getByLabel('other-filters').locator("select[aria-label='field']").selectOption('Parameter');
    // Select specific parameter
    await modal.getByLabel('other-filters').getByText('Select Parameter').click();
    await modal.getByLabel('other-filters').getByText('quantity (int)').click();
    // Select operator
    await modal.getByLabel('other-filters').locator("select[aria-label='operator']").selectOption('equals');
    // Fill filter value input
    await modal.getByLabel('other-filters').getByRole('listitem').locator("input[name='filter-value']").fill('10');
    // Ensure that only one instance (PickBanana) is listed
    expect(await modal.getByText('1 instance')).toBeDefined();

    // Expect that type subfilters can be added
    const activityResult = resultingTypesList.getByRole('listitem', { name: 'activity-type-result-PickBanana' });
    await activityResult.getByRole('button', { name: 'Add Filter' }).click();
    expect(await activityResult.getByRole('listitem').count()).toBe(1);
    // Select name field
    await activityResult.locator("select[aria-label='field']").selectOption('Name');
    // Select operator
    await activityResult.locator("select[aria-label='operator']").selectOption('includes');
    // Fill filter value input
    await activityResult.getByRole('listitem').locator("input[name='filter-value']").fill('foo');
    // Ensure that only one instance (PickBanana) is listed
    expect(await modal.getByText('0 instances')).toBeDefined();

    // Expect that type subfilters can be removed
    await activityResult.getByRole('button', { name: 'Remove filter' }).click();
    expect(await modal.getByText('1 instance')).toBeDefined();

    // Expect that other filters can be removed
    await modal.getByLabel('other-filters').getByRole('button', { name: 'Remove filter' }).click();
    expect(await modal.getByText('2 instances')).toBeDefined();

    // Expect that dynamic types can be removed
    await modal.getByLabel('dynamic-types').getByRole('button', { name: 'Remove filter' }).click();
    expect(await resultingTypesList.locator('.activity-type-result').count()).toEqual(2);

    // Expect that manual types can be cleared
    await modal.locator("input[name='manual-types-filter-input']").click();
    await modal.getByRole('menuitem', { name: 'ChangeProducer' }).click();
    await page.keyboard.press('Escape');
    await modal.getByRole('button', { name: 'Remove Types' }).click();
    expect(await resultingTypesList.locator('.activity-type-result').count()).toEqual(allActivityTypesCount);

    // Give the layer a new name
    await modal.locator('input[name="layer-name"]').fill('Foo');

    // Close the modal
    await modal.getByRole('button', { name: 'close' }).click();

    // Expect name to match given name
    expect(await activityLayerEditor.locator('.timeline-layer-editor').first()).toHaveText('Foo');
  });

  test('Change activity layer settings', async () => {
    const activityLayerEditor = await page.getByLabel('Activity Layer-editor');

    // Expect to not see an activity tree group in this row
    expect(await page.locator('.timeline-row-wrapper', { hasText: rowName }).locator('.activity-tree').count()).toBe(0);

    // Switch to grouped display mode
    await page.locator('button', { hasText: 'Grouped' }).click();

    // Expect to see an activity tree group for this activity in this row
    expect(
      await page
        .locator('.timeline-row-wrapper', { hasText: rowName })
        .locator('.collapse-root', { hasText: 'PickBanana' })
        .count(),
    ).toBe(1);

    // Delete an activity layer
    await activityLayerEditor.locator('.timeline-layer-editor').first().getByRole('button', { name: 'Delete' }).click();
    expect(await activityLayerEditor.locator('.timeline-layer-editor').count()).toBe(0);
  });

  test('Add a resource layer', async () => {
    const resourceLayerEditor = await page.getByLabel('Resource Layer-editor');
    const yAxisEditor = await page.getByLabel('Y Axis-editor');
    const existingLayerCount = await resourceLayerEditor.locator('.timeline-layer-editor').count();
    const existingYAxesCount = await yAxisEditor.locator('.timeline-y-axis').count();

    // Expect no y-axis label to exist for the row in the timeline
    expect(
      await page.locator('.timeline-row-wrapper', { hasText: rowName }).locator('.row-header-y-axis-label').count(),
    ).toBe(0);

    // Add a resource layer
    await resourceLayerEditor.getByRole('button', { name: 'New Resource Layer' }).click();
    const newLayerCount = await resourceLayerEditor.locator('.timeline-layer-editor').count();
    expect(newLayerCount - existingLayerCount).toEqual(1);

    // Expect a y-axis to have been automatically created
    const newYAxisCount = await yAxisEditor.locator('.timeline-y-axis').count();
    expect(newYAxisCount - existingYAxesCount).toEqual(1);

    // Select a resource
    await resourceLayerEditor.getByRole('combobox').click();
    await resourceLayerEditor.getByRole('menuitem', { name: '/peel' }).waitFor({ state: 'attached' });
    await resourceLayerEditor.getByRole('menuitem', { name: '/peel' }).click();
    await resourceLayerEditor.getByRole('menuitem', { name: '/peel' }).waitFor({ state: 'detached' });

    // Run simulation
    await plan.showPanel(PanelNames.SIMULATION, true);
    await plan.runSimulation();

    // Expect the resource to have a y-axis label in the timline
    await page
      .locator('.timeline-row-wrapper', { hasText: rowName })
      .locator('.row-header-y-axis-label')
      .waitFor({ state: 'attached' });
    expect(
      await page.locator('.timeline-row-wrapper', { hasText: rowName }).locator('.row-header-y-axis-label').count(),
    ).toBe(1);

    // Duplicate a resource layer
    await resourceLayerEditor
      .locator('.timeline-layer-editor')
      .first()
      .getByRole('button', { name: 'Duplicate' })
      .click();
    expect(await resourceLayerEditor.locator('.timeline-layer-editor').count()).toBe(2);

    // Delete a resource layer
    await resourceLayerEditor.locator('.timeline-layer-editor').first().getByRole('button', { name: 'Delete' }).click();
    expect(await resourceLayerEditor.locator('.timeline-layer-editor').count()).toBe(1);
  });

  test('Open and close the row header context menu', async () => {
    const rowHeaderMenuButton = await page
      .getByRole('banner')
      .filter({ hasText: 'Activities by Type' })
      .getByLabel('Row Settings');
    await rowHeaderMenuButton.click();
    expect(await page.getByRole('menu', { name: 'Context Menu' })).toBeVisible();
    await page.getByRole('listitem').filter({ hasText: 'Activities by Type' }).click();
    expect(await page.getByRole('menu', { name: 'Context Menu' })).not.toBeVisible();
  });
});
