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

    const existingLayerCount = await page.locator('.timeline-layer').count();

    // Give the row a name
    await page.locator('input[name="name"]').first().fill(rowName);
    await page.locator('input[name="name"]').first().blur();

    // Add a layer
    await page.getByRole('button', { name: 'New Layer' }).click();
    const newLayerCount = await page.locator('.timeline-layer').count();
    expect(newLayerCount - existingLayerCount).toEqual(1);

    // Expect an activity layer to be created by default
    expect(await page.locator('select[name="chartType"]').last().inputValue()).toBe('activity');

    // Expect the filter list to open
    await page.getByPlaceholder('Search').last().click();
    await expect(page.locator('.menu-slot > .header')).toBeDefined();

    // Add all activities
    await page.locator('button', { hasText: /Select [0-9]* activit/ }).click();

    // Expect to not see an activity tree group in this row
    expect(await page.locator('.timeline-row-wrapper', { hasText: rowName }).locator('.activity-tree').count()).toBe(0);

    // Switch to grouped display mode
    await page.locator('button', { hasText: 'Grouped' }).click();

    // Expect to see an activity tree group for this activity in this row
    expect(
      await page
        .locator('.timeline-row-wrapper', { hasText: rowName })
        .locator('.collapse', { hasText: 'PickBanana' })
        .count(),
    ).toBe(1);

    // Delete an activity layer
    await page.getByRole('button', { name: 'Layer Settings' }).last().click();
    await page.getByText('Delete Layer').click();
    const finalLayerCount = await page.locator('.timeline-layer').count();
    expect(finalLayerCount - newLayerCount).toEqual(-1);
  });
});
